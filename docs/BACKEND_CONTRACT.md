# GuidOn Career — backend-first API contract (v0.1)

**Status:** Source-level foundation only; backend is not deployed and has not passed a cloud integration/security test. Contract can evolve through versioned, reviewed changes.

The designer may create or replace the website, PWA and future native interfaces without copying the prototype React layout. The backend contract below describes code currently on a **draft, undeployed branch**. All products use **Firebase Authentication** and the same protected backend API; private data ownership is never supplied as an arbitrary client-selected user ID.

## Implemented callable functions (server: europe-west1)

Call these through the Firebase HTTPS callable client SDK. SDK includes the signed-in user's Firebase Auth token. Calls without valid authentication fail.

| Function | Request shape | Response shape | Behaviour |
|---|---|---|---|
| `getMyWorkspace` | `{}` | `{uid,capabilities,account,profile,baseCvs[]}` | Creates a private account shell on first authenticated request; returns only authenticated UID's data |
| `beginBaseCvUpload` | `{fileName,mimeType,sizeBytes,consentToStore:true,clientRequestId:UUID}` | `{uploadId,storagePath,maxSizeBytes,expiresAt}` | Bounded idempotent upload slot (6/day, 100 total per user); does **not** call AI |
| `completeBaseCvUpload` | `{uploadId}` | `{uploadId,status:'uploaded'}` | Confirms exact object, size and MIME against own upload slot |
| `saveMyProfileDraft` | `{profile,sourceCvId?}` | `{state:'unconfirmed',saved:true}` | Save unverified edits, never promote an AI draft to evidence |
| `getMyCareerProfile` | `{}` | `{confirmed,draft}` | Read only caller-owned confirmed profile and current draft |
| `confirmCareerProfile` | `{profile,userConfirmed:true,sourceCvId?,expectedRevisionId?}` | `{revisionId,state:'user_confirmed',schemaVersion:2}` | Explicit approval, version conflict guard and immutable history |
| `listMyProfileRevisions` | `{limit?:1..20}` | `{revisions:[...]}` | Read a bounded personal version history |

All requests authenticated by Firebase; no client-supplied `uid`. Use exact schemas in `functions/src/contracts.ts`.

**Deployment feature gate:** `CV_UPLOADS_ENABLED` defaults to disabled. The server returns `capabilities.cvUploadsEnabled=false` and rejects `beginBaseCvUpload` until a dedicated environment is deliberately configured *after* file-scanning, consent, retention, abuse and rules testing. `aiProfileExtractionEnabled` is also currently false.

## Example SDK usage (UI technology-independent)

```ts
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';

const backend = getFunctions(getApp(), 'europe-west1');

const me = await httpsCallable(backend, 'getMyWorkspace')({});
const start = await httpsCallable(backend, 'beginBaseCvUpload')({
  fileName: 'my-cv.docx',
  mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  sizeBytes: file.size,
  consentToStore: true,
  clientRequestId: crypto.randomUUID(), // Reuse this UUID when retrying the same upload
});
// After backend-enabled Storage rules and user's explicit upload:
// uploadBytes(ref(getStorage(), start.data.storagePath), file, {contentType: file.type});
// await httpsCallable(backend, 'completeBaseCvUpload')({uploadId:start.data.uploadId});
```

**Important:** The current `storage.rules` denies every client upload by design; `storage.uploads.rules` is a **candidate**, and must not be activated until emulator tests, per-account quotas and malware checks are complete. This protects users from prematurely enabled CV uploads.

## Profile schema

The typed schema supports:
- Legal/display names, contact details, headline, summary, location and links
- Skills, target roles/locations, preferences, notice period and salary range
- Repeatable employment, education, certifications, projects, languages and achievements
- Jurisdiction-specific work eligibility with explicit `yes` / `no` / `unknown` entries
- Explicit user-confirmed evidence separate from editable `profileDrafts`
- Revision history with `expectedRevisionId` preventing stale-editor overwrites

The profile is not yet the complete Phase 2 model. Future versioned additions cover qualifications, languages, work eligibility per jurisdiction, verified evidence, Answer Bank, sensitive information segregation, employer-specific answers and source anchors.

## Canonical private record paths

```text
users/{auth.uid}                              account/onboarding metadata
users/{auth.uid}/profile/current              confirmed profile
users/{auth.uid}/profileRevisions/{revision}  previous approvals
users/{auth.uid}/baseCvs/{uploadId}           original CV metadata + extraction state
users/{auth.uid}/savedJobs/{savedJobId}       future user-specific job decisions
users/{auth.uid}/applications/{applicationId} future application timeline
users/{auth.uid}/documentVersions/{versionId} future generated files
users/{auth.uid}/answerBank/{answerId}        future scoped verified answers

Cloud Storage:
users/{auth.uid}/base-cvs/{uploadId}/original
```

