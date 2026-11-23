import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFunctions, type Functions } from 'firebase/functions';

/** Public Firebase web keys only; never bundle service account or AI credentials. */
const env = import.meta.env;
const config = {
  apiKey: String(env.VITE_FIREBASE_API_KEY || ''),
  authDomain: String(env.VITE_FIREBASE_AUTH_DOMAIN || ''),
  projectId: String(env.VITE_FIREBASE_PROJECT_ID || ''),
  storageBucket: String(env.VITE_FIREBASE_STORAGE_BUCKET || ''),
  appId: String(env.VITE_FIREBASE_APP_ID || ''),
};
const required = [config.apiKey, config.authDomain, config.projectId, config.appId];
// Hosting can publish a static preview before authenticated backend release.
export const isFirebaseConfigured =
  required.every(Boolean) && env.VITE_GUIDON_CORE_ENABLED === 'true';

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let functions: Functions | null = null;

if (isFirebaseConfigured) {
  app = getApps()[0] ?? initializeApp(config);
  auth = getAuth(app);
  functions = getFunctions(app, 'europe-west1');
  // The emulators are opt-in and must never be compiled into a production build.
  if (env.DEV && env.VITE_USE_FIREBASE_EMULATORS === 'true') {
    const { connectAuthEmulator } = await import('firebase/auth');
    const { connectFunctionsEmulator } = await import('firebase/functions');
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  }
}
export { app as firebaseApp, auth as firebaseAuth, functions as firebaseFunctions };
