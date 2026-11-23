# GuidOn Career — Architecture, Connections and AI Efficiency Specification

**Decision status:** Architecture baseline / pre-implementation gate, 23 November 2026. **Not a statement of production deployment.** Existing master-plan phases and strict CV requirements continue to apply.
**Related:** [Canonical database and migration design](DATABASE_CANONICAL_SCHEMA.md), [multi-source delivery pipeline](INTEGRATED_PIPELINE_AND_PHASE_GATES.md), [CV builder strict requirements](CV_BUILDER_STRICT_SPEC.md), [application/Gmail roadmap](GMAIL_INTEGRATION_APPLICATION_TRACKING.md), [extension migration](CHROME_EXTENSION_INTEGRATION.md).

## 1. Architecture principles that every feature must follow

1. **One identity:** Firebase Auth `uid` is the authoritative user principal. No client-supplied arbitrary owner IDs.
2. **One logical data source of truth:** A job, verified profile, CV and application each has one canonical owner/identifier and typed references across website, PWA, extension, mobile and email. No permanent parallel `users/` vs `sparkUsers/` histories.
3. **Separate public, shared-catalogue, user-private and restricted-internal data.** A publicly viewable job is not automatically redistributable, and a user-captured JD/email is not automatically public catalogue content.
4. **Boring, secure core:** Use deterministic parsers, validation, exact IDs, hashes, Firestore rules and rule-checked writes before optional AI.
5. **Version everything that affects a decision:** source JD snapshot, profile confirmation, selected STAR evidence, scoring rubric, prompts/model, template, generated CV and application event.
6. **Evidence before narrative:** User-verifiable facts are canonical; model text is derived content. No model may invent employer, job title, dates, qualification, immigration eligibility, metrics or application status.
7. **Processing is a directed graph:** Each stage declares typed inputs/outputs, ownership, validation, retries, idempotency and cache invalidation. UI merely orchestrates and displays; Chrome/mobile/Gmail use the same APIs.
8. **Fast and economical by design:** No AI call on a page open, sorting action, favourite toggle or filter change. Compute once, invalidate intentionally, show cache provenance and measure actual cost.
9. **No unverified public launch:** Cloud Functions and secure uploaded documents remain gated under Spark. Auth-only test does not activate private application APIs.
10. **Export, deletion, consent and rollback are architectural requirements**, not post-release enhancements.

## 2. Privacy and trust classes

| Class | Typical data | Reader / writer | Guard |
| --- | --- | --- | --- |
| **Public** | Product content, approved public config, privacy help pages | Anonymous read; authorised deploy writes | Explicit published allowlist, never candidate data |
| **Shared catalogue** | Permitted job listings, source rights, employer-verified metadata, reusable *generic* JD requirements | Scoped reader; trusted ingestion writes | Source provenance, licensing, freshness, no personal email/body/JD republishing without rights |
| **User-private** | Career Profile, imported private jobs, saved statuses, STAR metrics, Answer Bank, CV workspaces, CV files, applications/interviews | Owner and narrowly authorised service | Firebase Auth + field/transition rules and server ownership checks, account-scoped indexes |
| **Restricted internal** | OAuth refresh tokens, provider keys, worker credentials, ingestion secrets, provider billing, processing internals, necessary encrypted email references | Trusted service only; never browser or Firestore client | Secret Manager/server encryption, least privilege, audit, rotation and deletion |

**Do not put restricted secrets in Firestore user documents or browser config.** Public Firebase SDK identifiers are not restricted credentials. Sensitive personal attributes should be optional, purpose-limited and excluded from shared matching/search logs; all raw emails/attachments require separate consent and retention controls.

**Authority is distinct from visibility:**
- User can confirm their facts/STAR stories and mark application events they personally observed.
- An AI service may propose extracted fields, gaps or draft CV language, but those remain `unconfirmed`/derived until approved.
- Only a *trusted* scoring/render service may assert official ATS/Recruiter Fit results, QA passes, approved file checksums or consumption bills.
- A user-controlled client must not be able to self-assert a server-trusted quality score by writing Firestore directly.

## 3. System boundaries and connections

```text
Desktop Web / Installable PWA / Chrome Extension / Later Android Browser
                     |
      Firebase Auth (one uid, scoped identity)
                     |
            Typed GuidOn data contracts
                     |
       +-------------+-------------+
       |             |             |
Private user     Controlled shared   Restricted
records          job catalogue       service queues/secrets
       |             |             |
       +------ Job Intake Gateway --+
                     |
        Clean + provenance + dedup (no AI by default)
                     |
           Discovery / Smart Sort
                     |
      JD version + confirmed profile revision
                     |
     JD requirements + pre-CV ATS & Recruiter Fit
                     |
         Short gap questions / user feedback
                     |
      Verified evidence selection and CV draft
                     |
      Actual DOCX/PDF render QA + final scoring
                     |
         User review + immutable CV version
                     |
       CV recommendation + manual application
                     |
        Immutable application event timeline
                     |
        Future Gmail/Calendar signal review
                     |
                Dashboard
```

