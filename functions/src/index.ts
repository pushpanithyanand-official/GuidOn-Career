import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { ZodError } from 'zod';
import { cvUploadInput, completeCvInput, confirmProfileInput, cvStoragePath } from './contracts';

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

/** Save a user-approved profile; never promote an AI draft automatically. */
export const confirmCareerProfile = onCall(settings, async request => {
  const uid = uidFor(request);
  const input = parse(confirmProfileInput, request.data);
  const user = userDoc(uid);
  if (input.sourceCvId) {
    const source = await user.collection('baseCvs').doc(input.sourceCvId).get();
    if (!source.exists || source.data()?.status !== 'uploaded') {
      throw new HttpsError('failed-precondition', 'Base CV must belong to the signed-in user and be uploaded.');
    }
  }
  const revision = user.collection('profileRevisions').doc();
  const current = user.collection('profile').doc('current');
  const data = {
    data: input.profile,
    state: 'user_confirmed',
    confirmedAt: FieldValue.serverTimestamp(),
    sourceCvId: input.sourceCvId ?? null,
    revisionId: revision.id,
    schemaVersion: 1,
  };
  const batch = db.batch();
  batch.set(revision, data);
  batch.set(current, data);
  batch.set(user, { updatedAt: FieldValue.serverTimestamp(), onboardingStep: 'profile_confirmed' }, { merge: true });
  await batch.commit();
  return { revisionId: revision.id, state: 'user_confirmed' };
});

/** Upload is user-controlled; creates a bounded single-use storage slot, not AI processing. */
export const beginBaseCvUpload = onCall(settings, async request => {
  const uid = uidFor(request);
  const input = parse(cvUploadInput, request.data);
  const user = userDoc(uid);
  const ref = user.collection('baseCvs').doc();
  const storagePath = cvStoragePath(uid, ref.id);
  await ref.create({
    ...input,
    storagePath,
    status: 'awaiting_upload',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    schemaVersion: 1,
    extractionStatus: 'not_requested',
  });
  return { uploadId: ref.id, storagePath, maxSizeBytes: 10 * 1024 * 1024 };
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
    updatedAt: FieldValue.serverTimestamp(),
    uploadedAt: FieldValue.serverTimestamp(),
    objectGeneration: object.generation ?? null,
  });
  return { uploadId, status: 'uploaded' };
});
