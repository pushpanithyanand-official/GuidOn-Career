# GuidOn Career — Job Discovery, Favourites and Creative CV Mode

**Status:** Backend-first implementation in draft PR #1. Live Firebase project and production discovery ingestion are not yet configured. The UI/UX designer may use any presentation system.
**Source:** Master Plan Addendum v1.3 (append-only), screenshot of existing Filter & Sort panel supplied 23 November 2026.

## 1. Job listing discovery experience

The main results list displays vacancy metadata plus per-user states and a favourite toggle. Jobs should be ordered by **Smart Sort: Best matches first** by default, based on the user-confirmed career profile and target roles.

The screenshot's Filter & Sort panel identifies these inputs:

| Input | Data contract |
| --- | --- |
| Company | Multi-select search, include or exclude several employer names |
| Location | Multi-select search, include or exclude several location names |
| Department / Function | Multi-select search; employer-verified or **inferred from title** provenance clearly shown |
| Designation | Multi-select search, include/exclude exact vacancy titles |
| Discovery category | Job source category, e.g. employer ATS versus external job link |
| Existing job status | Active, all, excluded, CV pipeline, applied, unapplied; or selected statuses |
| Sort jobs | Smart Match, newest, oldest, company A–Z, designation A–Z, location A–Z, recent status change |
| Favourite only | True/false independent of application stage |
| Keyword search | Employer/title/location/department/summary/skills |
| Sponsorship | All, confirmed yes/no, unknown. Unknown never means No. |

The UI must support **Clear all** (restore default filters) and **Apply filters**. Preserve user filters across visits and devices. Future planned visa/pay filters remain in the master plan; numeric salary range filtering requires an indexed backend and has not been implemented here.

**Important:** Filter across all eligible jobs *before* result pagination, never only the current visible page. `getMyJobListings` currently scans the complete small-beta catalog, capped at 5,000 jobs, then filters/sorts/pages; it refuses a larger catalog rather than silently hide matches. For a genuine multi-user scale launch, substitute an indexed query/search service with consistent filter semantics, resource and cost limits, ingestion provenance, caches and pagination.

## 2. Smart Sort

An **explainable heuristic, not the Raw ATS or Recruiter Fit score**, currently uses:
- Exact/partial target role overlap: up to 45 points
- Target-location match: 20 points
- Confirmed skill tags matching job skill tags: up to 25 points
- Relevant previous employment titles: up to 10 points
- Freshness tie-break: up to 5 points

Display short reasons, not hiring probability. If the user lacks a confirmed profile, Smart Sort falls back to Newest rather than guessing career targets. Never silently infer sponsorship or present inferred departments as employer-verified. Future smarter matching can incorporate the strict evidence-based matching engine after it is available.

## 3. Favourites and workflow statuses

Canonical values (user-facing labels in parentheses):

```text
discovered          Discovered
interested          Interested
cv_preparing        CV Preparing
cv_prepared         CV Prepared
applied             Applied
applied_connected   Applied + Connected
rejected            Rejected
not_interested      Not Interested
snoozed             Snoozed
```

Favourites are orthogonal to statuses: an Applied + Connected job can still be a favourite. State and timeline are user-owned `users/{uid}/savedJobs/{jobId}` and `events/{changeId}`; public `jobCatalog/{jobId}` stores only vacancy metadata. Concurrent updates check an expected version. Any consequential Applied/Connected/Rejected status update requires user confirmation and must not be guessed from opening an apply link.

Dashboard counters in the API include Discovery, CV Preparing, CV Prepared, Applied, Applied + Connected, Rejected, Not Interested, Favourites and Active. A stable event ledger supports history and eventual analytics.

## 4. Authenticated APIs for the UI/UX developer