**Interfaces:** UI clients call `GuidOnRepository`/typed service methods, not individual collection paths sprinkled through pages. A Spark adapter may use strict owner-scoped client Firestore for low-risk user edits; a future server adapter uses Auth-verified callable/private worker APIs. Both adapters must expose the same logical records, ownership, versions and acceptance tests.

**Avoid:** UI directly writing results labeled `scored`, client-side AI service keys, one central user-owned Firestore document containing all jobs/history, extension copying private profiles into URL strings, or separate Gmail/extension application histories.

## 4. Processing classification and AI routing

| Operation | Preferred computation | AI policy |
| --- | --- | --- |
| Sign-in, save profile draft, favourites/status, dashboard counts | Firebase/Firestore indexed reads and rule-checked writes | **Never** |
| Basic job parse, URL/source normalisation, application ID/duplicate checks | Provider parser + field validation + fingerprints | **Never unless parser fails** |
| Simple Smart Sort, skills/locations, obvious JD keywords | Deterministic ranking and keyword normalisation | **Never by default** |
| Complex JD structuring and ambiguous responsibilities | Small structured-output model when needed | Shared-source cache if licensed and safe |
| Profile-to-JD matching | Evidence index + deterministic matching + bounded semantic model for ambiguity | Private cache keyed to confirmed profile revision |
| Raw ATS keyword coverage | Distinct JD keywords actually evidenced/visible; deterministic | **Never** |
| Recruiter Fit | Fixed, inspectable weighted rubric with optional bounded model judgement | Record evidence ids and rubric/model version |
| Concise gap questions | Requirements/evidence comparison; short model rewrite only if warranted | Reuse match; ask for only material missing facts |
| CV composition | Model for evidence-backed language and selection, deterministic fallback for approved inputs | Approval and immutable version mandatory |
| DOCX/PDF generation and geometry checks | Document engine + actual file/PDF inspection | **Never** |
| Existing-CV recommendation and small revision | Evidence/rubric compare; selectively rewrite changed sections | No full pipeline rerun when inputs unchanged |
| Routine Gmail classification | Sender/thread/rule detection then ambiguity-only model | Explicit Gmail permission, no autoreplies |

**Stable prompts and schemas:** Keep shared instructions and JSON schemas versioned and prefix-stable for provider prompt caching when supported. Assemble only the minimal relevant JD segments and *selected, confirmed* evidence IDs in model context. Do not send full account histories, unrelated jobs, entire inboxes or raw past CVs for every request.

**Structured-output contract:** Models return typed requirement/evidence references, confidence/explanations and exact claims. Validate server-side, reject unknown references, compare against confirmed source facts and never infer an applicant status from a model alone.

**Request budgets:** Track per-stage `inputTokens`, `cachedInputTokens`, `outputTokens`, model/provider, latency, estimated cost, stage attempts, fallback and user-triggered overrides. Set **configurable** per-user/per-workspace budgets, timeout/retry ceiling, and low-cost default routing; benchmarks determine actual limits. Never claim arbitrary token counts or latency targets as guaranteed. Paid calls do not run just to refresh a page.

## 5. Cache policy and invalidation

| Cached result | Safe partition | Suggested cache key components | Recompute when |
| --- | --- | --- | --- |
| Generic JD extract | Licensed/shared source OR user-private | JD content hash, source/licence, extractor/rules version | Source text/rights or parser version changes |
| Generic requirements | Same source scope as JD | JD version, schema, prompt/model version | JD or analysis rules change |
| User-job matching | **User-private only** | UID, JD version, confirmed profile revision, rubric/engine version | Relevant verified profile, JD or rubric changes |
| Pre-CV ATS/Fit | User-private | Match evidence snapshot and scoring version | Source or confirmed facts change |
| CV draft | User-private | Match result, selected evidence IDs, base-template revision, writing mode, comments, model version | Any relevant input changes |
| Render QA and post-CV scores | User-private | Exact exported file hash, QA/rubric versions | File or QA/scoring algorithm changes |
| User interface list/counts | User-private | Filter/sort, cursor, record version | Matching jobs/status change |

Never serve a private cache to another user. Cross-user reusable JD analysis must not contain email text, user notes, private applications, sensitive profile evidence or material copied without appropriate rights.