Shared public vacancy metadata must **never** contain per-user statuses or application evidence.

## Status and trust rules

- `awaiting_upload → uploaded` means the original file is present, **not** that its contents have been scanned or extracted. `scanStatus` remains `not_scanned` until a separate scanner exists. The object is not ready for AI extraction.
- Upload slots expire after 30 minutes. Reusing the same `clientRequestId` returns the same slot without consuming another quota; a new UUID is required after expiry.
- Each user is limited to 6 base-CV upload intents per UTC day and 100 total until an explicit retention/administrative quota workflow is introduced. The `CV_UPLOADS_ENABLED` flag must be explicitly enabled before any intent can be created.
- `extractionStatus='not_requested'` until user explicitly requests AI processing under a clear privacy/cost notice.
- AI-extracted drafts are never silently promoted to `user_confirmed`.
- CVs remain private evidence; no external application is marked Applied automatically.
- Server SDK bypasses client security rules: every function must derive the UID from verified authentication; no privileged arbitrary-user access is exposed.

## Integration gaps before using real personal data

1. New dedicated Firebase project, bill limits, secrets, deployment, region and data retention decision.
2. Storage rule tests, file malware scanning, per-user quotas, abuse prevention and cleanup.
3. Malware scanner and text-extraction worker/API behind explicit processing consent, supported formats, idempotency, document-type checks and usage quotas. The current checks validate size/MIME metadata, **not file content**.
4. End-to-end emulator tests and separate-user isolation checks; account export/delete flow.
5. Proper handling of session claims, verification refresh, privacy notices, accessibility and realistic UI tests.
6. Full job, document and application API versions after data contracts are approved.

Interface work can proceed without depending on the original React pages, using these contracts and design-independent account/profile state transitions.


## Security-test execution

`npm run test:security --prefix functions` requires the local Firebase Firestore and Storage emulators. The GitHub Actions security job starts both in demo-project mode; tests verify deny-all production rules and a **separate, undeployed candidate** for one-time owner-only CV uploads. No live Firebase project or uploaded personal data is involved. `npm run test:api --prefix functions` uses the Auth, Firestore and Functions emulators to test two independent accounts, confirmed/draft isolation, stale-edit rejection and fail-closed CV upload behavior.

## Designer-facing state transitions

- `getMyWorkspace`: creates private empty workspace after sign-in.
- `saveMyProfileDraft`: editable but **unconfirmed**; can be saved as the user moves between devices.
- `confirmCareerProfile`: only user-approved facts become **user_confirmed**, and a conflicting later revision requires reloading. Pass the current `revisionId` through `expectedRevisionId`; pass `null` for the first confirmation.
- `beginBaseCvUpload`: status **awaiting_upload**, metadata-only; the client uploads only if Storage rules are deliberately activated after safety review.
- `completeBaseCvUpload`: status **uploaded**, scan status **not_scanned**; AI processing is deliberately not implemented yet.

These are backend states. Their visual representation and interaction design are owned by the UI/UX designer.


---

## CV Builder API contracts and job folder (draft)

See [strict CV builder specifications](CV_BUILDER_STRICT_SPEC.md), which are also preserved in Master Plan Addendum v1.2.

### Authenticated callable endpoints (code exists, NOT deployed)

| Callable name | Important input | Output / purpose |
| --- | --- | --- |
| `createMyCvWorkspace` | `{clientRequestId:UUID,company,designation,location,originalJd,sourceUrl?,baseCvId?}` | Creates one private immutable job folder and writes original JD |
| `previewMyJdReview` | `{workspaceId:UUID}` | Returns conservative cleanup preview without running AI; original preserved |
| `confirmMyJdReview` | `{workspaceId,reviewId,expectedStageVersion,cleanedText,requirements,keywords,confirmedByUser:true}` | Validates exact JD quotes and advances into profile matching |
| `getMyCvWorkspaceReport` | `{workspaceId:UUID}` | Returns stage, gaps when available, pre/post score snapshots, token totals, model events and private artifact manifest |
| `readMyCvAuditArtifact` | `{workspaceId:UUID,artifactId:UUID}` | Reads a small JSON/text file only for the authenticated folder owner; verifies SHA-256 before returning |
| `submitMyCvGapFeedback` | `{workspaceId,feedbackId,expectedStageVersion,feedback:{acknowledged:true,comment,userRequestedChanges,confirmedFactIds}}` | Saves the user comment in the named folder and advances only from `awaiting_user_feedback` |
| `requestMyCvRevision` | `{workspaceId,revisionRequestId,expectedStageVersion,comment}` | Immutable revision request for a CV in a revisable stage; never overwrites prior versions |
| `approveMyCvVersion` | `{workspaceId,approvalId,cvVersionId,expectedStageVersion,userConfirmed:true}` | Final approval of that exact QA-passed, post-scored version by authenticated candidate |

