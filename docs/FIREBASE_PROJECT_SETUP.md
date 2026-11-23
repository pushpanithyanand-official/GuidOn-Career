# GuidOn Career — User-provided Firebase and Google Cloud Project Bindings

**Recorded:** 23 November 2026
**Status:** Project identifiers supplied by the project owner. **The console projects have not been directly inspected/authenticated in this chat.** Do not infer roles, billing, enabled services or a live Hosting deployment from a link.

## Project identities (do not merge)

| Purpose | Supplied console project ID | Supplied project page | Chosen current use |
| --- | --- | --- | --- |
| Firebase application services | **`guidon-career-fcda2`** | https://console.firebase.google.com/project/guidon-career-fcda2/overview | GuidOn Hosting, Firebase Auth, owner-private Firestore, Firebase Storage and callable Functions once provisioned |
| Google Cloud platform | **`guidon-career`** | https://console.cloud.google.com/home/dashboard?project=guidon-career | Possible future Cloud Run CV/AI worker project, subject to separately checked IAM/billing and safe cross-project service authentication |

**Important:** A Firebase project's underlying Google Cloud project has the **same exact project ID**. `guidon-career` and `guidon-career-fcda2` are **different Google Cloud projects**, despite related display names. The Firebase project's GCP console URL is https://console.cloud.google.com/home/dashboard?project=guidon-career-fcda2 . Verify access there before deployment.

Firebase project identity reference: https://firebase.google.com/docs/projects/learn-more
Default Hosting sites: https://firebase.google.com/docs/hosting/default-site

## Proposed canonical website

Default Hosting site (once created and deployed): **`https://guidon-career-fcda2.web.app`**.

That is the official naming pattern for a Firebase project's *default* Hosting site, but **not a validated active URL**. The site must be provisioned in the correct Firebase project, then deployed and checked. An additional Hosting site has its own independent site ID and may use another `*.web.app` name.

This origin becomes the single browser/PWA entrypoint and a home for the optional desktop Chrome extension download/handoff. A PWA **does not** provide the extension's arbitrary employer/ATS page DOM access. The independent Chrome extension and optional native Android browser use authenticated, owner-scoped APIs and the same user-owned profile/jobs/CV/application IDs.

## Already prepared in GitHub (draft PR #1)

- `.firebaserc`: named preview alias `guidon-preview` resolves to `guidon-career-fcda2`; intentionally no silently chosen `default` Firebase project.
- `firebase.json`: Hosting points at `dist` and uses SPA rewrites; Firestore/Storage client rules remain deny-all.
- `.env.example`: public Firebase Web SDK config and `VITE_GUIDON_CORE_ENABLED=false` until release.
- `src/firebase.ts`: browser identity and callable Functions client; uses `europe-west1` callable region, same as backend.
- `src/auth.tsx`: email/password, Google OAuth popup, reset and signed-in account shell.
- `src/CareerPage.tsx`, `src/JobsPage.tsx`, `src/CvStudioPage.tsx`, `src/ApplicationsPage.tsx`: functional preliminary signed-in pages calling owner-scoped backend APIs; final UI redesign remains under the designer's control.
- `.github/workflows/deploy-hosting.yml`: **manual/protected**, main branch only, OIDC identity, exact `guidon-career-fcda2` and public Firebase config check, Hosting only.
- `.github/workflows/deploy-core-backend.yml`: separately **manual/protected**, main branch only, OIDC identity, exact `guidon-career-fcda2` and Functions only. Does not relax rules or permit document uploads.

## Required owner-side prerequisites before any live deployment

