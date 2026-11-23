/**
 * Firebase Web App client identifiers supplied by the GuidOn project owner.
 *
 * Firebase web apiKey/appId/authDomain/projectId are public browser configuration,
 * NOT Google Cloud service-account credentials. Firebase Auth, callable ownership
 * checks, and Firestore/Storage rules provide access control.
 *
 * Registering this configuration does NOT enable Firebase Functions on Spark.
 * Do not store private keys, Gmail tokens or AI-provider secrets here.
 */
export const guidonFirebaseWebConfig = {
  apiKey: 'AIzaSyDm6psCUWBPFVrX11lcgE5AdgntxmZw7Is',
  authDomain: 'guidon-career-fcda2.firebaseapp.com',
  projectId: 'guidon-career-fcda2',
  storageBucket: 'guidon-career-fcda2.firebasestorage.app',
  messagingSenderId: '752868294981',
  appId: '1:752868294981:web:1d58d1f90348e9cbd6fe2c',
  measurementId: 'G-RQ7LLY8FG6',
} as const;
