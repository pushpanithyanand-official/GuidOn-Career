import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { z } from 'zod';
import {
  cvWorkflowStageSchema, canTransitionCvStage, keywordSchema,
  recruiterAssessmentSchema, scoreRawAtsKeywords, scoreRecruiterFit,
  scoreSnapshotSchema, cvQualityInputSchema, validateCvQuality, compactGapSchema,
} from './cv-workflow';
import { validateAtsKeywordsAgainstJd, validateRecruiterEvidence } from './cv-matching';
import { sha256Bytes } from './cv-audit';
import { writeCvAuditArtifact, recordCvModelUsage } from './cv-workspace-api';

const id = z.string().uuid();
const stageRecordSchema = z.object({
  stageRunId: id,
  previousStage: cvWorkflowStageSchema,
  nextStage: cvWorkflowStageSchema,
  expectedStageVersion: z.number().int().nonnegative(),
  input: z.unknown(),
  output: z.unknown(),
  // All provider usage must come from the model adapter, never from a client.
  usageEventId: id.optional(),
}).strict();

function refFor(uid: string, workspaceId: string) {
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(uid)) throw new Error('Invalid UID');
  id.parse(workspaceId);
  return getFirestore().collection('users').doc(uid).collection('jobCvWorkspaces').doc(workspaceId);
}

function fileCategory(stage: z.infer<typeof cvWorkflowStageSchema>) {
  switch (stage) {
    case 'profile_match': return { directory: '02-match', category: 'match' as const };
    case 'gap_review':
    case 'awaiting_user_feedback': return { directory: '03-gaps', category: 'gap_report' as const };
    case 'cv_draft':
    case 'revision_requested': return { directory: '04-generation', category: 'generation_output' as const };
    case 'post_cv_review':
    case 'ready_for_user_approval':
    case 'approved': return { directory: '05-cv', category: 'render_qa' as const };
    default: return { directory: '01-jd', category: 'jd_cleaning' as const };
  }
}

function json(value: unknown) {
  const str = JSON.stringify(value);
  if (!str || Buffer.byteLength(str, 'utf8') > 500_000) {
    throw new HttpsError('invalid-argument', 'The stage payload is empty or too large to audit.');
  }
  return str;
}

/**
 * Trusted backend-only state transition. Both inputs and outputs are retained
 * under the named application folder with immutable checksums.
 */
