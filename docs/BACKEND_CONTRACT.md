# GuidOn Career — backend-first API contract (v0.1)

**Status:** Source-level foundation only; backend is not deployed and has not passed a cloud integration/security test. Contract can evolve through versioned, reviewed changes.

The designer may create or replace the website, PWA and future native interfaces without copying the prototype React layout. All products use **Firebase Authentication** and the same protected backend API; private data ownership is never supplied as an arbitrary client-selected user ID.

## Implemented callable functions (server: europe-west1)

Call these through the Firebase HTTPS callable client SDK. SDK includes the signed-in user's Firebase Auth token. Calls without valid authentication fail.

| Function | Request shape | Response shape | Behaviour |
|---|---|---|---|
| `getMyWorkspace` | `{}` | `{uid,account,profile,baseCvs[]}` | Creates a private account shell on first authenticated request; returns only authenticated UID's data |
| `beginBaseCvUpload` | `{fileName,mimeType,sizeBytes,consentToStore:true}` | `{uploadId,storagePath,maxSizeBytes}` | Reserves an upload slot; does **not** call AI |
| `completeBaseCvUpload` | `{uploadId}` | `{uploadId,status:'uploaded'}` | Confirms exact object, size and MIME against own upload slot |
| `confirmCareerProfile` | `{profile,userConfirmed:true,sourceCvId?}` | `{revisionId,state:'user_confirmed'}` | Validates structured profile and creates immutable revision history |

All requests authenticated by Firebase; no client-supplied `uid`. Use exact schemas in `functions/src/contracts.ts`.

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
});
// After backend-enabled Storage rules and user's explicit upload:
// uploadBytes(ref(getStorage(), start.data.storagePath), file, {contentType: file.type});
// await httpsCallable(backend, 'completeBaseCvUpload')({uploadId:start.data.uploadId});
```

**Important:** The current `storage.rules` denies every client upload by design; `storage.uploads.rules` is a **candidate**, and must not be activated until emulator tests, per-account quotas and malware checks are complete. This protects users from prematurely enabled CV uploads.

## Profile schema

The typed schema supports:
- Display name, headline, summary, location, links
- Skills, target roles, target locations
- Repeatable employment experience, education and projects with UUID identifiers
- Explicit confirmation and optional source CV reference
- Immutable `profileRevisions` audit trail

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

- `awaiting_upload → uploaded` means the original file is present, **not** that its contents have been scanned or extracted.
- `extractionStatus='not_requested'` until user explicitly requests AI processing under a clear privacy/cost notice.
- AI-extracted drafts are never silently promoted to `user_confirmed`.
- CVs remain private evidence; no external application is marked Applied automatically.
- Server SDK bypasses client security rules: every function must derive the UID from verified authentication; no privileged arbitrary-user access is exposed.

## Integration gaps before using real personal data

1. New dedicated Firebase project, bill limits, secrets, deployment, region and data retention decision.
2. Storage rule tests, file malware scanning, per-user quotas, abuse prevention and cleanup.
3. Extraction worker/API behind user consent, idempotency and usage quotas.
4. End-to-end emulator tests and separate-user isolation checks; account export/delete flow.
5. Proper handling of session claims, verification refresh, privacy notices, accessibility and realistic UI tests.
6. Full job, document and application API versions after data contracts are approved.

Interface work can proceed without depending on the original React pages, using these contracts and design-independent account/profile state transitions.