**Internal backend-only APIs:** `recordCvPipelineStage`, `recordCvScoreSnapshot`, `registerRenderedCvVersion`, `writeCvAuditArtifact`, `recordCvModelUsage`; these are deliberately **not exported as client-callable functions**, preventing clients from inventing token usage or recruiting scores.

### Job folder example

```text
users/{uid}/job-cv-workspaces/
  Example Company - Financial Analyst - Dublin Ireland__<uuid>/
    01-jd/original.json
    01-jd/cleaned.json                         (future processing stage)
    02-match/stage-<run-id>-input.json         (future model output)
    03-gaps/pre-cv-score-<snapshot-id>.json  (trusted scoring)
    03-gaps/feedback-<comment-id>.json        (user comment)
    04-generation/stage-<run-id>-output.json  (future CV workflow)
    05-cv/post-cv-score-<snapshot-id>.json   (rendered output scoring)
    06-usage/model-<event-id>.json            (provider-reported usage)
    07-revisions/request-<revision-id>.json  (user-requested rework)
```

The Firestore private manifest references each immutable Cloud Storage artifact by path, SHA-256 and version. Source CVs are kept separately as private originals; the job folder contains only job-associated references/snapshots and generated content.

### Score semantics

- `rawAts` measures **distinct relevant JD keyword coverage**; `pre_cv` assesses available verified profile evidence, `post_cv` examines the actual exported CV text.
- `recruiterFit` assesses evidence across six documented categories, versioned as `recruiter-v1`. It is not a real employer recruiter or ATS score.
- When extraction is too uncertain for a valid score, use `null` / `needs_review`; never manufacture a 0–100 number.
- Record each score snapshot with the confirmed `profileRevisionId`; post-CV snapshots additionally require `cvVersionId`.
- Full matched/missing keyword lists, rationale, evidence IDs and gap detail live in private audit files.

### Token counter semantics

Each provider call records `provider`, `model`, `stage`, `requestId`, `measurement='provider_reported'`, `inputTokens`, `outputTokens`, `totalTokens`, optional `cachedInputTokens` and `reasoningOutputTokens`. A time-stamped pricing source may yield estimated USD cost; without it the API reports the usage but marks cost as unavailable. Every rerun is independently accountable.

### UI/UX handoff

The designer needs only these service states and payloads. Profile UI, JD review, gap popup, token meter, score widgets, document preview, compare-versions view and download presentation may all be redesigned. The backend enforces ownership, evidence verification, mandatory stage order, score provenance, audit storage and rendered one-page quality gates.


### Version registration and final approval contract

The trusted rendering worker registers an immutable `cvVersions/{cvVersionId}` record only after receiving actual DOCX and PDF bytes and extracted text. Both files must have valid headers and remain under the conservative 2.5 MB parsing target. It saves `cv-version-<uuid>.docx`, `.pdf`, `.txt` and `rendered-qa-<uuid>.json` in the private job folder.

The post-CV scoring routine refuses to score an unsaved or QA-failed version, or text whose SHA-256 differs from the saved extracted CV text. A stale score cannot approve a newer version. The separate `approveMyCvVersion` callable requires candidate confirmation and matching version, score and QA state.

### Token-cost pagination / aggregates

The `getMyCvWorkspaceReport` tokenCounter is derived from transactional all-history aggregates, **not just the last 250 stored events**. `tokenCounterByVersion` separates pre-CV from individual CV versions, and individual model calls retain cached/reasoning tokens, outcome and pricing provenance. The recent-event list is capped and marked truncated where applicable; a future paginated history/export API is required for a full historical UI.

### Versioned AI instructions

Task instructions for JD extraction, evidence matching, concise gap analysis, evidence-only one-page drafting and objective critique are defined in `functions/src/cv-prompts.ts`. The JD and uploaded CV are explicitly treated as untrusted data. They are not a running AI provider integration. Model scoring outputs are not accepted as final raw ATS or recruiter scores; independent backend calculations are authoritative.

The current work is a **foundation**, not a completed live AI-to-DOCX workflow. Cloud storage enablement, provider integrations, secure binary download and real user CV template acceptance tests remain future implementation gates.
