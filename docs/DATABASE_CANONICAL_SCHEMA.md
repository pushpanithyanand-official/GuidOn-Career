# GuidOn Career — Canonical Database Model, Access Matrix and Migration Contract

**Status:** **PROPOSED TARGET, NOT DEPLOYED.** This document deliberately reconciles the older Functions namespace and the new Spark prototype before any real personal information is persisted.
**Applies to:** Firebase project `guidon-career-fcda2`; optional separate `guidon-career` worker project only under reviewed cross-project IAM.
**Decisions required before live database release:** one canonical namespace, migration ownership, security rule test suite, deletion/export path and source-specific sharing rights.

## 1. One logical data model across all clients

The canonical logical model below uses a **single `users/{uid}` namespace**, a **separate rights-controlled job catalogue** and **server-only restricted documents**. It is an intended migration target, not an instruction to switch the frontend or rules immediately.

```text
publicContent/{contentId}                                  [PUBLIC published only]
jobCatalog/{catalogJobId}                                 [SHARED under source rights]
jobCatalog/{catalogJobId}/sourceVersions/{sourceVersionId} [SHARED or restricted by rights]
jobImportSources/{providerId}                             [RESTRICTED service-owned]

users/{uid}/account/main                                  [PRIVATE: personal settings]
users/{uid}/profile/current                               [PRIVATE: current summary]
users/{uid}/profileDrafts/current                         [PRIVATE: user edits / unconfirmed]
users/{uid}/profileRevisions/{revisionId}                 [PRIVATE: immutable verified snapshot]
users/{uid}/experiences/{experienceId}                    [PRIVATE: job/skills history]
users/{uid}/educations/{educationId}                      [PRIVATE: qualifications]
users/{uid}/evidence/{evidenceId}                         [PRIVATE: numerical and STAR evidence]
users/{uid}/answerBank/{answerId}                         [PRIVATE: verified application answers]

users/{uid}/jobs/{userJobId}                              [PRIVATE: personal job state]
users/{uid}/jobs/{userJobId}/sources/{sourceId}            [PRIVATE: captured source references]
users/{uid}/jobs/{userJobId}/statusEvents/{eventId}        [PRIVATE: append-only job choices]

users/{uid}/cvWorkspaces/{workspaceId}                    [PRIVATE: job-linked workflow]
users/{uid}/cvWorkspaces/{workspaceId}/stageRuns/{runId}  [PRIVATE: input/output, token/cost ledger]
users/{uid}/cvWorkspaces/{workspaceId}/versions/{versionId}[PRIVATE: immutable CV metadata]
users/{uid}/cvWorkspaces/{workspaceId}/reviews/{reviewId} [PRIVATE: feedback/approval]

users/{uid}/applications/{applicationId}                  [PRIVATE: current projection]
users/{uid}/applications/{applicationId}/events/{eventId} [PRIVATE: immutable status history]
users/{uid}/applications/{applicationId}/interviews/{id}  [PRIVATE: appointments/reschedules]
users/{uid}/applications/{applicationId}/tasks/{taskId}   [PRIVATE: assessments/actions]

users/{uid}/connections/{connectionId}                    [PRIVATE: consent/metadata only]
users/{uid}/notifications/{notificationId}               [PRIVATE]
users/{uid}/usage/{periodId}                              [PRIVATE: bounded user-visible usage]
users/{uid}/exports/{exportId}                            [PRIVATE: approved export request state]

internalJobs/{taskId}                                     [SERVER-ONLY: processing queue]
internalTokens/{connectionTokenId}                        [SERVER-ONLY encrypted token locator]
internalAudit/{auditEventId}                              [SERVER-ONLY redacted logs]
```

**Files, not Firestore document blobs:** in secure private object storage, an owner-scoped path for base DOCX/PDF, CV versions and optional retained source snapshots. **Secrets:** Secret Manager or equivalent server-side vault; no privileged secrets in public browser or Firestore client. Under Spark, these server/file paths are future design only; don't claim upload and AI already work.

**Entity ID rules:**
- `uid` from Firebase Auth. `catalogJobId` identifies a source-rights-reviewed reusable vacancy.
- `userJobId` identifies one user's saved/captured job; it may reference a `catalogJobId`, or remain private with no catalogue entry.
- `sourceId` identifies a provider capture/URL/email/extension event; `sourceVersionId` preserves original provenance and freshness.
- `workspaceId` is one job-specific CV workflow; all versions retain `userJobId` and exact verified profile revision.
- `versionId` identifies immutable rendered CV artifacts. No CV version ID may be reused for another job.
- `applicationId` is independent from `userJobId` in the long-term schema, allowing future multiple application attempts (reapply) without collision. Store an explicit `userJobId` reference and employer requisition/application IDs.
- `eventId` is user+application scoped and immutable. A repeated same event ID with different content is rejected.

