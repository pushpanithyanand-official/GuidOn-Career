import { useState, type FormEvent } from 'react';
import {
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import { ArrowRight, BriefcaseBusiness, ShieldCheck } from 'lucide-react';
import { auth } from './firebase';
import { readableAuthError } from './errorMessages';

type Mode = 'signin' | 'register' | 'reset';

export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  function changeMode(next: Mode) {
    setMode(next);
    setPassword('');
    setFeedback('');
    setError('');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth || busy) return;
    const current = auth;
    setBusy(true);
    setError('');
    setFeedback('');
    try {
      if (mode === 'reset') {
        await sendPasswordResetEmail(current, email.trim());
        // Keep this wording neutral even if email enumeration protection is enabled.
        setFeedback('If an account exists for that email, password reset instructions will be sent.');
      } else if (mode === 'register') {
        if (password.length < 8) {
          setError('Choose a password of at least eight characters.');
          return;
        }
        await setPersistence(current, browserLocalPersistence);
        const result = await createUserWithEmailAndPassword(current, email.trim(), password);
        try {
          await sendEmailVerification(result.user);
        } catch {
          // The account is created; verification can be requested again from the workspace.
          setFeedback('Your account was created. Email verification could not be sent yet.');
        }
      } else {
        await setPersistence(current, browserLocalPersistence);
        await signInWithEmailAndPassword(current, email.trim(), password);
      }
    } catch (reason) {
      setError(readableAuthError(reason));
    } finally {
      setBusy(false);
    }
  }

  async function signInGoogle() {
    if (!auth || busy) return;
    const current = auth;
    setBusy(true);
    setError('');
    setFeedback('');
    try {
      await setPersistence(current, browserLocalPersistence);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(current, provider);
    } catch (reason) {
      setError(readableAuthError(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-intro">
        <div className="auth-logo"><span>G<span>.</span></span><strong>GuidOn <em>CAREER</em></strong></div>
        <div className="auth-intro-copy">
          <div className="eyebrow">A MORE CONNECTED CAREER JOURNEY</div>
          <h1>Your next opportunity starts here.</h1>
          <p>One secure account. One evolving career profile. Relevant jobs and accurate, tailored applications — built around you.</p>
        </div>
        <div className="auth-note"><ShieldCheck size={18} /><span>Each account has its own private workspace. Application submission remains under your control.</span></div>
      </section>
      <section className="auth-form-side">
        <div className="auth-card">
          <div className="auth-icon"><BriefcaseBusiness size={25} /></div>
          <div className="eyebrow">{mode === 'register' ? 'CREATE YOUR ACCOUNT' : mode === 'reset' ? 'ACCOUNT RECOVERY' : 'WELCOME BACK'}</div>
          <h2>{mode === 'register' ? 'Create your account' : mode === 'reset' ? 'Reset your password' : 'Sign in to GuidOn'}</h2>
          <p className="auth-helper">{mode === 'register' ? 'Get ready for CV-first onboarding and your private career workspace.' : mode === 'reset' ? 'Enter your email and we’ll send password reset instructions when an account exists.' : 'Continue where you left off in your career journey.'}</p>
          <form onSubmit={submit} className="auth-form">
            <label htmlFor="auth-email">Email address</label>
            <input id="auth-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required disabled={busy} placeholder="you@example.com" />
            {mode !== 'reset' && <>
              <div className="auth-label-row"><label htmlFor="auth-password">Password</label>{mode === 'signin' && <button className="text-action" type="button" onClick={() => changeMode('reset')}>Forgot password?</button>}</div>
              <input id="auth-password" type="password" minLength={mode === 'register' ? 8 : undefined} autoComplete={mode === 'register' ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} required disabled={busy} placeholder={mode === 'register' ? 'At least 8 characters' : 'Your password'} />
            </>}
            {error && <p className="auth-feedback error" role="alert">{error}</p>}
            {feedback && <p className="auth-feedback success" role="status">{feedback}</p>}
            <button className="auth-submit" disabled={busy} type="submit">{busy ? 'Please wait…' : mode === 'register' ? 'Create account' : mode === 'reset' ? 'Send reset email' : 'Sign in'} <ArrowRight size={16}/></button>
          </form>
          {mode !== 'reset' && <>
            <div className="auth-divider"><span>or</span></div>
            <button className="google-signin" type="button" disabled={busy} onClick={signInGoogle}>Continue with Google</button>
          </>}
          <p className="auth-switch">
            {mode === 'register' ? <>Already have an account? <button type="button" onClick={() => changeMode('signin')}>Sign in</button></> :
             mode === 'reset' ? <button type="button" onClick={() => changeMode('signin')}>Back to sign in</button> :
             <>New to GuidOn? <button type="button" onClick={() => changeMode('register')}>Create an account</button></>}
          </p>
          <p className="auth-disclaimer">Development preview. Authentication is enabled only after connecting the dedicated GuidOn Firebase project. Do not enter sensitive profile information here.</p>
        </div>
      </section>
    </main>
  );
}
