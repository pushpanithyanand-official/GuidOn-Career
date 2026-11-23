const test = require('node:test');
const assert = require('node:assert/strict');
const { initializeApp, deleteApp } = require('firebase/app');
const { getAuth, connectAuthEmulator, createUserWithEmailAndPassword } = require('firebase/auth');
const { getFunctions, connectFunctionsEmulator, httpsCallable } = require('firebase/functions');

const projectId = 'demo-guidon-career-security';

function createClient(name) {
  const app = initializeApp({ projectId, apiKey: 'demo-api-key', authDomain: 'localhost', appId: `guidon-${name}` }, name);
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  const functions = getFunctions(app, 'europe-west1');
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  const call = (name, data = {}) => httpsCallable(functions, name)(data).then(result => result.data);
  return { app, auth, call };
}

test('two signed-in users cannot read or change the other user’s career workspace', async () => {
  const alice = createClient('test-alice');
  const bob = createClient('test-bob');
  const visitor = createClient('test-visitor');
  try {
    await assert.rejects(visitor.call('getMyWorkspace'), error => error.code === 'functions/unauthenticated');

    await createUserWithEmailAndPassword(alice.auth, 'alice@guidon-test.invalid', 'example-secure-pass-42');
    await createUserWithEmailAndPassword(bob.auth, 'bob@guidon-test.invalid', 'example-secure-pass-42');

    const a = await alice.call('getMyWorkspace', { uid: bob.auth.currentUser.uid });
    const b = await bob.call('getMyWorkspace');
    assert.equal(a.uid, alice.auth.currentUser.uid);
    assert.equal(b.uid, bob.auth.currentUser.uid);
    assert.notEqual(a.uid, b.uid);

    assert.equal((await alice.call('getMyCareerProfile')).confirmed, null);
    assert.equal((await bob.call('getMyCareerProfile')).draft, null);

    await alice.call('saveMyProfileDraft', { profile: {
      displayName: 'Alice Candidate',
      skills: ['Financial reporting'],
    } });

    const aliceDraft = await alice.call('getMyCareerProfile');
    assert.equal(aliceDraft.draft.profile.displayName, 'Alice Candidate');
    assert.equal((await bob.call('getMyCareerProfile')).draft, null);

    const confirmation = await alice.call('confirmCareerProfile', {
      profile: { displayName: 'Alice Candidate', skills: ['Financial reporting'] },
      userConfirmed: true,
      expectedRevisionId: null,
    });
    assert.equal(confirmation.state, 'user_confirmed');
    assert.ok(confirmation.revisionId);
    assert.equal((await alice.call('getMyCareerProfile')).confirmed.profile.displayName, 'Alice Candidate');
    assert.equal((await bob.call('getMyCareerProfile')).confirmed, null);
    assert.equal((await alice.call('getMyCareerProfile')).draft, null);

    await assert.rejects(alice.call('confirmCareerProfile', {
      profile: { displayName: 'Stale edit' },
      userConfirmed: true,
      expectedRevisionId: null,
    }), error => error.code === 'functions/failed-precondition');

    const revisions = await alice.call('listMyProfileRevisions');
    assert.equal(revisions.revisions.length, 1);
    assert.equal(revisions.revisions[0].profile.displayName, 'Alice Candidate');
    assert.equal((await bob.call('listMyProfileRevisions')).revisions.length, 0);

    await assert.rejects(alice.call('beginBaseCvUpload', {
      fileName: 'Resume.pdf',
      sizeBytes: 15,
      mimeType: 'application/pdf',
      consentToStore: true,
      clientRequestId: '550e8400-e29b-41d4-a716-446655440000',
    }), error => error.code === 'functions/failed-precondition');
    assert.equal(a.capabilities.cvUploadsEnabled, false);

    // Audit folders are separately namespaced per candidate, even for the same vacancy.
    const vacancy = {
      clientRequestId: '550e8400-e29b-41d4-a716-446655440004',
      company: 'Example Company', designation: 'Financial Analyst',
      location: 'Dublin, Ireland',
      originalJd: 'Prepare financial forecasts and analyse financial results using SQL, Excel and Power BI to support operational decisions.',
    };
    const created = await alice.call('createMyCvWorkspace', vacancy);
    assert.equal(created.workspaceId, vacancy.clientRequestId);
    assert.match(created.folderName, /^Example Company - Financial Analyst - Dublin Ireland__/);
    const report = await alice.call('getMyCvWorkspaceReport', { workspaceId: created.workspaceId });
    assert.equal(report.stage, 'jd_review');
    assert.equal(report.tokenCounter.totalTokens, 0);
    assert.equal(report.artifacts.length, 1);
    assert.equal(report.artifacts[0].category, 'jd_input');
    const audit = await alice.call('readMyCvAuditArtifact', {
      workspaceId: created.workspaceId, artifactId: report.artifacts[0].id,
    });
    assert.equal(audit.category, 'jd_input');
    assert.match(audit.text, /Prepare financial forecasts/);
    await assert.rejects(bob.call('readMyCvAuditArtifact', {
      workspaceId: created.workspaceId, artifactId: report.artifacts[0].id,
    }), error => error.code === 'functions/not-found');

    const duplicate = await alice.call('createMyCvWorkspace', vacancy);
    assert.equal(duplicate.workspaceId, created.workspaceId);
    assert.equal((await alice.call('getMyCvWorkspaceReport',
      { workspaceId: created.workspaceId })).artifacts.length, 1);

    await assert.rejects(bob.call('getMyCvWorkspaceReport', {
      workspaceId: created.workspaceId,
    }), error => error.code === 'functions/not-found');
    await assert.rejects(alice.call('createMyCvWorkspace', {
      ...vacancy, uid: bob.auth.currentUser.uid,
    }), error => error.code === 'functions/invalid-argument');

  } finally {
    await Promise.all([deleteApp(alice.app), deleteApp(bob.app), deleteApp(visitor.app)]);
  }
});
