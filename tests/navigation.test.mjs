import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('navigation includes every agreed primary workspace section', () => {
  const nav = readFileSync(new URL('../src/navigation.ts', import.meta.url), 'utf8');
  for (const section of ['Dashboard','Discover Jobs','My Career','My Applications','CV Studio','Settings']) {
    assert.ok(nav.includes(section), `Missing navigation item: ${section}`);
  }
});

test('starter does not pretend to provide real authentication or uploading', () => {
  const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
  assert.ok(app.includes('not enabled yet'));
  assert.ok(app.includes('No account information or documents are being stored'));
});
