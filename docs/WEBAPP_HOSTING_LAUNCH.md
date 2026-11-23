# GuidOn Career — Firebase web.app and Universal Web Link Setup

**Status:** Hosting configuration and a restricted manual deployment workflow are committed. **No live GuidOn Firebase Hosting URL is verified.** This document does not claim a deployment.

## Desired product entrypoint

Use one HTTPS website as the canonical origin for desktop, mobile browser and installable PWA. Firebase Hosting assigns an actual `https://<site-id>.web.app` address after a new project/site is created. The URL should only be publicly announced after a successful deploy and independent desktop/mobile verification.

The website's core journey must work without an extension. The **desktop Chrome extension** can be offered as an optional verified install link once available, and it will share the same user profile, job records, CV versions and application history via authenticated APIs. A normal mobile PWA cannot read external ATS DOM or fill arbitrary browser forms.

## Pre-deployment checklist

1. Have the project owner create a **new independent** Firebase/Google Cloud project for GuidOn Career. Do not use the legacy CV automation or any other platform's Firebase project.
2. Choose region, separate development/production account, Firebase Authentication, Cloud billing and budget alert thresholds; confirm project ownership and least privilege.
3. Enable Hosting in the new project. Choose and record the **actual** site ID; never assume it exists from a string in a README.
4. Configure a GitHub OIDC Workload Identity Federation provider with trust restricted to this repository, intended branch/environment and deploy service account. Limit that account to Hosting deployment permissions.
5. Set GitHub environment `guidon-hosting-preview` with required reviewer(s), and its variables:
   - `GUIDON_FIREBASE_PROJECT_ID`: the exact new Firebase project ID.
   - `GUIDON_GCP_WIF_PROVIDER`: Workload Identity Provider resource path.
   - `GUIDON_GCP_DEPLOY_SERVICE_ACCOUNT`: least-privilege deploy principal.
6. Review/merge PR #1 **only after appropriate code and security review**. A merge does not automatically publish the website.
7. Manually run GitHub workflow `Deploy static GuidOn website to Firebase Hosting (manual)` on `main`, with confirmation `DEPLOY_SAFE_STATIC_PREVIEW`. It deploys **Hosting only**; it does not deploy backend functions, Firestore rules or storage permissions.
8. Verify the Firebase Console's assigned `*.web.app` URL, deep links (`/discover`, `/career`, `/applications`, `/cv-studio`), HTTPS, webmanifest/icons, and that the website visibly identifies unavailable features as previews.
9. Test desktop Chrome and compatible Android Chrome installation and re-opening from home screen. Confirm that installed PWA and website use the same web origin; do **not** claim that installing the PWA installs the Chrome extension or native Android Career Browser.
10. Record the actual URL, Hosting release identifier, reviewer, CI run, rollback steps and any failed checks in this document before marking Phase 0 hosting acceptance complete.

## Hosting and safety configuration

- `firebase.json`: Vite `dist` as Hosting public output, SPA rewrites to `index.html`, security-oriented headers and manifest response headers.
- `public/manifest.webmanifest`: installable display metadata and icons.
- `scripts/generate-pwa-icons.mjs`: temporary deterministic icon assets generated during development/build; the designer may replace them later.
- `.github/workflows/deploy-hosting.yml`: manually triggered, `main` only, GitHub environment review, Google OIDC identity, Hosting-only deployment and explicit confirmation.
- `firestore.rules` and `storage.rules`: remain deny-all. Nothing about the static website deploy enables CV uploads, authentication UI or user data storage.
- `.env.example`: documents future Firebase web client config; real deploy still needs cloud project and authorised user-facing integration.
- All current screens remain a labelled nonfunctional preview. Do not ask real users to upload personal documents until the backend has privacy/security release approval.

## Universal-link behavior and extension handoff

The same base website link is the public entrypoint on desktop and mobile:
- `/discover`: job list
- `/career`: Career Intelligence Profile
- `/cv-studio`: staged CV workflow
- `/applications`: personal application tracker
- Optional future deep links: `/jobs/<id>`, `/cv-studio/<workspace-id>`, `/applications/<application-id>`. All private links will require login, owner validation and access checks.

Future website-to-extension handoff must use supported Chrome installation and signed-in job/CV references. Do not embed privileged Firebase credentials, CV content, or reusable bearer tokens in URL query strings.

## Rollback

If the static release misbehaves, the authorised project owner reverts/redeploys the previous known-good Hosting release from Firebase Console (or redeploys the reviewed prior commit using the same manual workflow). Revoke deploy identities if compromised. Rollback of static Hosting does not imply restoration of private database contents; database changes are not performed by the Hosting-only workflow.

**Current blocking dependency:** No independently owned GuidOn Firebase project, OIDC identity or verified live Hosting URL is connected to this chat. A `web.app` link must not be invented.
