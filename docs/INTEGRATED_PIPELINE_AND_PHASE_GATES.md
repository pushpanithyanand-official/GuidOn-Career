# GuidOn Career — Multi-source Pipeline, Module Handoffs and Phased Release Gates

**Status:** Architecture and delivery plan; **not an implemented connector list or live CV AI service**. This extends, rather than replaces, the original Master Plan Phases 0–9 and release requirements.
**Depends on:** [Architecture and AI Efficiency](ARCHITECTURE_DATA_AI_EFFICIENCY_SPEC.md), [Canonical Database](DATABASE_CANONICAL_SCHEMA.md), [CV Builder Strict Spec](CV_BUILDER_STRICT_SPEC.md), [Chrome Extension](CHROME_EXTENSION_INTEGRATION.md), [Gmail Tracking](GMAIL_INTEGRATION_APPLICATION_TRACKING.md).

## 1. One end-to-end candidate journey

```text
Account → Verified Career Profile (CV-first) → Unified Job Intake
→ Source/legal/provenance validation → Duplicate detection → Discovery/Smart Sort
→ Job Detail + JD version → Requirements extraction (reuse cache when allowed)
→ Confirmed Profile Match → Raw ATS Keyword Coverage + Recruiter Fit (pre-CV)
→ Short gap questions → User feedback, evidence/STAR verification
→ Evidence selection + Base CV template + Creative/Evidence-first mode
→ Draft CV → Actual DOCX/PDF one-page/no-table geometry QA
→ Raw ATS + Recruiter Fit on exported *visible* document (post-CV)
→ User review → Versioned approved CV (DOCX, PDF and permitted TXT)
→ CV recommendation → User-controlled apply/autofill
→ Confirmed application record → Interview/assessment/offer events
→ Later consented Gmail tracking and optional Calendar
→ Unified Dashboard / export / data deletion
```

**No module may skip the verification/ownership gate to accelerate processing.** User actions persist against the same logical records regardless of desktop web, PWA, Chrome extension or mobile client.

## 2. Job source connector contracts

| Source | Input/capture | Processing/permission | Shared record it produces | Release stage |
| --- | --- | --- | --- | --- |
| Manual paste / employer URL | User-provided URL/JD, company, title, location | Validate URL; direct fetch only when permitted; pasted content remains private | Owner-only user job and provenance | Core MVP |
| Desktop Chrome extension | Page DOM, role, location, JD, official apply URL | Per-site permission; privacy notice; no Next/Continue/Submit | Same owner-only user job, possible rights-approved catalog reference | Extension phase |
| User-authorised Gmail alerts | Selected forwarded messages or purpose-limited Gmail access | Per-account routing/OAuth consent; filter/ID dedup; no job-alert→Applied inference | User job with email-source provenance | Gmail discovery phase |
| Employer/ATS feed | Permitted public API, career RSS/feed/ATS provider | Rate limits, attribution, licence and freshness; no bypass of protected sites | Rights-reviewed shared catalogue job + source version | Source adapter phase |
| Recruiter/referral shared link | Paste/forward/link | User confirmation; private unless rights allow reuse | Private job | Core/connector phase |
| Mobile Career Browser | Explicit capture from supported browser mode | Preserve session, employer ATS permissions, DOM only where supported | Same private user job | Mobile phase |
| Other email providers (Outlook etc.) | Separate user-authorised integration | Provider-specific scopes, security review, revocation | Same owner job and future application signals | Later optional |
| Partner/licensed feeds | Contracted source API | Rights and terms; ingestion budget, stop/removal process | Shared catalogue | Scale phase |

**Generic connector interface** (logical, backend-agnostic): `capture(input, userContext) -> SourceObservation`. All observations include `sourceType`, `providerId`, `capturedAt`, `sourceUrl`, `sourceMessageId` if any, `originalTextHash`, `permissionsScope`, `confidence` and `ownerUid` if private. A connector **does not directly write an application**.

## 3. Unified job intake stages

1. **Receive securely:** Authenticate owner or scheduled service, validate typed payload length, source rights and rate limits. Deny untrusted script instructions embedded in HTML/email/JDs.
2. **Normalise deterministically:** canonical URL (remove tracking parameters where safe), Unicode/whitespace, company/title/location, employer requisition ID and source format. Preserve original source snapshot/version.
3. **Reject/repair corrupt inputs:** invalid URL, mismatched origin, missing title or suspicious extraction enter review, not public catalogue.
4. **Deduplicate:** provider+requisition ID → canonical/official URL → strong content fingerprint/company-title-location-date. Fuzzy matches are suggestions; do not merge clearly distinct vacancies.
5. **Classify sharing:** user-private by default for extension/email/manual content; shared only if source rights verified. Catalogue contains no email, recruiter response or applicant notes.
6. **Persist provenance and jobs:** one user-owned job with linked source IDs and `catalogJobId?`; idempotent ingestion requests cannot create duplicates.
7. **Compute ranking:** use structured profile targets and cached fit signals; show transparent reasons and stale/low-confidence metadata.
8. **Index/paginate:** list cards read lean projections; full JD and source text are fetched on detail, not on every dashboard refresh.

