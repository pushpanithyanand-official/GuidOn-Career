import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { ZodError } from 'zod';
import { confirmProfileInput, profileHistoryInput, saveProfileDraftInput } from './contracts';

const settings = { region: 'europe-west1' as const, maxInstances: 3, memory: '256MiB' as const };

function owner(request: CallableRequest<unknown>): string {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in to manage your career profile.');
  return uid;
}

function validate<T>(schema: { parse: (value: unknown) => T }, data: unknown): T {
  try {
    return schema.parse(data);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new HttpsError('invalid-argument', 'Invalid profile payload', {
        fields: error.issues.map(issue => ({ field: issue.path.join('.'), message: issue.message })),
      });
    }
    throw error;
  }
}

function enforceSize(data: unknown) {
  // Firestore's document limit is 1 MiB; keep an intentionally smaller bound.
  if (Buffer.byteLength(JSON.stringify(data), 'utf8') > 500_000) {
    throw new HttpsError('invalid-argument', 'Profile is too large; shorten individual entries.');
  }
}

async function requireOwnSourceCv(uid: string, sourceCvId: string | null | undefined) {
  if (!sourceCvId) return;
  const doc = await getFirestore().collection('users').doc(uid).collection('baseCvs').doc(sourceCvId).get();
  if (!doc.exists || doc.data()?.status !== 'uploaded') {
    throw new HttpsError('failed-precondition', 'The referenced base CV has not been uploaded to this account.');
  }
}

/** Draft facts are editable, but are never trusted evidence for CV generation. */
export const saveMyProfileDraft = onCall(settings, async request => {
  const uid = owner(request);
  const input = validate(saveProfileDraftInput, request.data);
  enforceSize(input.profile);
  await requireOwnSourceCv(uid, input.sourceCvId);
  const user = getFirestore().collection('users').doc(uid);
  await user.collection('profileDrafts').doc('current').set({
    profile: input.profile,
    origin: 'user_edit',
    state: 'unconfirmed',
    sourceCvId: input.sourceCvId ?? null,
    schemaVersion: 2,
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { state: 'unconfirmed', saved: true };
});

/** Read current confirmed and unconfirmed profile state of the caller, never another UID. */
export const getMyCareerProfile = onCall(settings, async request => {
  const uid = owner(request);
  const user = getFirestore().collection('users').doc(uid);
  const [confirmed, draft] = await Promise.all([
    user.collection('profile').doc('current').get(),
    user.collection('profileDrafts').doc('current').get(),
  ]);
  return {
    confirmed: confirmed.exists ? {
      profile: confirmed.data()?.data,
      revisionId: confirmed.data()?.revisionId,
      state: confirmed.data()?.state,
      schemaVersion: confirmed.data()?.schemaVersion,
      sourceCvId: confirmed.data()?.sourceCvId ?? null,
    } : null,
    draft: draft.exists ? {
      profile: draft.data()?.profile,
      state: 'unconfirmed',
      sourceCvId: draft.data()?.sourceCvId ?? null,
    } : null,
  };
});

/** Explicit approval with an expected revision protects against losing edits on a second device. */
export const confirmCareerProfile = onCall(settings, async request => {
  const uid = owner(request);
  const input = validate(confirmProfileInput, request.data);
  enforceSize(input.profile);

  const db = getFirestore();
  const user = db.collection('users').doc(uid);
  const current = user.collection('profile').doc('current');
  const draft = user.collection('profileDrafts').doc('current');
  const revision = user.collection('profileRevisions').doc();

  await db.runTransaction(async tx => {
    // All reads must precede writes; also guard against an unrelated user's CV.
    const currentRecord = await tx.get(current);
    const previousRevisionId: string | null = currentRecord.data()?.revisionId ?? null;
    if (previousRevisionId !== (input.expectedRevisionId ?? null)) {
      throw new HttpsError('failed-precondition', 'Profile changed on another device. Reload before confirming your edits.');
    }
    if (input.sourceCvId) {
      const cv = await tx.get(user.collection('baseCvs').doc(input.sourceCvId));
      if (!cv.exists || cv.data()?.status !== 'uploaded') {
        throw new HttpsError('failed-precondition', 'The referenced base CV has not been uploaded to this account.');
      }
    }

    const record = {
      data: input.profile,
      state: 'user_confirmed',
      confirmedAt: FieldValue.serverTimestamp(),
      sourceCvId: input.sourceCvId ?? null,
      revisionId: revision.id,
      parentRevisionId: previousRevisionId,
      schemaVersion: 2,
    };
    tx.create(revision, record);
    tx.set(current, record);
    tx.delete(draft);
    tx.set(user, {
      updatedAt: FieldValue.serverTimestamp(),
      onboardingStep: 'profile_confirmed',
    }, { merge: true });
  });

  return { revisionId: revision.id, state: 'user_confirmed', schemaVersion: 2 };
});

/** Read an ordered, bounded record of user-approved versions for history/diff. */
export const listMyProfileRevisions = onCall(settings, async request => {
  const uid = owner(request);
  const { limit } = validate(profileHistoryInput, request.data ?? {});
  const snapshots = await getFirestore().collection('users').doc(uid)
    .collection('profileRevisions')
    .orderBy('confirmedAt', 'desc')
    .limit(limit)
    .get();
  return { revisions: snapshots.docs.map(doc => ({
    id: doc.id,
    profile: doc.data().data,
    parentRevisionId: doc.data().parentRevisionId ?? null,
    sourceCvId: doc.data().sourceCvId ?? null,
    schemaVersion: doc.data().schemaVersion ?? 1,
  })) };
});
