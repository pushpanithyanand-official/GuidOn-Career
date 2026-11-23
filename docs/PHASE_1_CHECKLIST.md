# Phase 1 — Registration, login and account lifecycle

Source of truth: [GuidOn Career Master Plan](GUIDON_CAREER_MASTER_PLAN.md) Phase 1, with the addendum's CV-first onboarding requirement.

## Implemented on the feature branch

- [x] Firebase Web SDK initialisation gated on new-project environment variables.
- [x] Email/password registration and sign-in.
- [x] Google sign-in with account selection (popup).
- [x] Password reset email request.
- [x] Persistent local sessions; auth-state listener and sign-out.
- [x] Verification email requested upon email registration; re-send control from workspace.
- [x] Private workspace is gated behind actual Firebase sign-in when configured; no local mock login.
- [x] Signed-in account details visible in Settings.
- [x] Development-only static workspace preview if Firebase is not configured.

## Firebase console setup — MUST use an independent project

1. Create a **new Firebase/GCP project for GuidOn Career**, distinct from Garamaal/Freshmaal and all existing live projects. Record project owner, environment, region and budget.
2. Register a Web app in this project; copy the web configuration values into an untracked local `.env.local` based on `.env.example`. Do not copy service-account keys into the frontend.
3. Enable **Authentication → Sign-in method → Email/Password**.
4. Enable **Authentication → Sign-in method → Google**, including any required project support email.
5. Review **Authentication → Settings → Authorized domains**. Add the dedicated dev/prod domains and `localhost` only for development when needed. New projects no longer automatically include localhost.
6. Run `npm install`, `npm run check`, `npm test`, `npm run build`, `npm run dev`. Test on a browser with popup permissions.
7. Install the *deny-all* Firestore and Storage rules before enabling any private data feature. Do not allow unauthorised client reads/writes, even when a user can authenticate.
8. Establish appropriate privacy notices, consent for account storage and account deletion/export plan before open beta or real CV processing.
9. Deploy only to this isolated project after credentials, rules, cost controls and rollback are reviewed.

## Mandatory interactive acceptance checks (not run yet)

- [ ] Person A creates an account with email/password, receives verification, can sign out and sign back in without repeating onboarding.
- [ ] Person B signs up separately via Google, and receives an independent Firebase Auth UID and account context.
- [ ] Each authenticated user sees only their own account details; navigating to the other user's account is not possible.
- [ ] An unauthenticated user cannot access the protected workspace; a page refresh preserves a valid session.
- [ ] Password reset sends instructions; invalid login, disabled accounts and popup failures show helpful errors.
- [ ] Email verification resend works and the verified status refreshes on a new login.
- [ ] Google sign-in is tested on representative mobile and desktop browsers; popup limitations are documented.
- [ ] After Firestore/Storage are introduced, emulator tests prove that A cannot read or write B's records/files, even when requesting documents directly.

## Limitations

Account registration and private sign-in require actual Firebase configuration. No independent project has been created or linked through this repository yet. The app does not persist a career profile, original CV, Answer Bank, or application history. All private Firestore and Storage access remains **denied** until user-scoped rules and emulator tests are implemented.

**Phase 1 is not complete** until the environment is connected and two-user acceptance tests pass.