export async function recordCvPipelineStage(
  uid: string, workspaceId: string, raw: z.infer<typeof stageRecordSchema>,
) {
  const input = stageRecordSchema.parse(raw);
  const workspace = refFor(uid, workspaceId);
  const event = workspace.collection('stageEvents').doc(input.stageRunId);
  const existing = await event.get();
  if (existing.exists) return { stage: existing.data()?.nextStage, stageRunId: input.stageRunId };
  if (input.nextStage === 'approved') {
    throw new HttpsError('failed-precondition', 'Only the signed-in user can approve a completed CV.');
  }
    if (!canTransitionCvStage(input.previousStage, input.nextStage)) {
    throw new HttpsError('failed-precondition', 'Stage progression would skip a mandatory review.');
  }
  const target = fileCategory(input.nextStage);
  const base = `${target.directory}/stage-${input.stageRunId}`;
  const inputJson = json(input.input);
  const outputJson = json(input.output);
  let gapSummary: { id: string; kind: string; prompt: string; resolution: string }[] | null = null;
  if (input.nextStage === 'gap_review' || input.nextStage === 'awaiting_user_feedback') {
    const rawGaps = (input.output as { gaps?: unknown })?.gaps;
    const validatedGaps = compactGapSchema.array().max(5).parse(rawGaps);
    gapSummary = validatedGaps.map(gap => ({
      id: gap.id, kind: gap.kind, prompt: gap.prompt, resolution: gap.resolution,
    }));
  }
  const inputArtifact = await writeCvAuditArtifact(uid, workspaceId, {
    id: input.stageRunId,
    relativePath: `${base}-input.json`,
    category: 'generation_input', contentType: 'application/json', content: inputJson,
  });
  const outputArtifact = await writeCvAuditArtifact(uid, workspaceId, {
    relativePath: `${base}-output.json`,
    category: target.category, contentType: 'application/json', content: outputJson,
  });
  const db = getFirestore();
  await db.runTransaction(async tx => {
    const latest = await tx.get(workspace);
    if (input.usageEventId) {
      const recordedUsage = await tx.get(workspace.collection('tokenUsage').doc(input.usageEventId));
      if (!recordedUsage.exists) {
        throw new HttpsError('failed-precondition', 'Recorded provider token usage is missing.');
      }
    }
    if (latest.data()?.stage !== input.previousStage ||
        latest.data()?.stageVersion !== input.expectedStageVersion) {
      throw new HttpsError('failed-precondition', 'Application stage was updated elsewhere. Refresh before retrying.');
    }
    if (input.nextStage === 'ready_for_user_approval' &&
        (latest.data()?.latestCvQualityPassed !== true ||
         !latest.data()?.latestScoredCvVersionId)) {
      throw new HttpsError('failed-precondition', 'A rendered, scored, one-page CV is required before approval.');
    }
    tx.create(event, {
      previousStage: input.previousStage, nextStage: input.nextStage,
      inputSha256: sha256Bytes(inputJson), outputSha256: sha256Bytes(outputJson),
      inputArtifactId: inputArtifact.artifactId,
      outputArtifactId: outputArtifact.artifactId,
      usageEventId: input.usageEventId ?? null,
      createdAt: FieldValue.serverTimestamp(),
    });
    tx.update(workspace, {
      stage: input.nextStage,
      stageVersion: FieldValue.increment(1),
      ...(input.nextStage === 'cv_draft' ? {
        latestCvQualityPassed: false,
        latestScoredCvVersionId: null,
      } : {}),
      ...(gapSummary !== null ? { gapSummary } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  return { stage: input.nextStage, stageRunId: input.stageRunId };
}

const scoreRecordSchema = z.object({
  snapshotId: id,
  timing: z.enum(['pre_cv', 'post_cv']),
  profileRevisionId: z.string().regex(/^[A-Za-z0-9_-]{10,64}$/),
  cvVersionId: id.optional(),
  cleanedJd: z.string().min(50).max(120_000),
  extractedKeywords: z.array(keywordSchema).max(250),
  scoredText: z.string().min(20).max(100_000),
  recruiter: recruiterAssessmentSchema,
  quality: cvQualityInputSchema.optional(),
}).strict().superRefine((value, ctx) => {
  if (value.timing === 'pre_cv' && value.recruiter.evidenceBasis !== 'confirmed_profile') {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['recruiter', 'evidenceBasis'],
      message: 'Before generation, match against the verified career profile.' });
  }
  if (value.timing === 'post_cv') {
    if (!value.cvVersionId || !value.quality ||
      value.recruiter.evidenceBasis !== 'rendered_cv') {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['cvVersionId'],
        message: 'After generation, a rendered CV version and measured layout QA are required.' });
    }
  }
});

/**
 * Score against grounded JD terms and a user-confirmed profile revision.
 * This is a GuidOn analytical rubric, not an employer's private ATS or recruiter rating.
 */
export async function recordCvScoreSnapshot(uid: string, workspaceId: string,
  raw: z.infer<typeof scoreRecordSchema>) {
  const input = scoreRecordSchema.parse(raw);
  const workspace = refFor(uid, workspaceId);
  const result = workspace.collection('scoreSnapshots').doc(input.snapshotId);
  const prior = await result.get();
  if (prior.exists) return {
    snapshotId: input.snapshotId,
    rawAts: prior.data()?.rawAts,
    recruiterFit: prior.data()?.recruiterFit,
    layoutQuality: prior.data()?.quality ?? null,
    acceptedForFinalCv: input.timing === 'post_cv' && prior.data()?.quality?.passed === true,
  };

  const source = await getFirestore().collection('users').doc(uid)
    .collection('profileRevisions').doc(input.profileRevisionId).get();
  if (!source.exists || source.data()?.state !== 'user_confirmed') {
    throw new HttpsError('failed-precondition', 'A confirmed career-profile revision is required.');
  }
  const workspaceRecord = await workspace.get();
  if (!workspaceRecord.exists) throw new HttpsError('not-found', 'Application folder not found.');
  if (input.timing === 'post_cv') {
    const savedVersion = await workspace.collection('cvVersions').doc(input.cvVersionId!).get();
    if (!savedVersion.exists || savedVersion.data()?.renderQualityPassed !== true) {
      throw new HttpsError('failed-precondition', 'Post-CV scoring requires a real rendered, QA-passed CV version.');
    }
    if (savedVersion.data()?.profileRevisionId !== input.profileRevisionId ||
        savedVersion.data()?.textSha256 !== sha256Bytes(input.scoredText)) {
      throw new HttpsError('failed-precondition', 'Post-CV scores must use the exact saved CV text and profile revision.');
    }
    // The quality metrics must be the same ones registered with the rendered document.
    if (JSON.stringify(savedVersion.data()?.quality) !== JSON.stringify(input.quality)) {
      throw new HttpsError('failed-precondition', 'Rendered document QA metrics do not match the saved CV.');
    }
  }

  const grounding = validateAtsKeywordsAgainstJd(input.cleanedJd, input.extractedKeywords);
  if (!grounding.grounded) {
    throw new HttpsError('failed-precondition', 'Some scored keywords are not grounded in the JD.');
  }
  const recruiterEvidence = validateRecruiterEvidence(source.data()!.data, input.recruiter);
  if (!recruiterEvidence.supported) {
    throw new HttpsError('failed-precondition', 'Recruiter Fit references unverified or unrelated evidence.');
  }

  const ats = scoreRawAtsKeywords(input.extractedKeywords, input.scoredText);
  const recruiter = scoreRecruiterFit(input.recruiter);
  const quality = input.quality ? validateCvQuality(input.quality) : null;
  const score = scoreSnapshotSchema.parse({
    timing: input.timing,
    profileRevisionId: input.profileRevisionId,
    ...(input.cvVersionId ? { cvVersionId: input.cvVersionId } : {}),
    rawAts: { score: ats.score, matchedCount: ats.matchedCount, totalCount: ats.totalCount },
    recruiterFit: { score: recruiter.score, rubricVersion: 'recruiter-v1' },
  });
  const detail = { ...score, rawAts: ats, recruiterFit: recruiter,
    quality, jdGrounding: grounding, scorerVersion: 'guidon-v1',
    // The scoring document is verified evidence BEFORE CV, actual rendered text AFTER CV.
    scoreBasis: input.timing === 'pre_cv' ? 'confirmed_profile_evidence' : 'exported_cv_text',
    scoreDisclaimer: 'Internal guidance only; neither score predicts interviews or represents an ATS vendor score.',
  };
  const content = json(detail);
  const artifact = await writeCvAuditArtifact(uid, workspaceId, {
    id: input.snapshotId,
    category: input.timing === 'pre_cv' ? 'score_pre_cv' : 'score_post_cv',
    relativePath: input.timing === 'pre_cv'
      ? `03-gaps/pre-cv-score-${input.snapshotId}.json`
      : `05-cv/post-cv-score-${input.snapshotId}.json`,
    contentType: 'application/json',
    content,
    cvVersionId: input.cvVersionId,
  });
  try {
    await result.create({
      ...detail,
      auditArtifactId: artifact.artifactId,
      sha256: sha256Bytes(content),
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    const code = (error as { code?: number | string }).code;
    if (code !== 6 && code !== 'already-exists') throw error;
    const other = await result.get();
    if (other.data()?.sha256 !== sha256Bytes(content)) {
      throw new HttpsError('already-exists', 'A score ID was already used for a different evaluation.');
    }
  }
  if (input.timing === 'post_cv') {
    await workspace.update({
      latestCvQualityPassed: quality?.passed === true,
      latestScoredCvVersionId: input.cvVersionId,
      latestPostCvScoreSnapshotId: input.snapshotId,
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  return { snapshotId: input.snapshotId, rawAts: ats, recruiterFit: recruiter,
    layoutQuality: quality, acceptedForFinalCv: input.timing === 'post_cv' && quality?.passed === true };
}

// Named wrapper for stage-level token telemetry; never exposed as a callable.
export { recordCvModelUsage };
