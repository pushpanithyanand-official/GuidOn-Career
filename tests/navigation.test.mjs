import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function src(path){
  return readFileSync(new URL('../src/'+path,import.meta.url),'utf8');
}
test('all core workspace pages remain navigable for the future UI designer',()=>{
  const nav=src('navigation.ts');
  for(const title of ['Dashboard','Discover Jobs','My Career','My Applications','CV Studio','Settings']){
    assert.ok(nav.includes(title),'Missing '+title);
  }
  const shell=src('App.tsx');
  for(const component of ['DashboardPage','CareerPage','JobsPage','CvStudioPage','ApplicationsPage']){
    assert.ok(shell.includes('<'+component),'Missing real page '+component);
  }
});
test('unconfigured website remains a clearly labelled preview and refuses personal uploads',()=>{
  const shell=src('App.tsx');
  assert.ok(shell.includes('not enabled yet'));
  assert.ok(shell.includes('No account information or documents are being stored'));
  const firebase=src('firebase.ts');
  assert.match(firebase,/VITE_GUIDON_CORE_ENABLED/);
  assert.match(firebase,/isFirebaseConfigured/);
});
test('authentication is based on Firebase session, not caller-provided UID',()=>{
  const auth=src('auth.tsx');
  for(const feature of ['onAuthStateChanged','signInWithPopup','createUserWithEmailAndPassword',
    'sendPasswordResetEmail','getMyWorkspace','signOut']){
    assert.ok(auth.includes(feature),'Missing '+feature);
  }
  const main=src('main.tsx');
  assert.ok(main.includes('<AuthBoundary>'));
});
test('job applications require user confirmation; generation remains gated',()=>{
  const jobs=src('JobsPage.tsx');
  assert.ok(jobs.includes('createMyApplication'));
  assert.ok(jobs.includes('window.confirm'));
  assert.ok(jobs.includes('getMyJobDetails'));
  const studio=src('CvStudioPage.tsx');
  assert.ok(studio.includes('confirmMyJdReview'));
  assert.ok(studio.includes('Generate, score and approve will be enabled only'));
  assert.equal(studio.includes('automatically click Submit'),false);
  const apps=src('ApplicationsPage.tsx');
  assert.ok(apps.includes('getMyApplicationTimeline'));
  assert.ok(apps.includes('userConfirmed:true'));
});