**Idempotency keys:** Provider message ID + connector + UID for private email intake; source/provider job ID or canonical URL/fingerprint for jobs; workspace stage operation ID and input snapshot hash for AI; `applicationId + eventId` for immutable events. Retries replay the same result or resume; they do not create duplicate CVs or false application transitions.

## 6. Latency, storage and monitoring strategy

- **Immediate actions:** optimistic UI only when rollback/conflict behavior is defined; benchmark favourites, local forms and dashboard responsiveness toward approximately 1 second under typical conditions.
- **Fast operations:** normalize, index and save a job within a few seconds under normal supported loads; no model dependency.
- **Heavy operations:** JD analysis, evidence matching, CV composition/rendering and Gmail backfills run as tracked, resumable jobs with visible stage/progress, timeout, retry policy and cancellation; do not block browser navigation.
- **Read efficiently:** paginate by cursors; use server-side/Firestore indexes where available; don't fetch full JDs or PDF artifacts for list cards; batch safe writes and suppress unnecessary listeners.
- **Write efficiently:** one owner-scoped record per changed entity; avoid repeatedly rewriting all experience/education/history when one metric changes; immutable event history is appended, not re-saved.
- **Store efficiently:** Firestore for metadata, small structured records and indices; object storage for DOCX/PDF/TXT and scanned source artifacts when a secure paid/alternative backend exists; secrets in managed server-side storage.
- **Measure reality:** Firestore reads/writes/index size, p50/p95 stage latency, cache hit ratio, token spend per job and CV, queue duration, retries, duplicate rate, JD extraction false positives, critical incorrect matches and per-user cost. Avoid unsupported throughput promises.

Performance targets are design goals, **not deployment claims**. At 100 users, benchmark real workloads (number of discovered jobs, job refreshes, CVs/day and mailbox volumes) against actual Spark quotas and AI spend. Monitor daily quota consumption, throttling and expensive queries.

## 7. Mandatory traceability, correctness and recovery

Every persisted derived result has `schemaVersion`, `inputVersionHash`, `sourceReferences`, `engineVersion`, `createdAt`, `status` and an actor/source identity. Every CV claim maps back to user-confirmed source evidence. Every application event maps to a manual/extension/Gmail origin and immutable event ID.

**Zero-tolerance release gates:**
- No cross-user access, and no public CV/profile/email content.
- No invented professional facts or silent promotion of extracted draft facts.
- No CV approval unless actual one-page/no-tables QA, visible pre/post scores and explicit user approval pass.
- No automatic Next, Continue, Apply or Submit by the extension/mobile assistant.
- No automatic offer/rejection state change or ambiguous Gmail-to-application match without user confirmation.
- No deletion-prohibited design that blocks future lawful user export/deletion.

Test repeat deliveries, stale versions, conflicting edits, revoked accounts, retries after partial failures, restored old cached results, same-company multiple applications, rescheduled interviews, source/licence conflicts and model failures. Failed steps remain inspectable and recoverable without corrupting accepted records.

## 8. Decision gates before further live data features

**Gate A — canonical schema and migration:** Ratify [Database Canonical Schema](DATABASE_CANONICAL_SCHEMA.md), name an owner for every collection, map existing `users/` and `sparkUsers/` paths, and design reversible migration. Do not deploy two competing schemas.

**Gate B — access, consent and rule tests:** Formal access-control matrix, fields that clients may mutate, immutable verified revisions and source-trusted scores; validate emulator two-user/cross-path/privilege escalation tests and missing-permission failures. Existing proposed `firestore.rules` require additional review and are **not approved for deployment**.

**Gate C — typed intake and module contracts:** Exact source -> `jobId` -> `userJobId` -> `workspaceId` -> `cvVersionId` -> `applicationId` references, one source of truth and no duplicate status authority.

**Gate D — AI token/cost and accuracy benchmarks:** Labelled datasets for JD capture, matching, STAR claims, two scoring algorithms and real one-page document output; approved budgets, caches and fail-closed behavior.

**Gate E — staging then controlled release:** Independent live two-user tests, monitoring, rollback, export/deletion controls and authorised Firebase project and deployment identities. Spark auth test is completed from the user's published screenshot; a live private database product is **not** yet accepted.

**Implementation order:** Architecture gates A–C first; secure profile/job persistence; real multi-source intake; rank/match/gap pipeline; CV generator/QA and approved outputs; unified applications; extension; optional Gmail intelligence; scaling and production sign-off.

**UI/UX boundary:** Current React pages are provisional functional scaffolding. The designer may replace the interface as long as these shared data/security contracts remain intact.
