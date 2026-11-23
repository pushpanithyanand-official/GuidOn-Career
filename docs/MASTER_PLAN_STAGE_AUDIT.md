# GuidOn Career — Source Master Plan Acceptance Audit

**Audit date:** 23 November 2026  
**Source of truth:** Project upload `GUIDON_CAREER_MASTER_PLAN (1).md`, preserved in `docs/GUIDON_CAREER_MASTER_PLAN.md`, including additive v1.1–v1.3 requirements.  
**Inspected Git ref:** `feat/backend-foundation`, draft PR #1.  
**Audit scope:** Code and documented CI/emulator evidence, not a real deployed service.  
**Definitions:** *Partial* means a real foundation or test exists but a user cannot complete that phase's master-plan acceptance criteria. *Complete* requires an authenticated end-to-end user demonstration plus phase-specific sign-off.

## Master plan phases 0–9

| Phase | Current result | Verified foundations | Unmet acceptance criteria / next evidence |
| --- | --- | --- | --- |
| **0 — Foundation** | **PARTIAL** | Independent repository, preserved roadmap, React temporary shell, TypeScript build, CI and local emulator rules, Firebase Hosting config, PWA manifest/icon generation | Independently owned Firebase dev/stage/prod environments, billing guardrails, authorised deployments, visible `.web.app` site, rollback and privacy/monitoring sign-off |
| **1 — Registration and login** | **PARTIAL** | Authenticated callable workspace and per-user tests; anonymous requests rejected in emulators | Real Google/email sign-in, password reset, logged-in browser sessions, onboarding routing, two real users tested on deployed web |
| **2 — Career Intelligence Profile** | **PARTIAL** | Versioned profile, drafts and confirmation, work eligibility/categories, separate verified STAR stories/key numbers per job and degree, original-CV upload intent contract | Working base-CV upload, malware scan and secure file processing, AI extraction/review, format retention, full Answer Bank, sensitive-field handling, user-visible editor, export/deletion |
| **3 — Dashboard and installable website** | **PARTIAL** | Responsive placeholder shell and navigation; PWA manifest/icon build; responsive foundations | Real account/profile summary, saved jobs, activity/notifications, verified Android/web install and continuity, actual hosted URL |
| **4 — Job discovery** | **PARTIAL** | Typed public listings; user-private manual job import and dedup; favourites/statuses; full-list filter/sort, Smart Sort and provenance contracts; signed-in APIs | Real permitted job feeds/alert capture, complete detail UI, indexed search over scale, freshness verification, review of shared feed permissions, cross-device UX |
| **5 — JD analysis and matching** | **PARTIAL** | JD clean/confirm; grounded requirement/keyword schemas; preliminary Raw ATS keyword coverage, Recruiter Fit rubric, concise gap/feedback and verified evidence references | Real AI analyst/matcher pipeline, worker queues, confidence + missing-evidence UX, user review with profile updates, role-by-role real JD acceptance tests |
| **6 — CV Studio** | **PARTIAL** | Staged flow contracts, opt-in creative mode, immutable folder/version audit, token accounting, one-page render/PDF and no-tables DOCX QA worker, source-anchored dual post-CV scoring and explicit final approval | Functional model calls, base-format-aware DOCX generation, worker integration, actual downloadable one-page DOCX/PDF/TXT, optional cover letter, authentic PDF/DOCX benchmarks and meaningful version reruns |
| **7 — Apply and tracking** | **PARTIAL** | Separate saved-job statuses and event timeline; explicit confirmation for Applied/Applied + Connected/Rejected; favorites independent | Complete applications entity linked to exact job/CV version, employer Apply links, interview/offer/withdrawn/rounds/notes/follow-up tracking, user-facing dashboard and submission test |
| **8 — Extension and Android assistant** | **PARTIAL** | Shared assistant bridge schema, reviewed Chrome/Android capture endpoint, current-page-only approved autofill contracts; architecture recorded in master | Actual Chrome extension code ported/connected to GuidOn, current-page DOM field mapping and user review on real supported ATS, browser auth, extension distribution/sign-off; native Android Career Browser remains later |
| **9 — Beta and scale** | **PARTIAL** | Build/tests, two-user local emulator privacy checks, upload quotas/feature gates, versioned API contracts | Production isolation checks, audit/export/deletion/retention, monitoring, rate/cost limits, support/backup, security/privacy review, measured 100-user reliability and staged onboarding |

