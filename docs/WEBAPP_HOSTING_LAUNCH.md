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


## Update: owner-supplied Firebase project and functional core scaffold

The owner has now supplied Firebase project ID **`guidon-career-fcda2`** and a **different** GCP project ID `guidon-career`. Earlier text describing a still-unknown independent Firebase project should be read as *project ownership and service configuration remain unverified*, not that the ID is unknown. The deploy workflows are now restricted to the exact Firebase ID. See [the concrete setup guide](FIREBASE_PROJECT_SETUP.md).

There is now a signed-in core React scaffold and callable application model, but the website is intentionally feature-gated until the real Firebase Web App SDK values, sign-in providers, Firestore, Functions deployment and two-account smoke checks are verified. The protected Hosting workflow defaults to `VITE_GUIDON_CORE_ENABLED=false`. **No live default Hosting URL has been verified.**


## Verified client configuration, unverified hosting release

The owner supplied the full Firebase JS Web App `firebaseConfig` on 23 November 2026. It has been connected in the repository as public client configuration at `src/firebase-web-config.ts` and referenced from `src/firebase.ts`. This step is complete and does **not** require pasting those same public values again in GitHub repository variables.

The **site has not been deployed or verified**, Google/email Auth providers may still need enabling, and the Spark plan does not support the existing Firebase Functions deployment workflow. The protected Hosting-only workflow now explicitly builds **preview mode only** with `VITE_GUIDON_CORE_ENABLED=false`.

Next console step is **Authentication → Sign-in method → Google / Email/Password**, followed by standard Hosting configuration, with private user data and callable functions still gated. See [project setup](FIREBASE_PROJECT_SETUP.md).


## Owner-run Cloud Shell deployment — Hosting site now provisioned

**New verified console state (23 November 2026):** The owner has created standard Firebase Hosting's default site in `guidon-career-fcda2`. The Firebase Console now lists `guidon-career-fcda2.web.app` and `guidon-career-fcda2.firebaseapp.com`, with the notice **“Waiting for your first release.”** Email/Password and Google sign-in providers are shown enabled in the owner's console. **No first website release is deployed yet.**

The currently approved GitHub workflow still requires a protected OIDC deploy identity and main-branch review. For a simpler one-time **owner-authorized static preview** on Spark, the development branch contains `scripts/deploy-spark-preview.sh`. This pathway uses the owner's Cloud Shell Firebase login, targets the exact project, and forcibly disables the Functions-dependent private workspace.

From the **Google Cloud Shell** terminal, opened under the owner's Google account:

```bash
git clone --depth 1 --branch feat/backend-foundation --single-branch \
  https://github.com/pushpanithyanand-official/GuidOn-Career.git guidon-spark-preview
cd guidon-spark-preview
npx --yes firebase-tools@15.0.0 login --no-localhost
bash scripts/deploy-spark-preview.sh DEPLOY_GUIDON_STATIC_PREVIEW
```

**Cautions:**
- Authentication is interactive and must be completed by the owner. The CLI may already be logged in, in which case the login command can be skipped. Never send credential tokens to this chat.
- The script performs `npm ci` (or `npm install` if no lockfile), typecheck, frontend tests, Vite build and **only** `firebase deploy --only hosting --project guidon-career-fcda2`.
- It does **not** initialise a new Firebase project, deploy Functions, change database/storage security rules, request Gmail permissions, enable private CV uploads or alter a separate `guidon-career` Cloud project.
- This is a **public static preview** at a permanent Hosting site, not a functional end-to-end authenticated GuidOn release. Do not enter candidate personal information into a placeholder or expect accounts/CVs to be stored.
- After deploying, visit `https://guidon-career-fcda2.web.app` and confirm the preview, HTTPS and navigation. The Firebase Console's Previous releases list should show the new Hosting release.
- If the owner wants to retain mandatory GitHub-environment reviewers for all future deploys, use the existing protected workflow after configuring OIDC rather than this manual preview route. The final production rollout should use the protected pipeline.

The full private application is **still blocked** on a safe Spark-compatible data-access implementation or a later approved Blaze Functions deployment, in addition to secure CV extraction, document output, privacy and two-user live tests.
