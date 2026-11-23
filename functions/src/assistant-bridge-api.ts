import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { assistantJobCaptureSchema } from './assistant-bridge';
import { saveUserProvidedJob } from './manual-jobs-api';

const settings = { region: 'europe-west1' as const, maxInstances: 3, memory: '256MiB' as const };

/** User-controlled browser capture. No server-side scraping and no external form submission. */
export const captureMyJobFromAssistant = onCall(settings, async request => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in before capturing a job.');
  const capture = assistantJobCaptureSchema.safeParse(request.data);
  if (!capture.success) {
    throw new HttpsError('invalid-argument', 'Invalid browser-assistant capture.', {
      fields: capture.error.issues.map(issue => ({
        field: issue.path.join('.'), message: issue.message,
      })),
    });
  }
  const source = capture.data.sourceSurface;
  const saved = await saveUserProvidedJob(uid, capture.data.job, source);
  return {
    ...saved, sourceSurface: source,
    requiresUserControlledApply: true,
    userAccountSynced: true,
  };
});
