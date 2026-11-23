import { randomUUID } from 'node:crypto';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { ZodError, z } from 'zod';
import {
  cvWorkspaceFolder, cvWorkspaceStorageRoot, cvWorkspaceInputSchema,
  auditArtifactSchema, auditDocumentNames, sha256Bytes,
  tokenUsageSchema, summarizeTokenUsage, tokenCost,
  type TokenUsage,
} from './cv-audit';
import { canTransitionCvStage, cvWorkflowStageSchema, gapFeedbackSchema } from './cv-workflow';

const settings = { region: 'europe-west1' as const, maxInstances: 3, memory: '256MiB' as const };
const identifier = z.string().uuid();
const lookupInput = z.object({ workspaceId: identifier }).strict();
const gapInput = lookupInput.extend({
  feedbackId: identifier,
  expectedStageVersion: z.number().int().min(0),
  feedback: gapFeedbackSchema,
}).strict();
const revisionInput = lookupInput.extend({
  revisionRequestId: identifier,
  expectedStageVersion: z.number().int().min(0),
  comment: z.string().trim().min(1).max(4000),
}).strict();
const MAX_AUDIT_BYTES = 20_000_000;

function uidFor(request: CallableRequest<unknown>) {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in to access your private application folder.');
  return uid;
}

function validate<T>(schema: { parse(value: unknown): T }, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (reason) {
    if (reason instanceof ZodError) {
      throw new HttpsError('invalid-argument', 'Invalid application request.', {
        fields: reason.issues.map(issue => ({ field: issue.path.join('.'), message: issue.message })),
      });
    }
    throw reason;
  }
}

function collection(uid: string) {
  return getFirestore().collection('users').doc(uid).collection('jobCvWorkspaces');
}

async function existingWorkspace(uid: string, workspaceId: string) {
  const ref = collection(uid).doc(workspaceId);
  const doc = await ref.get();
  if (!doc.exists) throw new HttpsError('not-found', 'Application folder does not exist for this account.');
  return { ref, record: doc.data()! };
}

/**
 * Private server-only immutable artifact writer: clients cannot select a UID,
 * storage path, cost, score or model output. Cloud Storage rules remain deny-all.
 */
export async function writeCvAuditArtifact(
  uid: string,
  workspaceId: string,
  file: {
    category: z.infer<typeof auditArtifactSchema>['category'];
    relativePath: string;
    contentType: z.infer<typeof auditArtifactSchema>['contentType'];
    content: string | Buffer;
    id?: string;
    cvVersionId?: string;
  },
) {
  identifier.parse(workspaceId);
  const { ref, record } = await existingWorkspace(uid, workspaceId);
  const artifactId = file.id ?? randomUUID();
  const bytes = Buffer.isBuffer(file.content) ? file.content : Buffer.from(file.content, 'utf8');
  if (bytes.length > MAX_AUDIT_BYTES) {
    throw new HttpsError('invalid-argument', 'Audit artifact exceeds the private storage size limit.');
  }
  const hash = sha256Bytes(bytes);
  const manifest = auditArtifactSchema.parse({
    id: artifactId, category: file.category, path: file.relativePath,
    sha256: hash, byteLength: bytes.length, contentType: file.contentType,
    ...(file.cvVersionId ? { cvVersionId: file.cvVersionId } : {}),
  });
  const root = cvWorkspaceStorageRoot(uid, record.folderName);
  const storagePath = `${root}/${manifest.path}`;
  const storageObject = getStorage().bucket().file(storagePath);
  try {
    await storageObject.save(bytes, {
      resumable: false,
      preconditionOpts: { ifGenerationMatch: 0 },
      metadata: { contentType: file.contentType, metadata: { sha256: hash } },
    });
  } catch (error) {
    // If a retry collided with the original immutable object, verify its hash.
    const code = (error as { code?: number }).code;
    if (code !== 412) throw error;
    const [metadata] = await storageObject.getMetadata();
    if (metadata.metadata?.sha256 !== hash) {
      throw new HttpsError('already-exists', 'An audit artifact already exists with different content.');
    }
  }
  const entry = ref.collection('artifacts').doc(artifactId);
  try {
    await entry.create({ ...manifest, storagePath, createdAt: FieldValue.serverTimestamp() });
  } catch (error) {
    const code = (error as { code?: number | string }).code;
    if (code !== 6 && code !== 'already-exists') throw error;
    const previous = await entry.get();
    if (previous.data()?.sha256 !== hash || previous.data()?.storagePath !== storagePath) {
      throw new HttpsError('already-exists', 'Audit manifest ID collides with an unrelated file.');
    }
  }
  return { artifactId, storagePath, sha256: hash, byteLength: bytes.length };
}

/**
 * Called by trusted model adapters only, after a real provider response.
 * Persist provider-reported tokens; never fabricate usage or silently assign pricing.
 */
