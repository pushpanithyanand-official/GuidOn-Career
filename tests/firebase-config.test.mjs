import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

function source(path) {
  return readFileSync(new URL('../' + path, import.meta.url), 'utf8');
}

test('GuidOn browser SDK is bound to the owner-registered Firebase Web App', () => {
  const config = source('src/firebase-web-config.ts');
  assert.match(config, /projectId:\s*'guidon-career-fcda2'/);
  assert.match(config, /authDomain:\s*'guidon-career-fcda2\.firebaseapp\.com'/);
  assert.match(config, /storageBucket:\s*'guidon-career-fcda2\.firebasestorage\.app'/);
  assert.match(config, /messagingSenderId:\s*'752868294981'/);
  assert.match(config, /appId:\s*'1:752868294981:web:1d58d1f90348e9cbd6fe2c'/);
  assert.match(config, /measurementId:\s*'G-RQ7LLY8FG6'/);
  assert.match(config, /apiKey:\s*'AIza[\w-]+'/);
  assert.doesNotMatch(config, /private_key|client_secret|refresh_token/i);
});

test('public Web SDK configuration never silently activates undeployed private APIs', () => {
  const sdk = source('src/firebase.ts');
  assert.match(sdk, /guidonFirebaseWebConfig/);
  assert.match(sdk, /correctProject\s*&&\s*required\.every\(Boolean\)\s*&&\s*env\.VITE_GUIDON_CORE_ENABLED === 'true'/);
  assert.match(sdk, /getFunctions\(app, 'europe-west1'\)/);
  const hosting = source('.github/workflows/deploy-hosting.yml');
  assert.match(hosting, /VITE_GUIDON_CORE_ENABLED: 'false'/);
  assert.match(hosting, /guidon-career-fcda2/);
  assert.match(hosting, /deploy --only hosting/);
  assert.doesNotMatch(hosting, /deploy --only functions/);
});

test('Spark Auth smoke test cannot activate Cloud Functions or career data', () => {
  const sdk = source('src/firebase.ts');
  assert.match(sdk, /VITE_GUIDON_AUTH_PREVIEW_ENABLED === 'true'/);
  assert.match(sdk, /if \(isFirebaseConfigured\) functions = getFunctions/);
  const auth = source('src/auth.tsx');
  assert.match(auth, /if \(next && isFirebaseConfigured\)/);
  assert.match(auth, /SparkAuthPreview/);
  assert.match(auth, /No career information has been saved by this test/);
  const script = source('scripts/deploy-spark-preview.sh');
  assert.match(script, /VITE_GUIDON_CORE_ENABLED=false/);
  assert.match(script, /VITE_GUIDON_AUTH_PREVIEW_ENABLED/);
});