**Duplicate example:** A LinkedIn email alert, manual URL paste and desktop extension capture for the same requisition yield one saved opportunity with three source observations, not three separate CV/application histories.

## 4. Profile & CV worker data flow

**Profile-first data contracts:** Base CV original retained securely (when scanning/file storage is launched), structured AI extraction is **unconfirmed**; user confirms authoritative facts, individual STAR stories and numerical records. Each confirmed revision has an immutable `profileRevisionId`. Education and experience evidence are linked and searchable by evidence ID, not re-sent wholesale in each AI prompt.

**Stage contracts:**
- `JDStage`: `jobId`, `jdSourceId`, `jdVersionHash`, cleaned JD, source-backed quotes and requirement IDs, validation notes.
- `MatchStage`: `jdVersionHash`, `profileRevisionId`, evidence IDs, missing/partial requirements, pre-CV Raw ATS and Recruiter Fit scores and rubric versions.
- `GapStage`: concise missing-fact questions and explicitly user-approved additions/rejections; no fabricated evidence.
- `DraftStage`: exact selected evidence IDs, base-template revision, creative-mode choice, source-grounded narrative, versioned prompts and AI token ledger.
- `RenderStage`: exact DOCX/PDF file hashes, page count=1, no tables, readable fonts, aligned left/right/date geometry, maximum two rendered lines per STAR bullet.
- `ScoreStage`: independent Raw ATS distinct keyword coverage and Recruiter Fit from **visible exported document**, not unseen profile.
- `ApprovalStage`: user confirms, immutable version saved and recommended for matching jobs/applications. Any later revision creates a new `versionId`.

**Strict CV rules:** preserve the uploaded base CV format when supported; one page **strictly**, no Word tables, precise left/right alignment and right-aligned dates, fact-based STAR with separate numbers/education evidence, avoid excessive hyphens in prose, use `: ; ,` appropriately. Think Creatively may change truthful emphasis/narrative, never official work or education facts. Quality gate failure must block approval and show reasons.

**Performance:** deterministic JD parsing/keywords/ATS should not require model calls; re-use generic JD analysis only when rights-safe; source only top relevant verified evidence. Re-render and post-score whenever exported file bytes change, even if most text is cached. Capture tokens/latency/cost for each stage and version.

## 5. Application and assisted browser handoff

- An application has its own `applicationId`, `userJobId`, optional `approvedCvVersionId`, employer application/reference ID, current derived status and immutable event timeline.
- The website, extension and mobile browser share the exact same user-owned application ID; no parallel application records per channel.
- The extension recommends a CV or initiates a new CV workspace; the user reviews fields and manually navigates employer application pages.
- **Never automatically click Next, Continue, Apply or Submit.** A completed autofill is **not** evidence of submitted status.
- Only user-confirmed submitted events change the application to Submitted/Applied. Later Gmail confirmation can corroborate that record, with owner-approved match.
- Interview invitations and reschedules retain appointment history. Rejection/offer and ambiguous same-employer roles require confirmation before updating consequential state.
- Background work and notifications must be opt-in, deduplicated and traceable; the extension receives only minimum necessary approved answers.

## 6. Future Gmail intelligence is a second distinct workstream

**Gmail A (planned):** job-alert link extraction and discovery. User can decline; forwarding/filter approach and OAuth connect are explicit, purpose-limited alternatives.

**Gmail B (future):** application receipts, recruiter replies, review/assessment stages, interview invitations/scheduling/reschedules, offers/rejections and later optional Calendar. Never treat a job alert as an application receipt. Match by employer requisition ID, role, sender/domain, thread and date. All email-derived proposals have `source`, `confidence`, `matchedApplicationId`, evidence reference and `needsConfirmation`.

Do not request broad Gmail/Calendar scopes during the first Spark login release. Separate consent, minimum retention, secure token storage and provider policy approval are release dependencies.

## 7. Module-to-module contracts

| Producer | Consumer | Shared identifier/message | Failure behavior |
| --- | --- | --- | --- |
| Auth | Every module | Verified `uid` | Unauthenticated; never return private records |
| Base CV extraction/user editor | Profile/evidence index | `profileRevisionId`, `evidenceId` | Unconfirmed draft remains private, never scored as verified |
| Job intake | Discovery/Smart Sort | `userJobId`, optional `catalogJobId`, `sourceIds[]` | Queue review/retry; do not duplicate |
| Discovery | CV Studio | `userJobId`, `jdVersionHash` | Block if no valid JD or stale version |
| Profile | Match | `profileRevisionId`, confirmed evidence IDs | Show concise gaps; never fill missing fact |
| Match/Gaps | CV Engine | stage run IDs and approved evidence | Block generator until verified inputs |
| CV Engine/Render | Score/Approval | exact exported `cvVersionId` and file hash | Reject invalid one-page/QA file |
| CV Approval | Extension/Application | approved `cvVersionId` | Do not recommend unapproved file |
| Employer submission/manual confirmation | Application timeline | `applicationId + eventId` | Preserve status, retry safely |
| Gmail recruiter classifier | Application review queue | `sourceMessageId`, candidate `applicationId` | Require review on ambiguity/consequence |
| All read projections | Dashboard | versioned owner-scoped summaries | Show stale/not synced, never invent counts |

