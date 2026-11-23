import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = path => readFileSync(new URL(path, import.meta.url), 'utf8');

test('app startup is guarded by Firebase auth state', () => {
  const main = source('../src/main.tsx');
  const gate = source('../src/auth/AuthGate.tsx');
  assert.match(main, /<AuthGate \/>/);
  assert.match(gate, /onAuthStateChanged\(/);
  assert.match(gate, /if \(!user\)/);
  assert.match(gate, /<App user=\{user\}/);
});

test('authentication screen covers required account lifecycle actions', () => {
  const screen = source('../src/auth/AuthScreen.tsx');
  for (const name of [
    'createUserWithEmailAndPassword', 'signInWithEmailAndPassword',
    'sendPasswordResetEmail', 'signInWithPopup', 'sendEmailVerification',
    'browserLocalPersistence', 'setPersistence',
  ]) assert.ok(screen.includes(name), `Missing auth action: ${name}`);
});

test('Firestore and Storage remain deny-by-default', () => {
  for (const path of ['../firestore.rules', '../storage.rules']) {
    assert.match(source(path), /allow read, write: if false;/);
  }
});

test('Firebase credentials are loaded from env, not hardcoded app keys', () => {
  const setup = source('../src/auth/firebase.ts');
  assert.match(setup, /import\.meta\.env\.VITE_FIREBASE_API_KEY/);
  assert.match(setup, /isFirebaseConfigured/);
  assert.doesNotMatch(setup, /AIza[0-9A-Za-z_-]{30,}/);
});