**Record envelope (mandatory for every mutable/derived entity as applicable):**
`schemaVersion`, `ownerUid` (private), `createdAt`, `updatedAt`, `revision`, `sourceType`, `verificationStatus`, `sourceReferences` and `inputVersionHash`. Do not blindly copy these fields into public catalogue documents.

## 2. Relationships and immutable authority

| Entity | Canonical owner | Mandatory references | Who may assert verified/derived results? |
| --- | --- | --- | --- |
| Public content | Product/admin | release version | Trusted publisher |
| Catalogue vacancy | Ingestion service | rights-approved source version and dedup key | Trusted ingestion reviewer/service |
| User job | Firebase UID | catalogue job OR private source, owner scope | User for interests/favourites; trusted service for provenance |
| Career profile | Firebase UID | immutable user-confirmed revision and evidence IDs | User confirms factual inputs |
| STAR / number | Firebase UID | education/experience ID, source and verification marker | User confirms actual evidence |
| CV workspace | Firebase UID | userJobId, JD version, profileRevisionId | User can request/review; service controls protected stages |
| ATS/Fit/QA result | Processing service under owner UID | source hashes, rubric and exact exported file | Trusted scoring/render service only |
| CV version | Owner UID, trusted creator | workspaceId, exact file hash and QA record | Service writes; user approves via separate review |
| Application | Firebase UID | userJobId, optional approved cvVersionId | User-submitted event; email only proposes changes |
| Gmail/extension signal | Source connector, owner UID | provider message/source IDs and selected app ID | Service extracts; user confirms consequential decisions |
| OAuth token | Restricted service | account/connection and consent purpose | Server only |

Profiles and STAR facts are **user-verified**, not necessarily third-party audited. Public-source JD requirements may be reusable only where source licences and privacy permit it. "Think Creatively" remains a writing option, never an evidence-authority elevation.

## 3. Read/write matrix (deny by default)

| Data | Anonymous | Signed-in owner | Other signed-in user | Trusted service |
| --- | --- | --- | --- | --- |
| Published product pages | Read | Read | Read | Controlled write |
| Approved job catalogue | Policy-based read | Policy-based read | Policy-based read | Authorised writes only |
| Private profile, STAR, answers | Deny | Read and controlled draft/confirmation writes | Deny | Limited owner-bound processing |
| Personal job state, source captures | Deny | Read and validated state writes | Deny | Limited ingestion/actions |
| CV source files and versions | Deny | Authenticated owner read/export when released | Deny | Narrow signed processing access |
| Model scores, tokens, QA/approval assertions | Deny | Read, request/review only | Deny | Server-controlled computation and writes |
| Applications, interviews, history | Deny | Read and validated manual events | Deny | Reviewed connectors propose/commit authorised events |
| OAuth tokens/API secrets | Deny | **No direct token read/write**; consent UX only | Deny | Explicit restricted service |
| Internal processing logs | Deny | Only redacted summaries, if enabled | Deny | Minimal role-based access |

**Critical release note:** Current draft `firestore.rules` permits client writes to proposed `sparkUsers/{uid}/cvWorkspaces` properties such as `preCvScore` and `gaps`. Those are **not trusted server-computed outputs**; a client must not be permitted to represent them as verified scores. Either remove them from client-writable schemas or treat them strictly as untrusted local drafts and keep authoritative results in a server-owned namespace. Existing rules are **not approved** until red-team tests close this and all transition/security concerns.

Also investigate client-editable `career/current` user confirmation, cross-document `getAfter` transition correctness, public/shared job ownership, and app/CF compatibility before activating on the real project. The last rule remains `allow read, write: if false` for unlisted paths.

## 4. Existing GitHub source crosswalk (actual paths today)

| Current draft component | Existing Firestore path | Target logical entity / required migration |
| --- | --- | --- |
| Functions confirmed profile | `users/{uid}/profile/current` and `users/{uid}/profileRevisions` | Retain verified snapshot semantics and add separate evidence index |
| Functions profile draft | `users/{uid}/profileDrafts/current` | Retain, user-editable draft only |
| Functions uploaded CV | `users/{uid}/baseCvs` | Private base file metadata; secure file workers pending |
| Functions shared jobs | `jobCatalog` | Retain only source-rights-authorised shared catalogue |
| Functions user job status | `users/{uid}/savedJobs` and `users/{uid}/manualJobs` | Merge into one user-owned job record with optional shared job reference |
| Functions CV workspaces | `users/{uid}/jobCvWorkspaces` | Canonical `cvWorkspaces` via planned migration/adapter |
| Functions app lifecycle | `users/{uid}/applications` and `events` | Retain underlying events, decouple app ID from job ID for future reapply |
| Spark provisional user data | `sparkUsers/{uid}/career`, `jobs`, `applications`, `cvWorkspaces` | **No separate permanent domain**; adapt/migrate to the canonical model |
| Internal score/artifact stage docs | CV workspace `scoreSnapshots`, `tokenUsage`, `artifacts` etc. | Preserve exact immutable provenance while normalising run/version ownership |
| Browser Auth-only preview | Firebase Auth only | Stable UID identity, no Firestore migration required |

