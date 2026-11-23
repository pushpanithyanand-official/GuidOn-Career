import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const script = readFileSync(new URL('../scripts/deploy-spark-preview.sh', import.meta.url), 'utf8');

test('owner-run Hosting preview targets exact Firebase project and never deploys backends', () => {
  assert.match(script, /PROJECT_ID="guidon-career-fcda2"/);
  assert.match(script, /EXPECTED_CONFIRMATION="DEPLOY_GUIDON_STATIC_PREVIEW"/);
  assert.match(script, /export VITE_GUIDON_CORE_ENABLED=false/);
  assert.match(script, /npm run check/);
  assert.match(script, /npm test/);
  assert.match(script, /npm run build/);
  assert.match(script, /deploy --only hosting/);
  assert.doesNotMatch(script, /deploy --only (?:functions|firestore|storage)/);
  assert.match(script, /--project "\$PROJECT_ID"/);
});
