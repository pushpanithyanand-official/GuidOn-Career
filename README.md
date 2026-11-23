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