Every API must document typed payload, auth mode, schema version, request idempotency, correlation trace ID, expected version, pagination, permitted fields and error codes. Never store browser provider tokens in URLs or public caches.

## 8. Revised delivery batches mapped to original phases

The original **Phases 0–9 and Releases A–D stay intact**; this table is an implementation ordering and additional architecture gate. A completed piece of code does **not** mean the corresponding phase's original acceptance criteria passed.

| Batch | Original scope mapping | Functional outcome | Release gate/status |
| --- | --- | --- | --- |
| **A0: Architecture freeze** | Precondition to 0–9 | Canonical private/shared schema, source ownership, adapter contracts, indexes, AI budgets, threat model and migration plan | **NOW — DESIGN DOCUMENTED, NOT SIGNED OFF** |
| A1: Auth and Spark data basics | 0–2 | Existing `web.app` login plus secure, owner-scoped editable profile and per-user job records | Auth login verified; Firestore rules + live two-user tests pending |
| A2: CV-first verified profile | 2 | Scanned base CV, extraction review, verified STAR/metrics, saved template and Answer Bank | Blocked on secure upload/storage/AI worker path |
| A3: Unified intake + discovery | 4 and 5 | Manual/URL first, permitted ATS feeds and extension/Gmail adapters later; dedup, Smart Sort and filters | Manual owner-record core first; external connectors permission-dependent |
| A4: Matching and gap intelligence | 5 and 6 | JD requirements, pre-CV dual scores, short review questions, evidence snapshots | Real source/accuracy benchmark and model budget acceptance |
| A5: One-page CV studio | 6 | Model-assisted truthful CV from uploaded format, real QA, post-CV scores, token ledger, revision approvals | Real-document bench and secure downloads mandatory |
| A6: End-to-end applications | 7 | Same job/CV/application IDs, submission confirmation, status and interview timeline | Real two-user consistency and event replay tests |
| A7: Browser assistant | 8 | Existing Chrome MV3 migration, future mobile browser and safe current-page fill | Manual Next/Continue/Submit always |
| A8: Gmail discovery | Future source extension | Consented job-alert import and dedup | Provider scopes, verification and retention |
| A9: Gmail application intelligence | Future capability B | Matched status/interview/assessment/offer/rejection, reminders | User confirmation for significant/ambiguous outcomes |
| A10: Production and scale | 9 | Security, performance, costs, export/deletion, rollback, 100+ user tests | All original release gates satisfied |

## 9. Release verification example (one cohort, two users)

1. Alice and Bob sign in with independent identities; neither can read the other's private data, CVs, messages or status histories.
2. Alice saves and confirms a professional profile with separately verified work STAR and metrics; a draft does not count.
3. Alice imports the same permitted vacancy by URL and a simulated alert; one user job with two sources appears. Bob can see shared-catalogue metadata only when sharing is authorised.
4. Discovery applies Smart Sort and advanced filters using the confirmed career targets; display reasons are grounded and stable.
5. Alice reviews the original JD, sees initial ATS and Recruiter Fit plus concise gaps, confirms corrections.
6. CV Studio composes and exports a truly one-page, no-table document from verified evidence, actual QA and visible post-CV dual scores. Approval links the exact CV file version.
7. The extension, when released, fills only current employer page fields; Alice manually clicks through and confirms an actual submission. The application is linked to the job and approved CV.
8. A later Gmail test email proposes an interview against the correct application and never auto-rejects/auto-offers without confirmation.
9. Review the persisted source lineage, event history, token/cost ledger, cache reuse and user-specific data export/deletion.
10. Verify the same backend logic from mobile and web; UI redesign does not change business contracts.

**Not all of these checks are currently executable.** A0 design review and A1 security implementation are next. The static website and Auth-only mobile screenshot do not prove the entire journey.

## 10. Controlled delivery (avoid frequent manual terminal use)

Develop integrations on GitHub feature branches, merge through reviewed quality checks and automated emulator/real-document tests, stage in an isolated Firebase/Google Cloud environment, then deploy a coordinated release with a rollback plan. After an authorised one-time Google Workload Identity Federation/GitHub environment setup, routine Hosting deployments can be automated safely; no direct Google Cloud deployment access has been verified in this chat.

**Current Spark boundary:** owner reports standard Hosting deployed and mobile sign-in verified; server-side Cloud Functions, private document storage/AI generation and Gmail access are not live. Design a reviewed, least-privilege Spark client-data layer for permitted low-risk actions; keep trusted AI/scoring and document actions behind a separate secure server release gate. Do not turn on broad Firestore rules just to make the demo look functional.

**Definition of phase complete:** user-visible scenario + privacy test + data consistency + cost/latency benchmark + documented rollback. A frontend mock, callable contract or GitHub Actions pass is a component milestone, not a signed-off product release.
