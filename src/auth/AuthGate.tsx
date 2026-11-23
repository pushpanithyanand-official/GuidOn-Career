import { useEffect, useState } from 'react';
import { onAuthStateChanged, sendEmailVerification, signOut, type User } from 'firebase/auth';
import App from '../App';
import AuthScreen from './AuthScreen';
import { auth, isFirebaseConfigured } from './firebase';
import { readableAuthError } from './errorMessages';

export default function AuthGate() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [preview, setPreview] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, nextUser => {
      setUser(nextUser);
      setError('');
    }, reason => {
      setUser(null);
      setError(readableAuthError(reason));
    });
  }, []);

  if (!isFirebaseConfigured) {
    return preview
      ? <App />
      : <main className="configuration-screen">
          <div className="configuration-card">
            <span className="eyebrow">GUIDON CAREER · PHASE 1</span>
            <h1>Authentication is not configured</h1>
            <p>Connect a new, independent Firebase project to enable actual registration and sign-in. This preview does not store personal information.</p>
            <button onClick={() => setPreview(true)} className="primary-action">View static workspace preview</button>
          </div>
        </main>;
  }

  if (user === undefined) {
    return <main className="configuration-screen" role="status"><p>Checking your secure session…</p></main>;
  }

  if (!user) {
    return <>{error && <div className="session-error" role="alert">{error}</div>}<AuthScreen /></>;
  }

  async function handleSignOut() {
    if (!auth) return;
    try {
      await signOut(auth);
      setMessage('');
    } catch (reason) {
      setError(readableAuthError(reason));
    }
  }

  async function resendVerification() {
    if (!auth?.currentUser) return;
    try {
      await sendEmailVerification(auth.currentUser);
      setMessage('Verification email sent. Check your inbox.');
      setError('');
    } catch (reason) {
      setError(readableAuthError(reason));
    }
  }

  return <>
    {!user.emailVerified && <div className="verification-banner" role="status">
      <span>Your email is not yet verified. Please verify it before uploading CVs when that feature becomes available.</span>
      <button onClick={resendVerification}>Resend verification</button>
    </div>}
    {message && <div className="session-notice" role="status">{message}</div>}
    {error && <div className="session-error" role="alert">{error}</div>}
    <App user={user} onSignOut={handleSignOut} />
  </>;
}
