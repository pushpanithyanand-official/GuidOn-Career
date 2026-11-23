import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { ZodError } from 'zod';
import { modeSelectionInputSchema } from './cv-generation-mode';
import { writeCvAuditArtifact } from './cv-workspace-api';

const settings = { region: 'europe-west1' as const, maxInstances: 3, memory: '256MiB' as const };

export const setMyCvGenerationMode = onCall(settings, async (request: CallableRequest<unknown>) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in before selecting a CV generation mode.');
  const result = modeSelectionInputSchema.safeParse(request.data);
  if (!result.success) {
    throw new HttpsError('invalid-argument', 'Invalid generation-mode selection.',
      { fields: result.error.issues.map(issue => ({ field: issue.path.join('.'), message: issue.message })) });
  }
  const input = result.data;
  const db = getFirestore();
  const workspace = db.collection('users').doc(uid).collection('jobCvWorkspaces').doc(input.workspaceId);
  const event = workspace.collection('modeChanges').doc(input.modeChangeId);
  const [current, previous] = await Promise.all([workspace.get(), event.get()]);
  if (!current.exists) throw new HttpsError('not-found', 'Application folder not found for this account.');
  if (previous.exists) {
    if (previous.data()?.generationMode !== input.generationMode) {
      throw new HttpsError('already-exists', 'Mode change ID belongs to a different option.');
    }
    return { workspaceId: input.workspaceId, generationMode: input.generationMode,
      stageVersion: previous.data()?.stageVersion };
  }
  const allowed = ['jd_review', 'profile_match', 'gap_review',
    'awaiting_user_feedback', 'cv_draft', 'revision_requested'];
  if (!allowed.includes(current.data()?.stage) || current.data()?.stageVersion !== input.expectedStageVersion) {
    throw new HttpsError('failed-precondition', 'Mode must be selected before this CV is finalised. Refresh and retry.');
  }
  const artifact = await writeCvAuditArtifact(uid, input.workspaceId, {
    id: input.modeChangeId, category: 'generation_input',
    relativePath: `04-generation/mode-${input.modeChangeId}.json`,
    contentType: 'application/json',
    content: JSON.stringify({
      mode: input.generationMode, acknowledgeFactPreservation: true,
      previousMode: current.data()?.generationMode ?? 'evidence_first',
    }),
  });
  const newVersion = input.expectedStageVersion + 1;
  await db.runTransaction(async tx => {
    const latest = await tx.get(workspace);
    const earlier = await tx.get(event);
    if (earlier.exists) {
      if (earlier.data()?.generationMode !== input.generationMode) {
        throw new HttpsError('already-exists', 'The generation-mode request ID was already used.');
      }
      return;
    }
    if (!allowed.includes(latest.data()?.stage) ||
        latest.data()?.stageVersion !== input.expectedStageVersion) {
      throw new HttpsError('failed-precondition', 'The CV workflow changed while selecting generation mode.');
    }
    tx.create(event, {
      generationMode: input.generationMode, auditArtifactId: artifact.artifactId,
      stageVersion: newVersion, createdAt: FieldValue.serverTimestamp(),
    });
    tx.update(workspace, {
      generationMode: input.generationMode,
      stageVersion: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  return { workspaceId: input.workspaceId, generationMode: input.generationMode, stageVersion: newVersion };
});
