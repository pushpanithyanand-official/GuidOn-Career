# GuidOn Career — Backend-first execution plan
**Decision:** 23 November 2026. **Status:** Active development direction.
**Preserves:** The full original Master Development Plan and addendum. This changes implementation sequencing/emphasis, not product features or the release acceptance tests.

## UI handoff rule
- The existing React frontend is a *temporary development shell*, not a binding design specification.
- The UI/UX designer controls page layouts, component libraries, visual systems, copy, navigation presentation and interaction design. Preserve only essential product behavior, accessibility, and security requirements.
- Backend modules must be usable from the web/PWA, future extension and optional native Android app via shared authenticated service contracts.
- Never place business rules, tenant ownership, AI prompt logic, secret keys, or privileged state transitions inside UI components.
- Do not invest further time in UI polish or unrequested screen implementation. Resume frontend work when the designer supplies designs and an API handoff is agreed.

## Workstream order

| Order | Backend workstream | Deliverable / exit criterion | Current status |
| --- | --- | --- | --- |
| B0 | Independent cloud infrastructure | New GuidOn-only Firebase/GCP environment with verified owner, budget, region, least privilege, dev/prod separation | Pending cloud connection |
| B1 | Auth and user isolation | Email/Google sign-in identity, authenticated account bootstrap, own-user-only API tests, verified anonymous rejection | Authenticated APIs and two-user emulator tests added; live cloud tests pending |
| B2 | Career Intelligence Profile | Typed/versioned profile, provenance, explicit approval, immutable revisions, account ownership and personal-data validation | Draft/confirmed separation, expanded fields, concurrency-safe immutable revisions built; source provenance and Answer Bank pending |
| B3 | Base CV processing | Upload intents, safe private storage, scanning, quotas, consent, text extraction, AI parse, user review, format reference | Idempotent upload intents, short expiry and user quotas built; uploads disabled until safety controls and isolated hosting are ready |
| B4 | Vacancy data foundation | Canonical vacancy schema, source provenance/freshness, deduplication, per-user saved decisions, permitted ingestion | Not started |
| B5 | Job matching & evidence | Requirements extraction, profile matching, traceability, gap review and user-approved additions | Grounded JD review, verified evidence contracts, two independent score algorithms and concise gaps built; AI provider adapter and live matching pending |
| B6 | CV/cover-letter jobs | Versioned generation, base-format reference, object storage, async work, retries/idempotency, user review | Immutable per-job audit folder, render QA worker, version/approval gates, token ledger built; generating actual CVs and production wiring pending |
| B7 | Applications lifecycle | User-specific application states, notes/timeline, exact document versions, explicit Applied confirmation | Not started |
| B8 | Cross-platform assistant services | Limited-scope capture, approved Answer Bank, safe field suggestions, manual current-step autofill APIs | Not started |
| B9 | Production readiness | Emulators, cross-user access denial, upload scanning, privacy/export/delete, costs, logs, back-ups, deployment checks | CI checks include security rules plus two-user callable API emulator tests; production safeguards pending |

## Non-negotiable backend invariants
1. Authenticated UID comes from verified Firebase identity, never a caller-supplied `uid`.
2. Private profile facts, CVs, answers, saved jobs, documents and applications are user-scoped and cannot be accessed by another ordinary account.
3. AI extraction is a draft until the user verifies it; no fabricated career facts.
4. Base CV original is immutable as an evidence source and distinct from the user-selected CV styling reference.
5. Save job, prepare CV, open apply URL, autofill current page and mark Applied are distinct events; no automatic Next/Submit.
6. Paid AI requires an explicit request, consent, abuse/cost controls and separate server-side credentials.
7. Security rules default to deny; loosening them requires emulator tests and review. Production data operations are not enabled just because local code compiles.
8. Code and API contracts may evolve through reviewed schema versions. The UI designer receives clear payloads/states, not hardcoded visual components.

## Completed during the initial backend pass
- Draft GitHub PR #1 contains callable endpoints for account bootstrap, profile confirmation and CV upload lifecycle.
- Strict request validation, privacy-scoped Firestore paths and revision records.
- Un-deployed candidate CV storage access rules; shipped rules remain deny-all.
- Standalone backend TypeScript build and automated validation tests.
- Backend contract documentation and Firebase emulator configuration.

## Release gate
**Do not merge for production or turn on public CV uploading** until isolated cloud environment, user separation checks, file safety and quota controls are verified. CI compilation and schema tests are necessary but not sufficient.

**See:** [Backend API contract](BACKEND_CONTRACT.md) and [master plan](GUIDON_CAREER_MASTER_PLAN.md).


## CV builder as a strict critical path

Master Plan Addendum v1.2 and [CV Builder Strict Specification](CV_BUILDER_STRICT_SPEC.md) are mandatory. The staged builder must independently verify original/cleaned JD, matched confirmed evidence, concise gaps and comments, Raw ATS and Recruiter Fit before and after every rendered CV, STAR and key numbers per job/education, strict one-page DOCX/PDF, user-controlled revisions, and immutable job-specific artifacts and actual provider usage metrics. These remain backend concerns independent of the designer's UI.
