import { FirebaseError } from 'firebase/app';

const knownErrors: Record<string, string> = {
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/invalid-credential': 'Email or password is incorrect.',
  'auth/wrong-password': 'Email or password is incorrect.',
  'auth/user-disabled': 'This account has been disabled. Please contact support.',
  'auth/email-already-in-use': 'An account using this email already exists. Try signing in.',
  'auth/weak-password': 'Choose a stronger password with at least six characters.',
  'auth/too-many-requests': 'Too many attempts. Please try again later.',
  'auth/network-request-failed': 'Network connection failed. Please check your connection and retry.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled for this Firebase project.',
  'auth/unauthorized-domain': 'This website is not on the project’s authorised sign-in domains.',
  'auth/popup-closed-by-user': 'Google sign-in was cancelled.',
  'auth/popup-blocked': 'Allow popups for this site and try Google sign-in again.',
  'auth/account-exists-with-different-credential': 'An account already exists with a different sign-in method.',
  'auth/requires-recent-login': 'For security, sign out and sign in again before continuing.',
};

export function readableAuthError(error: unknown): string {
  if (error instanceof FirebaseError) {
    return knownErrors[error.code] ?? 'Authentication failed. Please try again or contact support.';
  }
  return 'Something went wrong. Please try again.';
}