1. In [Firebase project](https://console.firebase.google.com/project/guidon-career-fcda2/overview), confirm the project ID in Project settings. Confirm ownership, billing/quotas and use of this *independent* environment. **Do not** select `guidon-career` in its place.
2. Under **Project settings → Your apps**, register a Web App (if not registered) and copy its **public Web SDK values**. `apiKey` and `appId` are client identifiers, **not service-account credentials**. Never copy OAuth private keys or service-account JSON into GitHub code or public Vite variables.
3. Under **Authentication → Sign-in method**, enable Email/Password and Google as desired. Check authorised domains, approved OAuth consent setup and password recovery.
4. Under **Firestore Database**, create the production database in the agreed EU location and verify native mode. Firestore client rules initially remain deny-all, with all private writes made by authenticated callable Functions and Admin SDK.
5. Under **Storage**, create the bucket only after access and retention planning. Client rules must remain deny-all until malware scanning, upload ownership, quotas and deletions are implemented and independently reviewed. Base-CV upload is presently **disabled**.
6. Under **Hosting**, create the correct default Hosting site `guidon-career-fcda2`. Verify that the expected `*.web.app` domain is available under this project; do not assume it already resolves.
7. In GitHub repository settings, create the protected environments `guidon-hosting-preview` and `guidon-backend-release`, each with required reviewers. Configure least-privilege Google Workload Identity Federation (OIDC) for this repository/branch/environment and a deployment service account authorised specifically in `guidon-career-fcda2`.
8. Set environment/repository variables: `GUIDON_FIREBASE_PROJECT_ID=guidon-career-fcda2`, `GUIDON_GCP_WIF_PROVIDER`, `GUIDON_GCP_DEPLOY_SERVICE_ACCOUNT`, `GUIDON_FIREBASE_WEB_API_KEY`, `GUIDON_FIREBASE_WEB_APP_ID`, `GUIDON_FIREBASE_AUTH_DOMAIN`, optional `GUIDON_FIREBASE_STORAGE_BUCKET`, and **`GUIDON_CORE_ENABLED=false`** initially.
9. After PR security review and merge, manually run the **Functions-only** workflow and validate new user registration, callable account bootstrap, same-user persistence and cross-user isolation in the *actual Firebase project*. This requires approved project/billing/IAM access.
10. Once the backend passes its live smoke tests, set `GUIDON_CORE_ENABLED=true` and manually run the **Hosting-only** workflow. Verify the actual live URL, HTTPS, SPA deep links, mobile install and real two-account behavior. Record the deployment commit and rollback point.

The Hosting workflow cannot set up IAM, enable Firebase Auth providers, create Firestore databases or mint cloud service-account credentials automatically.

## Cloud Run worker project decision

The separately supplied GCP project `guidon-career` can be reserved for compute-heavy CV rendering/AI workers *only after*:
- its ownership and region/billing are confirmed;
- cross-project access is restricted to a dedicated service principal with minimum private Storage/Firestore permissions in `guidon-career-fcda2`;
- workers avoid receiving broad end-user Firebase tokens and must verify job ownership through server-side trusted claims;
- generated DOCX/PDF files pass the exact one-page, no-tables, STAR/keyword/source/QA gates;
- budgets, queueing, retries, export and deletion are audited.

Until these checks are met, **do not point the front end or Firebase Admin SDK at `guidon-career` by accident**.

## Launch status and explicit exclusions

- **Project IDs are known**, but project settings, secrets, billing and deployment identities are not visible/verified in this session.
- **No live release has been made**; the default `*.web.app` URL is a target, not a verified link.
- Gmail alert imports, mailbox access, interview automation, Calendar writes, paid AI calls, base CV uploads and cross-page automatic application actions are **not activated**.
- Nothing has been migrated from the legacy Garamaal or TaxLink systems or their private production datasets.


## Web App registration update — confirmed from owner-supplied Firebase SDK snippet

**Registered Web App:** the owner has now provided complete public browser SDK configuration for Firebase project `guidon-career-fcda2`, project number `752868294981`, Web App ID ending `cbd6fe2c`, and default Auth domain `guidon-career-fcda2.firebaseapp.com`.

- Public client configuration is now checked into `src/firebase-web-config.ts`, including the optional measurement ID. The app reads it via `src/firebase.ts`. **Analytics is not automatically initialised.**
- The Hosting build no longer requires manually re-entering Web App `apiKey`, `authDomain`, `appId` or storage bucket as GitHub variables. Those are browser-visible Firebase client identifiers, not server secrets.
- The Hosting workflow still requires an approved, least-privilege **Google OIDC deployment identity**, project variable and a protected GitHub environment. It **forces `VITE_GUIDON_CORE_ENABLED=false` on Spark**; registering the Web App does not make Cloud Functions available.
- **Next owner-side task:** Firebase Console → **Authentication** → **Get started** → **Sign-in method**, enable **Google** and **Email/Password**. Check the required authorized domains for the intended `web.app` origin and OAuth settings.
- Then set up **standard Firebase Hosting**, not App Hosting, and confirm the default Hosting site. Firestore remains deny-all; **do not choose test-mode/open security rules** for personal profiles.
- Do not attempt to enable current authenticated backend pages simply by setting the frontend flag to true. Existing `getMyWorkspace` and other APIs depend on Functions, which are not deployed on the Spark plan. A dedicated, reviewed Spark-compatible access architecture or later Blaze upgrade is still required.

The exact `https://guidon-career-fcda2.web.app` website remains **unverified** until an authorised Hosting deployment succeeds.
