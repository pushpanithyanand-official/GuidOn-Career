import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';
import { z, ZodError } from 'zod';
import { auditDocumentNames, sha256Bytes } from './cv-audit';
import { cleanJobDescription, jdRequirementSchema, validateJdRequirements,
  validateAtsKeywordsAgainstJd } from './cv-matching';
import { jobDescriptionSchema, keywordSchema } from './cv-workflow';
import { recordCvPipelineStage } from './cv-pipeline';

const settings = { region: 'europe-west1' as const, maxInstances: 3, memory: '256MiB' as const };
const id = z.string().uuid();
const previewSchema = z.object({ workspaceId: id }).strict();
const reviewSchema = z.object({
  workspaceId: id, reviewId: id, expectedStageVersion: z.number().int().nonnegative(),
  cleanedText: z.string().trim().min(50).max(120_000),
  cleanupNotes: z.array(z.string().trim().min(1).max(300)).max(20).default([]),
  requirements: z.array(jdRequirementSchema).min(1).max(200),
  keywords: z.array(keywordSchema).max(250),
  confirmedByUser: z.literal(true),
}).strict();

function owner(request: CallableRequest<unknown>) {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in to review this job description.');
  return request.auth.uid;
}
function parse<T>(schema: { parse(raw: unknown): T }, raw: unknown): T {
  try { return schema.parse(raw); } catch (reason) {
    if (reason instanceof ZodError) {
      throw new HttpsError('invalid-argument', 'JD review validation failed.',
        { fields: reason.issues.map(issue => ({ field: issue.path.join('.'), message: issue.message })) });
    }
    throw reason;
  }
}

async function originalJd(uid: string, workspaceId: string) {
  const workspace = getFirestore().collection('users').doc(uid)
    .collection('jobCvWorkspaces').doc(workspaceId);
  const [metadata, artifact] = await Promise.all([
    workspace.get(), workspace.collection('artifacts').doc(workspaceId).get(),
  ]);
  if (!metadata.exists || !artifact.exists) {
    throw new HttpsError('not-found', 'This JD has not been saved in your application folder.');
  }
  if (artifact.data()?.path !== auditDocumentNames.originalJd ||
      artifact.data()?.category !== 'jd_input') {
    throw new HttpsError('failed-precondition', 'Original JD audit file is missing.');
  }
  const [bytes] = await getStorage().bucket().file(artifact.data()!.storagePath).download();
  if (sha256Bytes(bytes) !== artifact.data()?.sha256) {
    throw new HttpsError('data-loss', 'Saved original JD failed the integrity check.');
  }
  const decoded = JSON.parse(bytes.toString('utf8')) as { text?: unknown };
  if (typeof decoded.text !== 'string' || decoded.text.length < 50) {
    throw new HttpsError('data-loss', 'Original JD content is invalid.');
  }
  return { text: decoded.text, record: metadata.data()! };
}

/** Safe, non-AI cleanup preview. Understanding/extraction will use a validated AI adapter later. */
export const previewMyJdReview = onCall(settings, async request => {
  const uid = owner(request);
  const { workspaceId } = parse(previewSchema, request.data);
  const original = await originalJd(uid, workspaceId);
  if (original.record.stage !== 'jd_review') {
    throw new HttpsError('failed-precondition', 'JD review has already been confirmed.');
  }
  const cleanup = cleanJobDescription(original.text);
  return { ...cleanup, stageVersion: original.record.stageVersion };
});

/** The user approves an exact, source-grounded JD before profile matching begins. */
export const confirmMyJdReview = onCall(settings, async request => {
  const uid = owner(request);
  const input = parse(reviewSchema, request.data);
  const original = await originalJd(uid, input.workspaceId);
  const report = jobDescriptionSchema.parse({
    originalText: original.text,
    cleanedText: input.cleanedText,
    cleanupNotes: input.cleanupNotes,
    confirmedByUser: true,
  });
  const requirements = validateJdRequirements(report.cleanedText, input.requirements);
  const keywords = validateAtsKeywordsAgainstJd(report.cleanedText, input.keywords);
  if (requirements.ungrounded.length || !keywords.grounded) {
    throw new HttpsError('failed-precondition',
      'Every extracted requirement and keyword must have a verifiable source quote in the reviewed JD.',
      { ungroundedRequirements: requirements.ungrounded.map(x => x.text),
        ungroundedKeywords: keywords.ungroundedKeywords });
  }
  const outcome = await recordCvPipelineStage(uid, input.workspaceId, {
    stageRunId: input.reviewId,
    previousStage: 'jd_review',
    nextStage: 'profile_match',
    expectedStageVersion: input.expectedStageVersion,
    input: { originalJdSha256: sha256Bytes(original.text), userConfirmed: true },
    output: { ...report, requirements: requirements.grounded, keywords: input.keywords },
  });
  return { ...outcome, cleanedJdSha256: sha256Bytes(input.cleanedText),
    requirementsCount: requirements.grounded.length, keywordCount: input.keywords.length };
});