**Nothing in this crosswalk has yet been migrated.** Do not silently point an existing frontend into a different collection without dual-user and data integrity tests. Avoid long-term dual writes; if a temporary migration requires them, use audited server-side idempotent migration writes and reconcile both sides before cutover.

## 5. Data lifecycle: state machines and immutable history

- **Job states:** `discovered`, `interested`, `cv_preparing`, `cv_prepared`, `applied`, `applied_connected`, `not_interested`, `snoozed`, `rejected`; user choices and derived display status are distinguished.
- **Application process:** `preparing`, `submitted`, `in_review`, `assessment_requested`, `interview_invited`, `interview_scheduled`, `interview_completed`, `offer_received`, `rejected`, `withdrawn`. Create immutable events, derive a current projection; never overwrite historical status or interview reschedule.
- **CV stage graph:** JD captured → JD cleaned/reviewed → source requirements → confirmed profile evidence → pre-CV ATS/Fit + gaps → reviewed user corrections → verified writing → actual render QA → post-CV ATS/Fit → approval → immutable version/download; stale/failed inputs go back to the relevant stage, never leap to approved.
- **Email signal states:** unmatched → suggested match → user review if necessary → accepted or ignored; never mark submitted from an alert, never mark rejected/offer without approval.
- **Sensitive data:** TTL and explicit purpose for temporary connector caches; no indefinite full mailbox archives. Delete/export includes child collections, object versions and processing caches where legally required.

## 6. Migration and cutover plan

1. **Inventory** existing Firebase collections, doc fields, indexes, rules, Storage paths and any actually deployed user data. The source branch may contain test schemas with no real user records.
2. **Freeze canonical contracts**, choose one namespace, assign schemaVersion and ownerUid, register the source-of-truth per entity.
3. **Prepare emulator dataset** covering separate users, same company/multiple roles, profile revisions, favourite jobs, CV versions and conflicting application events.
4. **Write a one-time, reversible, server-authorised migration** with per-collection mapping, idempotent source-to-target ID map, checksum, dry-run report, resumable checkpoints and rollback instructions.
5. **Verify cross-user privacy and invariants** using old/new read diff, Firestore rules emulator, duplicate import replay, field escalation and stale-write tests.
6. **Cut over clients one at a time** through a typed repository adapter; delete old routing only after read compatibility and rollback acceptance.
7. **Keep no shadow permanent `sparkUsers` product**. Legacy data deletion requires approved retention/export handling, not silent deletion.

No real user data is to be migrated or deleted by this architecture document.

## 7. Query and index design

- Catalogue: supported `sourceProvider`, `postedAt`, `freshUntil`, `companyNormalized`, `locationNormalized`; add composite indexes only for real query patterns.
- User jobs: `ownerUid` is implicit in path; query `status`/`favorite`/`updatedAt` with cursors, avoid fetching full JDs for cards, and compute Smart Sort as a scored projection with traceable version.
- Applications: one owner scope; index current status, event time and next interview; always query `users/{uid}` after auth.
- CV workspaces: index stage and updated time; nested immutable stage runs/token usage and CV versions fetched on detail view only.
- Calendar/Gmail events: never query other users by shared provider IDs; idempotency keys are namespaced by UID.
- Disable unnecessary automatic indexing of long JD body, raw extracted text, high-cardinality token logs and large array fields where permitted.

**Constraints:** Firestore documents and query costs are finite; store large source text/snapshots carefully with size bounds and attachment references. Use keyset pagination; no giant always-live global listeners or unbounded client collection scans.

## 8. Security acceptance tests (mandatory before live release)

- Anonymous and Bob cannot read/write Alice's documents, including nested subcollections, alternative paths, collection-group queries and shared-cache keys.
- Alice cannot inject another `ownerUid`, modify `createdAt`, reset `revision`, approve a CV-quality score, forge server AI token usage or bypass app confirmation through a field update.
- No unauthenticated index or query returns career facts, STAR evidence, answer-bank entries, private JDs, employer application IDs, meeting URLs or email pointers.
- User-submitted event and app projection remain consistent even with transaction retries, duplicate events, stale versions, rapid status changes, deleted jobs and reapplications.
- All Gmail/Chrome imports enforce provenance, rights and idempotency, and private captures never enter the shared catalogue without explicit approval/rights.
- Deleting an account is traceable, includes all private records/files and honours legally required retention and export; no immortal "immutable" records.
- Verify Spark free-tier constraints and environment-specific paths. Never use `allow read, write: if true` or open test-mode rules on the real GuidOn project.

**Pre-production signoff:** canonical schema owner, privacy/security reviewer, two-user emulator passing, authorised live Firebase project verification, export/deletion acceptance, deployment rollback and measurable operational limits.

**Phase status:** *Design only*. Existing Spark/Functions data layers and their security rules remain work in progress and must not be treated as interchangeable or production-ready.
