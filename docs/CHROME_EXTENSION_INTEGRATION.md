# GuidOn Career — Existing Chrome Extension Integration Contract

**Status:** Backend bridge contract and manual vacancy ingestion implemented in draft PR. **The existing Manifest V3 extension source has been located in the legacy repository, but is not present or integrated in GuidOn.** Do not mark Phase 8 complete until a carefully reviewed extension has been ported, installed, and end-to-end tested.

## Shared account, data and product flow

The Chrome extension, website/PWA, and optional native Android Preparation Browser share authenticated user-scoped API endpoints. They do **not** have separate candidate profiles, job databases, CV version histories or application statuses.

| User action | Browser companion | Backend | Result |
| --- | --- | --- | --- |
| Capture current job | User selects Capture; DOM extraction restricted to visible accessible content with explicit host permission | `captureMyJobFromAssistant` | User-reviewed title, employer, location, source URL and JD saved to private jobs; duplicate detected |
| Review job | User opens GuidOn from the extension | `getMyJobListings`, `getMyManualJobDetails`, job CV workspace APIs | Same signed-in personal vacancy on website and browser |
| Make CV | Extension initiates explicit handoff; **does not generate directly inside untrusted page** | Staged JD cleaning, profile matching, short gaps, selected generation mode, model adapter, render QA and score snapshots | New immutable version, documents and token ledger in private per-job folder |
| Choose CV | Show exact job-linked recommended/approved file and source | Versioned CV manifest and future secure binary download endpoint | User decides which approved CV version is attached to an application |
| Autofill current page | Supported application form DOM inspection, field suggestions and explicit user approval | Verified Career Intelligence Profile/Answer Bank, current-page fill plan | Fill **only current page**; check filled values; leave unknown/sensitive questions unresolved |
| Advance and apply | **User** clicks Next, Continue, Submit on employer site | No automatic server-side action | Employer-site session remains under user control |
| Update outcome | User explicitly marks Applied/Connected, optionally later interview/rejection | `setMyJobDecision` and future application timeline | Confirmed event shown in GuidOn, extension and mobile |

## Core safety and capability rules

1. **Current-page-only:** The extension can apply approved field values to supported DOM fields on the currently visible page; never click `Next`, `Continue`, `Apply`, `Submit`, or submit a form automatically.
2. **No silent page transition:** The fill plan is tied to a current URL plus DOM fingerprint; a new page requires a fresh review. No background navigation or stealth submission.
3. **Fact preservation:** A candidate's saved, verified answers are distinguished from contextual suggestions, unknowns, sensitive disclosures and employer-specific questions; unsupported content is never silently filled.
4. **User approval:** Show what will be filled and allow edits before filling. Corrections are not added to the global Answer Bank without explicit approval and scope/jurisdiction context.
5. **Ownership:** Identity is derived from server-validated Firebase authentication. No extension-selected `uid`, privileged token in a content script, or full-profile broadcast to every page.
6. **Permission boundaries:** Minimum Manifest V3 host permissions; user-triggered access/activeTab where feasible. Avoid broad access to all web traffic or account cookies. Respect login walls, website terms and protected pages.
7. **No blanket scraping:** Supported employer/ATS page capture needs permitted, user-initiated DOM reading. LinkedIn visibility in a browser is not permission for automated scraping. Copy/share links remain fallback.
8. **Status integrity:** Opening an application or filling fields is not a verified submission. Only explicit user action/authorised evidence updates the Applied or Connected status.
9. **Auditability:** Save capture provenance, chosen CV version, fill review event, optional unresolved field labels and user-confirmed outcome without storing raw page HTML, passwords, cookies or sensitive employer questions unnecessarily.
10. **No false Android equivalence:** A PWA cannot inject scripts into external sites. Native Android WebView and Chrome Custom Tabs have distinct session/cookie boundaries and need device testing.

## Current GuidOn code