**None of Phases 0–9 should yet be labelled fully COMPLETE.** Working service interfaces, passing local CI and a tested preview are valuable foundations, but the source plan's phase exit criteria require end-to-end demonstrations.

## Explicit release gates

| Release | Scope | Sign-off |
| --- | --- | --- |
| A | Account, CV-first verified profile, personal dashboard, PWA access | **NOT PASSED** — no live signup or AI CV extraction |
| B | Permitted discovery, user-owned save, readable JD and verified match | **NOT PASSED** — no live ingestion/matching integration |
| C — First complete MVP | Actual one-page tailored CV, review/download, employer Apply and recorded application outcome | **NOT PASSED** — live CV generation and linked applications are absent |
| D | Chrome extension, safe current-page autofill, user-confirmed tracking | **NOT PASSED** — shared bridge only, no linked browser extension build in this repository |
| E | Multi-user production scaling, privacy, recovery and support | **NOT PASSED** — hosting/security/operations pending |

## Immediate work order and non-negotiable proofs

1. **Safe public preview link:** Create a brand-new Firebase project, configure Hosting-only manual deployment, verify resulting `https://<actual-hosting-site>.web.app` on mobile/desktop, and document rollback. The preview remains visibly non-operational until real authentication and backend are enabled.
2. **Account release:** Connect Firebase web Auth, email/Google login, sessions, onboarding and real two-user hosted privacy tests. Keep client Firestore/Storage rules deny-all until reviewed.
3. **CV-first profile release:** Secure upload/quarantine/scan, extract text/format, AI parse to unconfirmed profile draft, user review and immutable confirmation. Sensitive details remain optional and separate.
4. **First real CV pipeline:** An approved JD/profile goes through match, brief gaps, user feedback, strictly one-page ATS-safe DOCX, rendered QA, actual pre/post scores and iterative versions; verify against several real CV layouts.
5. **Jobs/application release:** Permitted source ingestion and alerts with indexed discovery; complete applied/interview/outcome record linked to exact CV version, apply URL and explicit candidate confirmation.
6. **Desktop extension bridge:** Port/integrate the inspected legacy extension implementation into the GuidOn auth/job/profile/CV/API model. Test read-only/current-page autofill on supported ATS sites; never automatically Next, Continue or Submit. Android Chrome functionality cannot be delivered just by installing the PWA.
7. **Beta:** Two-unrelated-user production security, complete export/delete, retention/privacy, monitoring, budgets, retry/recovery and operator sign-off.

## Important technical boundaries

- **Hosted link:** Firebase Hosting `*.web.app` gives one responsive origin and can be installed as a supported PWA. **A real URL cannot be confirmed from repository configuration alone.** Hosting and a deploy identity must exist first.
- **Chrome extension:** The legacy Manifest V3 extension source has been located and inspected, but `feat/backend-foundation` contains **no integrated extension manifest/background/content scripts** as of this audit. Shared contracts are not proof the extension currently connects to GuidOn.
- **Mobile:** PWA cannot inspect arbitrary external-page DOM. The optional Chrome Custom Tab / Android WebView flow requires a separately validated native app and does not automatically share cookies/state.
- **No phantom submissions:** Opening an Apply URL or filling a current browser page never updates Applied automatically.
- **No fictional ATS:** Raw ATS is GuidOn's exact JD keyword coverage, Recruiter Fit is an evidence-backed internal rubric, and Smart Sort is a separate opportunity-ranking heuristic.
- **Creative mode:** More compelling truthful framing is allowed, but no unverified job titles, employers, department history, degrees, metrics or work-eligibility claims.
- **Privacy:** User-owned jobs, JDs, CVs, model transcripts and Answer Bank must not be exposed via public Hosting or shared catalog records.

## Evidence and follow-up

- Source: `docs/GUIDON_CAREER_MASTER_PLAN.md` original phases 0–9, Addendum v1.1 Sections 11–18, and Addenda v1.2/v1.3.
- Current CI: `.github/workflows/quality.yml` (frontend build, backend contracts, synthetic render QA, 2-user emulator suite).
- Contracts: `docs/BACKEND_CONTRACT.md`, `docs/CV_BUILDER_STRICT_SPEC.md`, `docs/JOB_DISCOVERY_CREATIVE_MODE.md`.
- Hosting manual deployment: `.github/workflows/deploy-hosting.yml` once enabled.
- Extension/API integration: `docs/CHROME_EXTENSION_INTEGRATION.md`.