| Callable | Payload | Result |
| --- | --- | --- |
| `getMyJobListings` | `{filters?,sort?,page?,pageSize?}` | Page of jobs including `userState`, `smartMatch` score/reasons, `totalMatches`, facets, status counts and pagination |
| `setMyJobDecision` | `{jobId,changeId,expectedVersion,status?,favorite?,userConfirmed?,note?}` | Idempotent, versioned per-user status/favourite update |
| `getMyJobTimeline` | `{jobId,limit?}` | Most recent user-specific status/favourite events |
| `saveMyJobFilters` | Filter schema | Saves per-user filter preferences |
| `getMyJobFilters` | `{}` | Restores per-user filter preferences |
| `setMyCvGenerationMode` | `{workspaceId,modeChangeId,expectedStageVersion,generationMode,acknowledgeFactPreservation:true}` | Stores Evidence First or Think Creatively as audited pre-CV choice |

Query schemas are in `functions/src/job-discovery.ts`; callable implementations are in `functions/src/job-discovery-api.ts`. The creative contract and validation are in `functions/src/cv-generation-mode.ts`.

## 5. “Think Creatively”: what changes and what cannot

`generationMode = 'evidence_first' | 'think_creatively'`

**Evidence First (default):** Conservative rewriting of confirmed experience, STAR outcomes and metrics.

**Think Creatively (opt-in):** More flexible ordering, compelling accomplishment sentences, stronger transferable-skill framing and proposals for accurate **descriptive functional-area labels**. For example, a confirmed Tax Analyst who performed complex reconciliations may be described as having “Financial Operations & Reporting focus,” but still retains their real employer, Tax Analyst title and any official department in the employment heading. The label must not be represented as the employer's actual department unless evidenced.

Only structured creative suggestions are allowed: `achievement_reframe`, `functional_department_label` and `summary_or_skills_reframe`. Each must identify the exact employment entry and confirmed evidence IDs; unsupported IDs are rejected. Suggestions can be reviewed/approved by the user before being incorporated. No unofficial increase in title seniority, false qualifications, unverifiable amounts, incorrect dates or unsupported skills may be introduced.

Both modes use the exact same **JD → profile matching → concise gaps → feedback → one-page CV → Raw ATS + Recruiter Fit after render → versioned revisions** gates. Neither mode automatically targets a higher score by keyword stuffing.

## 6. Absolute generated CV structure requirement

**NO TABLES in generated DOCX**, including layout tables and nested tables. **One text column, no text boxes, unnecessary graphics, or important header/footer text.** Dates use genuine right-aligned text/tab stops; not a hidden table.

The render worker `workers/cv_render_qa.py` checks the actual DOCX OpenXML parts for prohibited structures, including header/footer content, and joins those findings with the PDF one-page, margin, font, bullet-wrap and alignment report. The backend quality schema rejects any nonzero table/textbox/graphics/header-footer counts or multiple columns.

The base CV itself is stored unchanged even when its original layout is not ATS-safe. A candidate output must use a legible ATS-safe adaptation in that case, with the user shown the differences. Final QA requires actual DOCX/PDF inspection; neither the prompt nor a generated ATS score substitutes for a valid render and user review.

## 7. Current implementation boundaries

Built in the feature branch:
- Typed catalog/source/status/filter/Smart Sort contracts and independent user favourites
- Callable job listings with full-first filtering, status updates and history, filter preferences
- Typed creative suggestions, fact-preserving prompt policy and pre-draft mode selection
- No-tables DOCX structural inspection and strict render QA criteria
- Unit tests and two-user Firebase emulator integration coverage

Pending:
- Live job aggregator, large-scale indexed search and real-time freshness controls
- New dedicated Firebase project, privacy review and production deployment
- Real AI adapters, user-facing diff/approval UI, generation worker wiring
- Verified real-CV template benchmarks; no live CV generation is claimed

## Research and compatibility

The US Department of Labor's March 2026 employment workshop recommends avoiding tables and columns in a resume and submitting the required file format. Lever's documentation confirms Word and PDF parsing support. These motivate a conservative, readable one-column document rather than pretending all ATS products use the same scanner:

- https://www.dol.gov/sites/dolgov/files/VETS/files/DOL_EW_ParticipantGuide_6.0_Update1-March2026.pdf
- https://help.lever.co/s/article/Understanding-Resume-Parsing