- `functions/src/assistant-bridge.ts`: typed captured-job and approved current-page autofill plan schemas; no navigational/submission action in contract.
- `functions/src/assistant-bridge-api.ts`: `captureMyJobFromAssistant` callable, requiring authenticated owner and explicit review and storage consent.
- `functions/src/manual-jobs-api.ts`: private job creation/dedup and original JD storage; used by both web manual intake and assistant capture.
- `functions/src/job-discovery-api.ts`: listing/status/favourite API working across private manual and accessible shared jobs.
- `functions/test/assistant-bridge.test.cjs`: tests for invalid cross-surface and unapproved/sensitive autofill.
- `functions/test/api-emulator.test.cjs`: multi-user security tests for job state and private JD access.

## Still needed to use the existing extension

- **Located source:** [Legacy Manifest V3 extension](https://github.com/abhisheknair607-ux/automate_cv/tree/main/experimental/garamaal-autofill/extension), including `manifest.json`, `popup.js`, `mapping.js`, `matcher.js`, `reasoner.js` and `background.js`. Read-only inspection confirms working-oriented DOM scanning, side-panel matching and field filling logic, but **does not establish a working GuidOn release**.
- **Mandatory migration fix:** Legacy `popup.js` defines `clickNext()` and an extension `nextBtn` that can click Next/Continue on an external page. Remove this functionality entirely rather than hiding it. Add extension regression tests prohibiting all programmatic navigation or submission.
- **Legacy integration cleanup:** Old host permissions include unrelated `garamaal.web.app`, a local `127.0.0.1` AI endpoint and employer-specific hosts; `popup.js` accesses a candidate-specific local profile and `/api/autofill/candidate`. Replace these with owner-authenticated GuidOn APIs, explicit per-site host permissions and per-user Career Intelligence Profile/Answer Bank.
- Reuse source only after reviewing its security, licensing, permission and behavior constraints. Extension code must not assume the website's Firebase Auth session or browser local storage is automatically available inside the extension.
- Confirm Manifest V3, host permissions, activeTab use, extension authentication, strict content-script page isolation and browser-supported installation path.
- Connect capture action to `captureMyJobFromAssistant`, exact job ID to CV workspace creation, approved CV downloads, and current-page-only autofill with form value verification.
- Add an unobtrusive “Install Chrome Extension” link in the final UI once a verified distributable listing/approved enterprise installation is available. A public webpage cannot silently install an unpacked extension.
- Test supported ATS systems (at least Greenhouse, Lever and Workday-like multi-step forms where lawful), error states, dynamic fields, conditional questions, multiple application pages and duplicate captures.
- Record the release results and only then sign off Phase 8. The core site stays useful independently without this extension.

## Delivery order

Website and base-CV profile → job capture and JD audit → generate/retrieve versioned CV → current-page autofill → manual application status sync. The UI/UX designer is free to choose page layouts; this document captures binding capabilities and security requirements.


## Future relationship to Gmail application and interview intelligence

The Gmail roadmap is **not an extension permission** and does **not** grant the extension access to email. See [Gmail Integration and Application & Interview Tracking](GMAIL_INTEGRATION_APPLICATION_TRACKING.md).

- The extension may capture jobs, start or suggest a CV, recommend a saved CV, fill approved fields **on the current page only**, and record user-confirmed Applied/Connected milestones.
- Later, independently consented Gmail processing may recognise an actual application confirmation, recruiter reply, assessment, interview or offer/rejection; that signal is matched to the **same application ID** that the website and extension use, rather than creating duplicate applications.
- The Gmail tracker must never infer a submission merely because the extension filled a form or opened the employer's Apply page. Conversely, the extension must never auto-advance or submit because an email triggered an event.
- Event provenance identifies whether a milestone is user-confirmed, extension-observed or email-inferred. Rejections, offers and ambiguous same-employer matches require explicit approval before consequential changes.
- The legacy `clickNext()` routine remains disallowed. Gmail monitoring and Chrome host permissions require separate user authorisation.

The extension migration remains pending and Gmail capability B is planned for later phases, not implemented in the first release.