export async function recordCvModelUsage(uid: string, workspaceId: string, eventId: string, raw: TokenUsage) {
  identifier.parse(eventId);
  const usage = tokenUsageSchema.parse(raw);
  const ref = collection(uid).doc(workspaceId).collection('tokenUsage').doc(eventId);
  const snapshot = await ref.get();
  const serialized = JSON.stringify(usage);
  const contentHash = sha256Bytes(serialized);
  if (snapshot.exists) {
    if (snapshot.data()?.sha256 !== contentHash) {
      throw new HttpsError('already-exists', 'Different token usage was already recorded for this event ID.');
    }
    return { eventId, costUsd: snapshot.data()?.estimatedCostUsd ?? null };
  }
  const artifact = await writeCvAuditArtifact(uid, workspaceId, {
    id: eventId,
    category: 'token_usage',
    relativePath: `06-usage/model-${eventId}.json`,
    contentType: 'application/json',
    content: serialized,
  });
  const estimatedCostUsd = tokenCost(usage);
  try {
    await ref.create({
      usage, sha256: contentHash, estimatedCostUsd,
      auditArtifactId: artifact.artifactId, recordedAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    const code = (error as { code?: number | string }).code;
    if (code !== 6 && code !== 'already-exists') throw error;
    const previous = await ref.get();
    if (previous.data()?.sha256 !== contentHash) throw error;
  }
  return { eventId, costUsd: estimatedCostUsd };
}

/** One private folder per company + designation + location + immutable UUID. */
export const createMyCvWorkspace = onCall(settings, async request => {
  const uid = uidFor(request);
  const input = validate(cvWorkspaceInputSchema, request.data);
  const workspaceId = input.clientRequestId;
  const folderName = cvWorkspaceFolder(input.company, input.designation, input.location, workspaceId);
  const originalHash = sha256Bytes(input.originalJd);
  const ref = collection(uid).doc(workspaceId);
  const record = {
    workspaceId, folderName,
    company: input.company, designation: input.designation, location: input.location,
    sourceUrl: input.sourceUrl ?? null, baseCvId: input.baseCvId ?? null,
    originalJdSha256: originalHash,
    stage: 'jd_review',
    stageVersion: 0,
    schemaVersion: 1,
    status: 'initializing',
  };
  const previous = await ref.get();
  if (previous.exists && previous.data()?.originalJdSha256 !== originalHash) {
    throw new HttpsError('already-exists', 'The request ID is already used for a different JD.');
  }
  if (previous.exists && (previous.data()?.folderName !== folderName ||
    previous.data()?.sourceUrl !== (input.sourceUrl ?? null) ||
    previous.data()?.baseCvId !== (input.baseCvId ?? null))) {
    throw new HttpsError('already-exists', 'The request ID already identifies a different application.');
  }

  if (!previous.exists) {
    if (input.baseCvId) {
      const cv = await getFirestore().collection('users').doc(uid)
        .collection('baseCvs').doc(input.baseCvId).get();
      if (!cv.exists || cv.data()?.status !== 'uploaded') {
        throw new HttpsError('failed-precondition', 'The selected base CV is not uploaded to this account.');
      }
    }
    try {
      await ref.create({ ...record, createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp() });
    } catch (error) {
      const code = (error as { code?: string | number }).code;
      if (code !== 6 && code !== 'already-exists') throw error;
      const race = await ref.get();
      if (race.data()?.originalJdSha256 !== originalHash || race.data()?.folderName !== folderName) {
        throw new HttpsError('already-exists', 'Application request ID collision.');
      }
    }
  }

  const original = await writeCvAuditArtifact(uid, workspaceId, {
    id: workspaceId,
    category: 'jd_input',
    relativePath: auditDocumentNames.originalJd,
    contentType: 'application/json',
    content: JSON.stringify({
      company: input.company, designation: input.designation,
      location: input.location, sourceUrl: input.sourceUrl ?? null,
      text: input.originalJd,
    }),
  });
  await ref.update({
    status: 'ready', updatedAt: FieldValue.serverTimestamp(),
    originalJdArtifactId: original.artifactId,
  });
  return { workspaceId, folderName, stage: 'jd_review',
    auditRoot: cvWorkspaceStorageRoot(uid, folderName),
    originalJdSha256: originalHash };
});

export const getMyCvWorkspaceReport = onCall(settings, async request => {
  const uid = uidFor(request);
  const { workspaceId } = validate(lookupInput, request.data);
  const { ref, record } = await existingWorkspace(uid, workspaceId);
  const [artifacts, tokenEntries, scoreEntries] = await Promise.all([
    ref.collection('artifacts').orderBy('createdAt', 'desc').limit(250).get(),
    ref.collection('tokenUsage').orderBy('recordedAt', 'desc').limit(250).get(),
    ref.collection('scoreSnapshots').orderBy('createdAt', 'desc').limit(100).get(),
  ]);
  const usage = tokenEntries.docs.map(doc => tokenUsageSchema.parse(doc.data().usage));
  return {
    workspaceId,
    folderName: record.folderName,
    company: record.company, designation: record.designation, location: record.location,
    stage: record.stage, stageVersion: record.stageVersion,
    status: record.status,
    preCvScore: scoreEntries.docs.map(doc => doc.data()).find(item => item.timing === 'pre_cv') ?? null,
    postCvScores: scoreEntries.docs.map(doc => doc.data()).filter(item => item.timing === 'post_cv'),
    gaps: record.gapSummary ?? [],
    tokenCounter: summarizeTokenUsage(usage),
    tokenUsageEvents: tokenEntries.docs.map(doc => ({
      id: doc.id, stage: doc.data().usage.stage, model: doc.data().usage.model,
      provider: doc.data().usage.provider, inputTokens: doc.data().usage.inputTokens,
      outputTokens: doc.data().usage.outputTokens, totalTokens: doc.data().usage.totalTokens,
      estimatedCostUsd: doc.data().estimatedCostUsd ?? null,
    })),
    artifacts: artifacts.docs.map(doc => ({
      id: doc.id, category: doc.data().category,
      relativePath: doc.data().path, sha256: doc.data().sha256,
      byteLength: doc.data().byteLength, cvVersionId: doc.data().cvVersionId ?? null,
    })),
    truncated: {
      artifacts: artifacts.size === 250, tokenUsageEvents: tokenEntries.size === 250,
      scoreSnapshots: scoreEntries.size === 100,
    },
  };
});

/** User's feedback is stored privately in the named folder, never only in an ephemeral prompt. */
export const submitMyCvGapFeedback = onCall(settings, async request => {
  const uid = uidFor(request);
  const input = validate(gapInput, request.data);
  const { ref, record } = await existingWorkspace(uid, input.workspaceId);
  const prior = await ref.collection('feedback').doc(input.feedbackId).get();
  if (prior.exists) return { stage: prior.data()?.nextStage, feedbackId: input.feedbackId };
  if (record.stage !== 'awaiting_user_feedback' ||
    record.stageVersion !== input.expectedStageVersion) {
    throw new HttpsError('failed-precondition', 'The gap review changed; refresh before submitting feedback.');
  }
  const nextStage = input.feedback.userRequestedChanges ? 'gap_review' : 'cv_draft';
  const artifact = await writeCvAuditArtifact(uid, input.workspaceId, {
    id: input.feedbackId, category: 'user_feedback',
    relativePath: `03-gaps/feedback-${input.feedbackId}.json`,
    contentType: 'application/json', content: JSON.stringify(input.feedback),
  });
  await getFirestore().runTransaction(async tx => {
    const snapshot = await tx.get(ref);
    if (snapshot.data()?.stage !== 'awaiting_user_feedback' ||
      snapshot.data()?.stageVersion !== input.expectedStageVersion) {
      throw new HttpsError('failed-precondition', 'Gap review changed while submitting.');
    }
    if (!canTransitionCvStage(snapshot.data()!.stage, nextStage)) throw new Error('Invalid stage transition');
    tx.create(ref.collection('feedback').doc(input.feedbackId), {
      auditArtifactId: artifact.artifactId, nextStage,
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.update(ref, {
      stage: nextStage, stageVersion: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  return { stage: nextStage, feedbackId: input.feedbackId };
});

export const requestMyCvRevision = onCall(settings, async request => {
  const uid = uidFor(request);
  const input = validate(revisionInput, request.data);
  const { ref, record } = await existingWorkspace(uid, input.workspaceId);
  const previous = await ref.collection('revisionRequests').doc(input.revisionRequestId).get();
  if (previous.exists) return { stage: 'revision_requested', revisionRequestId: input.revisionRequestId };
  if (record.stageVersion !== input.expectedStageVersion ||
    !canTransitionCvStage(record.stage, 'revision_requested')) {
    throw new HttpsError('failed-precondition', 'This CV is not in a state that accepts revisions.');
  }
  const artifact = await writeCvAuditArtifact(uid, input.workspaceId, {
    id: input.revisionRequestId, category: 'revision_request',
    relativePath: `07-revisions/request-${input.revisionRequestId}.json`,
    contentType: 'application/json', content: JSON.stringify({ comment: input.comment }),
  });
  await getFirestore().runTransaction(async tx => {
    const latest = await tx.get(ref);
    if (latest.data()?.stageVersion !== input.expectedStageVersion ||
      !canTransitionCvStage(latest.data()!.stage, 'revision_requested')) {
      throw new HttpsError('failed-precondition', 'CV version changed while requesting revision.');
    }
    tx.create(ref.collection('revisionRequests').doc(input.revisionRequestId), {
      auditArtifactId: artifact.artifactId, createdAt: FieldValue.serverTimestamp(),
    });
    tx.update(ref, {
      stage: 'revision_requested', stageVersion: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  return { stage: 'revision_requested', revisionRequestId: input.revisionRequestId };
});
