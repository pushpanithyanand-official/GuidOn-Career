import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { ZodError } from 'zod';
import { cvUploadInput, completeCvInput, cvStoragePath } from './contracts';

if (!getApps().length) initializeApp();

const db = getFirestore();
const settings = { region: 'europe-west1' as const, maxInstances: 3, memory: '256MiB' as const };

function uidFor(request: CallableRequest<unknown>): string {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Please sign in first.');
  return request.auth.uid;
}

function parse<T>(schema: { parse: (value: unknown) => T }, value: unknown): T {
  try {
    return schema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new HttpsError('invalid-argument', 'Invalid request data.', {
        fields: error.issues.map(issue => ({ field: issue.path.join('.'), message: issue.message })),
      });
    }
    throw error;
  }
}

function userDoc(uid: string) {
  return db.collection('users').doc(uid);
}

/** First authenticated call creates the current user's private account shell. */
export const getMyWorkspace = onCall(settings, async request => {
  const uid = uidFor(request);
  const user = userDoc(uid);
  let userRecord = await user.get();
  if (!userRecord.exists) {
    try {
      await user.create({
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        onboardingStep: 'upload_base_cv',
        schemaVersion: 1,
      });
    } catch (error: unknown) {
      // A simultaneous first-login request may have created the same document.
      if ((error as { code?: number | string }).code !== 6 &&
          (error as { code?: number | string }).code !== 'already-exists') throw error;
    }
    userRecord = await user.get();
  }
  const [profile, recentCvs] = await Promise.all([
    user.collection('profile').doc('current').get(),
    user.collection('baseCvs').orderBy('createdAt', 'desc').limit(20).get(),
  ]);
  return {
    uid,
    capabilities: {
      cvUploadsEnabled: process.env.CV_UPLOADS_ENABLED === 'true',
      aiProfileExtractionEnabled: false,
    },
    account: {
      onboardingStep: userRecord.data()?.onboardingStep ?? 'upload_base_cv',
      schemaVersion: userRecord.data()?.schemaVersion ?? 1,
    },
    profile: profile.exists ? { data: profile.data()?.data, state: profile.data()?.state ?? 'unconfirmed' } : null,
    baseCvs: recentCvs.docs.map(doc => ({
      id: doc.id,
      fileName: doc.data().fileName,
      mimeType: doc.data().mimeType,
      status: doc.data().status,
      // Not a public download URL. Client accesses authorised Storage by path.
      storagePath: doc.data().storagePath,
    })),
  };
});

export {
  saveMyProfileDraft,
  getMyCareerProfile,
  confirmCareerProfile,
  listMyProfileRevisions,
} from './profile-api';

/** Create a short-lived, idempotent CV upload slot with per-user abuse limits. */
export const beginBaseCvUpload = onCall(settings, async request => {
  const uid = uidFor(request);
  if (process.env.CV_UPLOADS_ENABLED !== 'true') {
    throw new HttpsError('failed-precondition', 'CV uploads are not enabled in this environment.');
  }
  const input = parse(cvUploadInput, request.data);
  const user = userDoc(uid);
  const uploadId = input.clientRequestId;
  const ref = user.collection('baseCvs').doc(uploadId);
  const counterRef = user.collection('usage').doc('baseCvUploads');
  const storagePath = cvStoragePath(uid, uploadId);
  const today = new Date().toISOString().slice(0, 10);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  await db.runTransaction(async tx => {
    const [existing, counts] = await Promise.all([tx.get(ref), tx.get(counterRef)]);
    if (existing.exists) {
      const previous = existing.data()!;
      if (previous.fileName !== input.fileName ||
          previous.mimeType !== input.mimeType ||
          previous.sizeBytes !== input.sizeBytes) {
        throw new HttpsError('already-exists', 'This upload request ID belongs to a different file.');
      }
      return; // An identical retry must not consume a second quota slot.
    }

    const usage = counts.data() ?? {};
    const dailyCount = usage.day === today ? Number(usage.dailyCount ?? 0) : 0;
    const totalCount = Number(usage.totalCount ?? 0);
    if (dailyCount >= 6 || totalCount >= 100) {
      throw new HttpsError('resource-exhausted', 'Base CV upload limit reached. Try again later or contact support.');
    }
    tx.create(ref, {
      ...input,
      storagePath,
      status: 'awaiting_upload',
      scanStatus: 'not_scanned',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      expiresAt,
      schemaVersion: 2,
      extractionStatus: 'not_requested',
    });
    tx.set(counterRef, {
      day: today,
      dailyCount: dailyCount + 1,
      totalCount: totalCount + 1,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  });

  const snapshot = await ref.get();
  const deadline = snapshot.data()?.expiresAt;
  return {
    uploadId,
    storagePath,
    maxSizeBytes: 10 * 1024 * 1024,
    expiresAt: deadline?.toDate?.().toISOString?.() ?? expiresAt.toISOString(),
  };
});

/** Check the authenticated user's uploaded object before recording completion. */
export const completeBaseCvUpload = onCall(settings, async request => {
  const uid = uidFor(request);
  const { uploadId } = parse(completeCvInput, request.data);
  const doc = userDoc(uid).collection('baseCvs').doc(uploadId);
  const record = await doc.get();
  if (!record.exists) throw new HttpsError('not-found', 'Upload intent not found.');
  const stored = record.data()!;
  if (stored.status === 'uploaded') return { uploadId, status: 'uploaded' };
  if (stored.status !== 'awaiting_upload') throw new HttpsError('failed-precondition', 'Upload is not awaiting completion.');
  const deadline: Date | undefined = stored.expiresAt?.toDate?.();
  if (deadline && deadline.getTime() < Date.now()) {
    throw new HttpsError('deadline-exceeded', 'Upload permission expired; create a new upload request.');
  }
  const path = cvStoragePath(uid, uploadId);
  if (stored.storagePath !== path) throw new HttpsError('failed-precondition', 'Upload path mismatch.');
  const [object] = await getStorage().bucket().file(path).getMetadata().catch((error: unknown) => {
    if ((error as { code?: number }).code === 404) throw new HttpsError('failed-precondition', 'File has not been uploaded yet.');
    throw error;
  });
  if (object.contentType !== stored.mimeType ||
      Number(object.size) <= 0 ||
      Number(object.size) > 10 * 1024 * 1024 ||
      Number(object.size) !== stored.sizeBytes) {
    throw new HttpsError('failed-precondition', 'File metadata does not match the requested upload.');
  }
  await doc.update({
    status: 'uploaded',
    scanStatus: 'not_scanned',
    updatedAt: FieldValue.serverTimestamp(),
    uploadedAt: FieldValue.serverTimestamp(),
    objectGeneration: object.generation ?? null,
  });
  return { uploadId, status: 'uploaded' };
});

export {
  createMyCvWorkspace,
  getMyCvWorkspaceReport,
  readMyCvAuditArtifact,
  submitMyCvGapFeedback,
  requestMyCvRevision,
  approveMyCvVersion,
} from './cv-workspace-api';

export { previewMyJdReview, confirmMyJdReview } from './cv-jd-api';

export {
  getMyJobListings,
  setMyJobDecision,
  getMyJobTimeline,
  saveMyJobFilters,
  getMyJobFilters,
} from './job-discovery-api';

export { setMyCvGenerationMode } from './cv-generation-mode-api';
