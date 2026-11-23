import { createContext, useContext, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import {
  createUserWithEmailAndPassword, GoogleAuthProvider, onAuthStateChanged,
  sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup,
  signOut, type User,
} from 'firebase/auth';
import { firebaseAuth, isFirebaseConfigured, isFirebaseAuthConfigured } from './firebase';
import { callGuidon, safeError, type WorkspaceOverview } from './api';

type Session = {
  user: User | null;
  workspace: WorkspaceOverview | null;
  configured: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const SessionContext = createContext<Session>({
  user: null, workspace: null, configured: false,
  refresh: async () => {}, logout: async () => {},
});
export function useSession() { return useContext(SessionContext); }

export function AuthBoundary({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [workspace, setWorkspace] = useState<WorkspaceOverview | null>(null);
  const [checking, setChecking] = useState(isFirebaseAuthConfigured);
  const [error, setError] = useState('');

  async function refresh() {
    if (!firebaseAuth?.currentUser) return;
    setError('');
    try { setWorkspace(await callGuidon<WorkspaceOverview>('getMyWorkspace')); }
    catch (cause) { setError(safeError(cause)); }
  }
  useEffect(() => {
    if (!firebaseAuth) return;
    const unsubscribe = onAuthStateChanged(firebaseAuth, async next => {
      setChecking(true);
      setUser(next); setWorkspace(null); setError('');
      if (next && isFirebaseConfigured) {
        try { setWorkspace(await callGuidon<WorkspaceOverview>('getMyWorkspace')); }
        catch (cause) { setError(safeError(cause)); }
      }
      setChecking(false);
    }, cause => { setError(safeError(cause)); setChecking(false); });
    return () => unsubscribe();
  }, []);
  const value: Session = {
    configured: isFirebaseConfigured, user, workspace, refresh,
    logout: async () => { if (firebaseAuth) await signOut(firebaseAuth); },
  };

  if (!isFirebaseAuthConfigured) {
    return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
  }
  if (checking) return <div className="login-stage"><div className="login-panel"><h1>GuidOn Career</h1><p>Checking your Firebase sign-in…</p></div></div>;
  if (!user) return <SignIn previewOnly={!isFirebaseConfigured} />;
  if (!isFirebaseConfigured) {
    return <SparkAuthPreview user={user} logout={value.logout}/>;
  }
  if (error || !workspace) {
    return <div className="login-stage"><div className="login-panel">
      <h1>Workspace connection</h1>
      <p role="alert">{error || 'Unable to load your private workspace.'}</p>
      <div className="login-actions"><button onClick={() => { setChecking(true); refresh().finally(() => setChecking(false)); }}>Retry</button>
        <button onClick={() => signOut(firebaseAuth!)}>Sign out</button></div>
    </div></div>;
  }
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

function SparkAuthPreview({ user, logout }: { user: User; logout: () => Promise<void> }) {
  const [error, setError] = useState('');
  return <div className="login-stage"><div className="login-panel">
    <div className="login-brand"><strong>GuidOn</strong><span>CAREER</span></div>
    <h1>Firebase sign-in verified</h1>
    <p role="status">Signed in as <strong>{user.email ?? user.displayName ?? 'Google user'}</strong>.</p>
    <div className="notice-panel">
      <strong>Spark authentication-only test</strong>
      <p>This session confirms that Firebase Authentication recognises your account.
        The private Career Intelligence Profile, job history, CV generation, Firestore writes
        and uploads are not enabled. Do not enter personal career information yet.</p>
    </div>
    {error && <p role="alert" className="form-error">{error}</p>}
    <button className="primary-action" onClick={() => logout().catch(cause => setError(safeError(cause)))}>
      Sign out
    </button>
    <p className="login-footnote">No career information has been saved by this test.</p>
  </div></div>;
}

function SignIn({ previewOnly }: { previewOnly: boolean }) {
  const [mode, setMode] = useState<'login'|'register'|'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!firebaseAuth) return;
    setBusy(true); setError(''); setNotice('');
    try {
      if (mode === 'reset') {
        await sendPasswordResetEmail(firebaseAuth, email.trim());
        setNotice('Password-reset instructions have been requested. Check your email.');
      } else if (mode === 'register') {
        await createUserWithEmailAndPassword(firebaseAuth, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(firebaseAuth, email.trim(), password);
      }
    } catch (cause) { setError(safeError(cause)); }
    finally { setBusy(false); }
  }
  async function google() {
    if (!firebaseAuth) return;
    setBusy(true); setError('');
    try { await signInWithPopup(firebaseAuth, new GoogleAuthProvider()); }
    catch (cause) { setError(safeError(cause)); }
    finally { setBusy(false); }
  }
  return <div className="login-stage">
    <div className="login-panel">
      <div className="login-brand"><strong>GuidOn</strong><span>CAREER</span></div>
      <h1>{mode === 'register' ? 'Create your private career workspace' : mode === 'reset' ? 'Reset your password' : 'Welcome back'}</h1>
      <p>{previewOnly
        ? 'Test Google and email sign-in on Spark. Private career data and job features are disabled in this test.'
        : 'Your professional profile, documents and applications are separate from other users.'}</p>
      <form onSubmit={submit}>
        <label htmlFor="sign-in-email">Email</label>
        <input id="sign-in-email" type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
        {mode !== 'reset' && <><label htmlFor="sign-in-password">Password</label>
          <input id="sign-in-password" type="password" minLength={6} required autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} /></>}
        {error && <p className="form-error" role="alert">{error}</p>}
        {notice && <p className="form-success" role="status">{notice}</p>}
        <button type="submit" className="primary-action" disabled={busy}>{mode === 'register' ? 'Create account' : mode === 'reset' ? 'Send reset email' : 'Sign in'}</button>
      </form>
      {mode !== 'reset' && <button className="google-action" onClick={google} disabled={busy}>Continue with Google</button>}
      <div className="login-switch">
        <button onClick={() => { setMode(mode === 'register' ? 'login' : 'register'); setError(''); }}>{mode === 'register' ? 'Already have an account? Sign in' : 'New here? Create account'}</button>
        <button onClick={() => { setMode(mode === 'reset' ? 'login' : 'reset'); setError(''); }}>{mode === 'reset' ? 'Back to sign in' : 'Forgot password?'}</button>
      </div>
      <p className="login-footnote">{previewOnly
        ? 'Authentication test only. No CV uploads, job records or other private backend services are active.'
        : 'Use only career information you are authorised to save in this private workspace.'}</p>
    </div>
  </div>;
}
