const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, Timestamp } = require('firebase/firestore');
const { ref, uploadBytes, getBytes, deleteObject } = require('firebase/storage');

const projectId = 'demo-guidon-career-security';
const root = path.resolve(__dirname, '../..');
const firestoreRules = fs.readFileSync(path.join(root, 'firestore.rules'), 'utf8');
const activeStorageRules = fs.readFileSync(path.join(root, 'storage.rules'), 'utf8');
const candidateStorageRules = fs.readFileSync(path.join(root, 'storage.uploads.rules'), 'utf8');

function envFor(storageRules) {
  return initializeTestEnvironment({
    projectId,
    firestore: { host: '127.0.0.1', port: 8080, rules: firestoreRules },
    storage: { host: '127.0.0.1', port: 9199, rules: storageRules },
  });
}

test('active rules deny all private reads and writes for both users and strangers', async () => {
  const env = await envFor(activeStorageRules);
  try {
    const userA = env.authenticatedContext('userA');
    const userB = env.authenticatedContext('userB');
    const stranger = env.unauthenticatedContext();
    for (const context of [userA, userB, stranger]) {
      await assertFails(getDoc(doc(context.firestore(), 'users/userA/profile/current')));
      await assertFails(setDoc(doc(context.firestore(), 'users/userA/profile/current'), { data: 'leak' }));
      await assertFails(uploadBytes(ref(context.storage(), 'users/userA/base-cvs/example-id/original'), new Uint8Array([37, 80, 68, 70]), { contentType: 'application/pdf' }));
    }
  } finally {
    await env.cleanup();
  }
});

test('candidate rules permit only an unexpired, size-matched, owner-approved one-time upload', async () => {
  const env = await envFor(candidateStorageRules);
  try {
    const uploadId = '550e8400-e29b-41d4-a716-446655440000';
    const anotherId = '550e8400-e29b-41d4-a716-446655440001';
    const expiredId = '550e8400-e29b-41d4-a716-446655440002';
    const payload = new Uint8Array([37, 80, 68, 70]);
    const uploadPath = id => `users/userA/base-cvs/${id}/original`;
    const bucketDoc = id => `users/userA/baseCvs/${id}`;

    await env.withSecurityRulesDisabled(async context => {
      const db = context.firestore();
      await setDoc(doc(db, bucketDoc(uploadId)), {
        status: 'awaiting_upload', mimeType: 'application/pdf',
        sizeBytes: payload.length, expiresAt: Timestamp.fromMillis(Date.now() + 15 * 60_000),
      });
      await setDoc(doc(db, bucketDoc(anotherId)), {
        status: 'awaiting_upload', mimeType: 'application/pdf',
        sizeBytes: payload.length + 1, expiresAt: Timestamp.fromMillis(Date.now() + 15 * 60_000),
      });
      await setDoc(doc(db, bucketDoc(expiredId)), {
        status: 'awaiting_upload', mimeType: 'application/pdf',
        sizeBytes: payload.length, expiresAt: Timestamp.fromMillis(Date.now() - 1000),
      });
    });

    const userA = env.authenticatedContext('userA');
    const userB = env.authenticatedContext('userB');
    const anonymous = env.unauthenticatedContext();
    const ownFile = ref(userA.storage(), uploadPath(uploadId));
    await assertSucceeds(uploadBytes(ownFile, payload, { contentType: 'application/pdf' }));
    // Rule 'allow create' prevents overwriting an original, even by the owner.
    await assertFails(uploadBytes(ownFile, payload, { contentType: 'application/pdf' }));
    await assertFails(uploadBytes(ref(userB.storage(), uploadPath(anotherId)), payload, { contentType: 'application/pdf' }));
    await assertFails(uploadBytes(ref(anonymous.storage(), uploadPath(expiredId)), payload, { contentType: 'application/pdf' }));
    await assertFails(uploadBytes(ref(userA.storage(), uploadPath(anotherId)), payload, { contentType: 'application/pdf' }));
    await assertFails(uploadBytes(ref(userA.storage(), uploadPath(expiredId)), payload, { contentType: 'application/pdf' }));
    await assertFails(getBytes(ref(userB.storage(), uploadPath(uploadId))));
    await assertFails(deleteObject(ownFile));
    assert.deepEqual([...new Uint8Array(await assertSucceeds(getBytes(ownFile)))], [...payload]);
  } finally {
    await env.cleanup();
  }
});

test('the client cannot forge a CV upload intent in Firestore', async () => {
  const env = await envFor(candidateStorageRules);
  try {
    await assertFails(setDoc(doc(env.authenticatedContext('userA').firestore(), 'users/userA/baseCvs/fake'),
      { status: 'awaiting_upload', mimeType: 'application/pdf', sizeBytes: 4 }));
  } finally {
    await env.cleanup();
  }
});
