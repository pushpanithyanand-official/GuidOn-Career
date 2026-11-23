# GuidOn Career

Independent, multi-user career platform developed according to [the preserved master plan](docs/GUIDON_CAREER_MASTER_PLAN.md), including the additive v1.1 requirements.

## Phase 0 — application foundation

This starter provides the responsive application shell, named navigation routes/views, and clearly labelled future-feature placeholders. **It does not yet provide authentication, real profile storage, CV generation, browser autofill or live job listings.** Never enter real personal details into a placeholder page.

### Local development

Requirements: Node.js 20.19+ and npm.

```bash
npm install
cp .env.example .env.local
npm run dev
npm run check
npm run build
npm test
```

The `.env.local` file is deliberately unconfigured until an **independent** Firebase project is provisioned. The static shell runs without Firebase.

### Deployment

Do not deploy to an existing Garamaal/Freshmaal Firebase project. Create a dedicated Firebase project, choose separate development/production environments, enable billing alerts and least-privilege access, and establish privacy/security rules before storing personal data. Once configured and reviewed, run `npm run build` and deploy the `dist/` directory to that *new* Firebase Hosting site. No automatic deployment is configured yet.

### Planned implementation order

Phase 0: shell, tooling, isolated hosting, rules/operational baseline.
Phase 1: authentication (Google/email), private accounts and routing.
Phase 2: CV-first upload → consent → extraction → review → verified Career Intelligence Profile, with manual fallback and original-format retention.
Phase 3: personal dashboard and PWA installability; Releases B/C subsequently add discovery, analysis, tailored CVs and application status tracking. Chrome extension and enhanced native Android Career Browser are future optional companions.

## Security baseline

- No real user data or uploaded CVs in the starter application.
- Do not commit `.env` files, credentials, API keys with privileged rights, or service-account keys.
- Enforce user ownership server-side and with Firebase Rules when introducing Firestore/Storage; do not rely on client filters.
- Require explicit user initiation for paid AI. Preserve original CV separately from verified profile facts and formatting reference.
- External applications and final submissions always remain user-controlled.

See [Phase 0 checklist](docs/PHASE_0_CHECKLIST.md).


## Backend-first development track

GuidOn Career now prioritises **services, private multi-user data, APIs, CV storage/extraction architecture and end-to-end reliability**. The current React shell is temporary; the UI/UX designer can replace it without changing the backend.

The backend lives under `functions/` and has its own Node.js 22 / TypeScript build. See [backend contract and independent design handoff](docs/BACKEND_CONTRACT.md).

```bash
cd functions
npm install
npm run check
npm test
```

The Firebase CLI configuration includes local Auth, Firestore, Functions and Storage emulators. It does **not** configure a live cloud project, secret or automatic deployment. `firestore.rules` and `storage.rules` remain deny-all; `storage.uploads.rules` is a non-deployed candidate for later security testing.

### Backend build priority

1. Secure authentication and private per-user account bootstrap.
2. Versioned Career Intelligence Profile and immutable evidence corrections.
3. CV upload intents, private original files, safe extraction/processing pipeline and provenance.
4. Canonical jobs, user-specific saved opportunities and application statuses.
5. Document-generation jobs, per-user version storage and async processing controls.
6. Profile matching and approved Answer Bank APIs.
7. Privacy, export/deletion, abuse controls, emulator tests, monitoring and costs.

No application screen or visual component in the current starter is the source of truth for future product design.

### Multi-user emulator verification

The CI security job builds the backend and starts Firebase Auth, Firestore, Storage and Functions emulators using the fake `demo-guidon-career-security` project. It runs private rules and authenticated two-account API tests; no cloud project or personal CV is needed.

To reproduce locally, install Node.js 22, Java 21 and Firebase CLI, then run:

```bash
npm install --prefix functions
npm run build --prefix functions
firebase emulators:exec --only auth,firestore,functions,storage --project demo-guidon-career-security "npm run test:security --prefix functions && npm run test:api --prefix functions"
```

**Safety:** `CV_UPLOADS_ENABLED` is disabled by default; do not set it to true unless isolated cloud storage, security tests, scanning, retention and explicit consent are ready. The current production-bound `storage.rules` remains deny-all.


### New job discovery and creative CV contracts

The draft backend includes per-user favourites, application milestones (CV Preparing, CV Prepared, Applied, Applied + Connected, Rejected, Not Interested), status-event history, Smart Sort and the screenshot-inspired Filter & Sort API. It also includes an opt-in **Think Creatively** drafting mode, which changes truthful wording and emphasis but never alters unverified facts, real employers or official designations. Generated CVs must be single-column with **no tables**. The UI is intentionally left unchanged for the UI/UX designer.

Read [Job Discovery and Creative Mode](docs/JOB_DISCOVERY_CREATIVE_MODE.md) and [Strict CV Builder Specification](docs/CV_BUILDER_STRICT_SPEC.md). Discovery ingestion, scalable search indexing and live CV AI generation are not implemented or deployed.

## Master-plan acceptance audit and universal web app

The source `GUIDON_CAREER_MASTER_PLAN (1).md` was audited against the draft GitHub backend. **None of Phases 0–9 or Releases A–E have reached all their user-facing exit criteria.** Several foundations and emulator tests have passed, but real authentication, CV-first AI extraction, an actual one-page CV generation run, full application tracking, and hosted deployment remain pending.

- [Phase-by-phase acceptance audit](docs/MASTER_PLAN_STAGE_AUDIT.md)
- [Manual Firebase web.app / PWA hosting setup](docs/WEBAPP_HOSTING_LAUNCH.md)
- [Chrome extension integration and legacy-source inspection](docs/CHROME_EXTENSION_INTEGRATION.md)
- [Strict staged CV-engine requirements](docs/CV_BUILDER_STRICT_SPEC.md)

**Canonical website:** one verified Firebase Hosting `*.web.app` URL for desktop, mobile browser and installable PWA after an independently owned project has been provisioned and the manual Hosting-only workflow has run. **No real live URL has yet been verified.** The extension is an optional separately installed desktop companion using the same secure APIs; the PWA cannot inspect arbitrary external sites.

The existing Manifest V3 autofill source was located in the legacy repository, but has **not** been ported to GuidOn. Its Next/Continue click automation and candidate-specific integration must be removed/replaced before release. No extension can automatically navigate or submit an employer application.