Re-audit each phase only after corresponding live acceptance evidence is attached. Do not convert *partial* to *complete* because an endpoint or schema compiles.


### Legacy extension discovery added to the audit

The existing Manifest V3 source was located at [`abhisheknair607-ux/automate_cv/experimental/garamaal-autofill/extension`](https://github.com/abhisheknair607-ux/automate_cv/tree/main/experimental/garamaal-autofill/extension). It contains DOM form inspection and filling code, but also a `clickNext()` control and connections to the older candidate-specific platform. **Never port that Next/Continue automation**; remove it and verify only current-page, reviewed filling. The old source does **not** satisfy GuidOn Phase 8 until its code is adapted and tested with owner-authenticated GuidOn APIs.


## Additive audit dimension — Gmail and integrated application events

Master Plan **Addendum v1.4** introduces two distinct email capabilities that do **not** change the incomplete status of the original Phases 0–9.

| Additional capability | Status | Release proof required |
| --- | --- | --- |
| Gmail job-alert consent and import | **PLANNED** | Account-authorised discovery, dedup, correct privacy/revoke behavior and no false Applied events |
| Gmail automated application confirmation/recruiter matching | **FUTURE** | Correctly link multiple same-employer roles to application IDs and preserve source evidence |
| Gmail interview invitations, scheduling and rescheduling | **FUTURE** | Timezone-safe appointment records and append-only reschedule history |
| Gmail assessments, offers/rejections, notifications | **FUTURE** | Source verification, user-confirmed consequential changes, sensitive-data controls |
| Optional Calendar and career analytics | **FUTURE** | Separate consent, reporting correctness and deletion/export controls |

No Gmail OAuth connector, forwarding pipeline, email watch, email-status classifier or Calendar writer is implemented in this branch. UI/UX references must treat these as future features, not existing dashboard data. The linked [Gmail Tracking Roadmap](GMAIL_INTEGRATION_APPLICATION_TRACKING.md) describes the planned state/event matching model and consent boundaries.

**Reminder:** The legacy extension's six target functions (Capture, Save, Make CV, Recommend CV, current-page Autofill, Track) remain a separate migration track. The extension is not complete until real GuidOn integration, authentication and **no Next/Continue/Submit** tests pass. The independent `web.app` address is still not verified.


## Core implementation checkpoint — 23 November 2026 (post source audit)

The original phase conclusions **remain PARTIAL**, but evidence increased after the initial audit:

- **Phase 0:** Firebase project IDs supplied; protected Hosting-only and Functions-only workflows and public-client release flag added. Actual cloud ownership, billing, Hosting site, Web SDK config, deployed URL and IAM remain **unverified**.
- **Phase 1:** React email/Google registration, login, reset, authenticated session bootstrap and private workspace have actual source implementations; two-user emulator tests exist. Live Firebase sign-in not yet verified.
- **Phase 2:** UI for manually editing and confirming profile, job/education STAR and numeric evidence now calls secured APIs. CV-first upload, document scan, AI extraction, original-base format save and consent/export still pending.
- **Phase 3:** Signed-in dashboard uses backend job/application/CV counts, but live deployment and mobile install not yet confirmed.
- **Phase 4:** Private job listing/detail, manual addition, filtering, favourites and status API/UI exist; real feeder import and indexed multi-user search pending.
- **Phase 5:** JD cleanup and source-backed manual confirmation available in CV Studio; no live AI match/gap worker yet.
- **Phase 6:** Real deterministic evidence-only DOCX/PDF worker and synthetic/actual rendering QA tests added; no live AI orchestration, base-CV style retention or real download flow yet.
- **Phase 7:** Application entities, user-confirmed submissions, append-only timeline, interview record and job summary synchronisation now implemented in backend and temporary UI; no live deployment and email-derived events.
- **Phase 8:** Chrome/Android bridge remains only contracts; legacy extension not ported and no safe live autofill tested.
- **Phase 9:** Local CI and two-user emulator suite; actual production privacy, cost, credentials, retention/export and performance gates remain pending.

Project mapping: Firebase **`guidon-career-fcda2`**; separately supplied GCP project **`guidon-career`** is *not* interchangeable and is reserved for possible separately authorised workers. See [Firebase Project Setup](FIREBASE_PROJECT_SETUP.md). **No live `web.app` release is verified.**
