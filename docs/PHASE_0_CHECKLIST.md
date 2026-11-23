# Phase 0 — Implementation checklist

Master-plan source: [GuidOn Career Master Development Plan](GUIDON_CAREER_MASTER_PLAN.md), Phase 0 and addendum Sections 11–18.

## In this initial repository setup

- [x] Independent repository and read/write access verified.
- [x] Preserve master plan in full.
- [x] Responsive branded application shell and navigation.
- [x] Local development/build commands and a documented environment example.
- [x] Firebase Hosting configuration prepared (NOT deployed).
- [x] Validate `npm install`, TypeScript checks and production build in CI (GitHub Actions).

## Remaining Phase 0 work before signing off

- [ ] Create an independent GuidOn Career Firebase/GCP project, separate dev/prod environments and explicit project ownership.
- [ ] Configure Firebase Hosting, Authentication and isolated storage while retaining least privilege.
- [x] Add emulator tests for deny-by-default Firestore/Storage access plus owner-scoped candidate upload rules.\n- [ ] Complete production review and live cross-user testing before enabling any real CV uploads.
- [ ] Set billing alerts/budgets, basic error monitoring, rate/cost controls and retention choices.
- [ ] Document lawful data handling, AI-processing disclosures, deletion/export boundaries and accepted file types.
- [x] Add CI for typecheck, build, unit/emulator security tests and a manually gated Hosting-only deployment workflow.
- [ ] Add dependency and container image scanning, permissions review and deployment rollback drill.
- [x] Prepare PWA manifest, temporary build-time icons, SPA deep links and gated Firebase Hosting deployment workflow (not yet executed).
- [ ] Deploy a non-sensitive starter to the independent environment, verify the actual web.app link on desktop/Android, and document rollback.

## Acceptance

A developer can run and deploy the static starter; secrets remain outside Git; environment setup is documented; navigation never implies unavailable features work. **Do not mark Phase 0 complete until hosted deployment and checks are verified.**


## Source plan audit and website/extension handoff

All original phases 0–9 remain **PARTIAL**, pending their complete end-to-end acceptance criteria. See [Phase and release audit](MASTER_PLAN_STAGE_AUDIT.md), [Firebase Hosting web.app checklist](WEBAPP_HOSTING_LAUNCH.md), and [Chrome extension integration contract](CHROME_EXTENSION_INTEGRATION.md). No live Firebase Hosting URL has been verified; feature contracts are not evidence of a production-ready website or extension.


## Added architecture foundation gate — before private data activation

- [x] Append Master Plan v1.6 and add [Architecture/AI Efficiency](ARCHITECTURE_DATA_AI_EFFICIENCY_SPEC.md), [Canonical Database](DATABASE_CANONICAL_SCHEMA.md) and [Integrated Pipeline/Phases](INTEGRATED_PIPELINE_AND_PHASE_GATES.md).
- [ ] Ratify one canonical `users/{uid}` namespace and migration mapping from `sparkUsers`, `savedJobs`, `manualJobs` and `jobCvWorkspaces`; **not deployed**.
- [ ] Approve a public/shared/user-private/restricted access matrix and rights-controlled job catalogue policy.
- [ ] Remove the ability for ordinary Firestore clients to assert authoritative CV scores, QA approvals or AI usage. Review provisional `firestore.rules` thoroughly.
- [ ] Add complete per-user schema, field/transition, cross-user and privilege-escalation emulator tests (including nested data and client score writes).
- [ ] Implement indexed/paginated owner-scoped queries, idempotent job intake and revision/event histories on the agreed storage model.
- [ ] Version JD/profile/evidence/rubric/model/template/cache inputs; add token/latency/cost ledger and spend limits for paid AI stages.
- [ ] Benchmark accuracy with labelled jobs, evidence and exported one-page CVs, including 100-user simulation targets, retention and export/delete.
- [ ] Verify monitored staging deployment/rollback and secure private-data handling before enabling private writes in production.

**Status:** The owner verified live Firebase Hosting and Google sign-in on mobile, but **Firestore persistence, Functions-backed AI, CV uploads, Gmail and Chrome autofill remain unreleased.** Do not use open test-mode rules to satisfy the acceptance gate.
