import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

const firebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY?.trim(),
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim(),
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim(),
  appId: import.meta.env.VITE_FIREBASE_APP_ID?.trim(),
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim(),
};

export const isFirebaseConfigured = Boolean(
  firebaseOptions.apiKey &&
  firebaseOptions.authDomain &&
  firebaseOptions.projectId &&
  firebaseOptions.appId,
);

// Do not create a live auth instance in an unconfigured local preview.
// Public web-app configuration is not a privileged backend credential.
export const auth: Auth | null = isFirebaseConfigured
  ? getAuth(getApps().length ? getApp() : initializeApp(firebaseOptions))
  : null;
