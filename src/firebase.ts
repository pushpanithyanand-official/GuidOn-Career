import { guidonFirebaseWebConfig } from './firebase-web-config';
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFunctions, type Functions } from 'firebase/functions';

/**
 * Web App client identifiers have been registered by the project owner and
 * checked in as public browser configuration. Optional local overrides are
 * allowed only when they target this exact Firebase project.
 */
const env = import.meta.env;
const config = {
  ...guidonFirebaseWebConfig,
  apiKey: String(env.VITE_FIREBASE_API_KEY || guidonFirebaseWebConfig.apiKey),
  authDomain: String(env.VITE_FIREBASE_AUTH_DOMAIN || guidonFirebaseWebConfig.authDomain),
  projectId: String(env.VITE_FIREBASE_PROJECT_ID || guidonFirebaseWebConfig.projectId),
  storageBucket: String(env.VITE_FIREBASE_STORAGE_BUCKET || guidonFirebaseWebConfig.storageBucket),
  appId: String(env.VITE_FIREBASE_APP_ID || guidonFirebaseWebConfig.appId),
};
const correctProject =
  config.projectId === guidonFirebaseWebConfig.projectId &&
  config.appId === guidonFirebaseWebConfig.appId &&
  config.authDomain === guidonFirebaseWebConfig.authDomain;
const required = [config.apiKey, config.authDomain, config.projectId, config.appId];
// Web SDK configuration is complete; live private APIs remain explicitly gated.
// Spark Firebase cannot deploy the project's current Cloud Functions backend.
export const isFirebaseConfigured =
  correctProject && required.every(Boolean) && env.VITE_GUIDON_CORE_ENABLED === 'true';
// Spark can verify Firebase Auth without calling undeployed Cloud Functions.
// No private records or document uploads are enabled by this flag.
export const isFirebaseAuthConfigured =
  correctProject && required.every(Boolean) &&
  (isFirebaseConfigured || env.VITE_GUIDON_AUTH_PREVIEW_ENABLED === 'true');

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let functions: Functions | null = null;

if (isFirebaseAuthConfigured) {
  app = getApps()[0] ?? initializeApp(config);
  auth = getAuth(app);
  if (isFirebaseConfigured) functions = getFunctions(app, 'europe-west1');
  // The emulators are opt-in and must never be compiled into a production build.
  if (env.DEV && env.VITE_USE_FIREBASE_EMULATORS === 'true') {
    const { connectAuthEmulator } = await import('firebase/auth');
    const { connectFunctionsEmulator } = await import('firebase/functions');
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    if (functions) connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  }
}
export { app as firebaseApp, auth as firebaseAuth, functions as firebaseFunctions };
