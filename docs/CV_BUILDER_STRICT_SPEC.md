# GuidOn Career — Strict CV Builder Engineering Specification

**Version:** 1.0, 23 November 2026
**Authority:** Additive to the preserved Master Development Plan and Backend-First Execution Plan.
**UI ownership:** The UI/UX designer chooses the interface. These rules belong in backend contracts, validation, evidence, auditing and render QA.
**Implementation status:** Schema, scoring functions, staging contracts, audit APIs and render inspection worker committed as draft code; no production-ready CV-generation service or live AI adapter is claimed.

## Non-negotiable end-to-end staged flow

| Stage | Operation | Required audit result | Gate |
|---|---|---|---|
| 1: JD understanding and cleaning | Preserve original JD; conservatively normalise noise; extract and categorise required/preferred qualifications with exact source quotes; let user verify ambiguities | Original, cleaned JD, cleanup notes, requirements, tool/model usage | Never silently alter substantive JD requirements |
| 2: Verified profile matching | Load a particular confirmed profile revision; link JD requirements to employment, education, STAR stories and standalone numerical achievements | Profile snapshot reference, requirement-to-evidence mapping, missing evidence, traceability and AI input/output | Unverified AI extraction is not career evidence |
| 3: Gap analysis before CV | Calculate both scores from verified profile evidence; show concise, highest-priority gaps (target at most five; each maximum 25 words and 180 characters) | Pre-CV Raw ATS, pre-CV Recruiter Fit, keyword coverage, unresolved requirements | User must review gaps and acknowledge feedback before CV generation |
| 4: User feedback | User confirms missing facts, corrects evidence or chooses to proceed without inventing experience | Comments, approvals, new profile revision if applicable, changed gap status | Material new claims require verification; re-run Stage 2 and pre-CV scoring when evidence changes |
| 5: Generate tailored CV | Select high-value verified achievements, compress STAR evidence into truthful action/result bullets, preserve selected base CV format where feasible | Versioned generation input, prompts, source evidence IDs, output content, usage and selected template | No unsupported facts or qualifications |
| 6: Render and quality-control | Convert actual DOCX to PDF in a prebuilt worker; inspect page count, text readability, margins, left/right alignment, font size and bullet line count | DOCX, PDF, text extraction, render report, failure diagnostics | **Exactly one page; never approve a failed render** |
| 7: Score after CV | Recalculate Raw ATS on *actual exported CV text* and Recruiter Fit on evidence visibly represented in the CV | Post-CV scores, matching/missing keywords, recruiter rubric, gaps and score delta | Post-score tied to immutable CV version |
| 8: User review and versioning | User may request changes; regenerate, render, score and compare each version, retaining complete history | V1, V2, V3; comments, revisions, prompt and model usage, scoring before/after | A revised CV cannot overwrite or silently change an earlier version |

The flow must support failures, retries and manual intervention without silently advancing a stage, charging again for a previously completed idempotent operation, or erasing user feedback.

## Scoring system A — Raw ATS Keyword Coverage

**Formula:** `100 × (distinct relevant JD keyword phrases appearing in the scored evidence/document) ÷ (all distinct relevant JD keyword phrases)`.

Rules:
- The keyword set is extracted from the **cleaned JD**; source quote is mandatory and reviewed.
- Use normalised, case-insensitive, punctuation-tolerant whole phrases.
- Count each relevant JD term **once**, regardless of repeated mention; do not reward stuffing or unrelated terms.
- Record required versus preferred classifications, matched phrases and missing phrases.
- For pre-CV, the backend derives scored text deterministically from confirmed profile experience, education, qualifications, skills, completed confirmed STAR stories and **confirmed** standalone numeric achievements. Model-generated prose is not trusted as the scored source; this is *potential evidence coverage*, not actual CV parsing.
- For post-CV use the **text extracted from the final rendered candidate CV**; never score the pre-render draft as if it were exported.
- If the JD yields no defensible relevant terms, score is **N/A** and explicitly indicates insufficient information.
- Scores belong to GuidOn, **not a named employer ATS** and do not represent any hiring probability.

## Scoring system B — Recruiter Fit

A distinct, inspectable rubric scored only with **verified evidence references**, using category ratings 0–4:

| Dimension | Weight |
|---|---:|
| Directly relevant work experience | 30% |
| Quantified results and achievements | 20% |
| Skills and applied tools | 20% |
| Seniority and responsibility alignment | 15% |
| Education and qualifications | 10% |
| Verified current/future work eligibility | 5% |

**Formula:** `sum(category_rating / 4 × category_weight)`.

Rules:
- Every positive score requires source evidence IDs and a concise explanation.
- Unclear eligibility, work history or absent evidence is *unknown*, not an assumed positive or negative.
- If any required rubric category cannot be assessed credibly, overall Recruiter Fit remains **N/A / needs review**; never fabricate precision.
- Before CV generation assess **all verified candidate evidence**; after CV generation assess **only evidence actually represented in that CV**. A saved CV version includes source-linked visible claim excerpts; the quoted wording must occur in the rendered exported text, and referenced evidence IDs must belong to the confirmed profile. Scoring rejects claims citing invisible/unsupported evidence.
- Report category scores, supporting evidence, missing evidence and recommendations; rubric version is immutable for historical comparability.
- Revisions show **pre / V1 / V2 / ...** score trend for both systems, without promising a specific 90% threshold.

## Profile evidence: distinct metrics and STAR records per role and degree

For every **employment** and **education** entry, store:
- Structured title, organisation, dates and ordinary responsibilities.
- Separate `keyNumbers[]`: label, numeric value, unit, timeframe, description, provenance and confirmation state.
- Separate `starStories[]`: Situation, Task, Action, Result, linked metric IDs, provenance and verification.
- STAR stories may be incomplete drafts while onboarding; user-confirmed stories require all four sections.
- The engine uses numeric claims only if the user has confirmed the number; a STAR item cannot reference a metric from another job or education entry without explicit additional provenance.
- Preserve the source base CV **unchanged** as separate evidence; the selected format is a distinct versioned reference.

**STAR output is natural prose, not labels:**

`Automated monthly finance reconciliations: shortened reporting cycles by 25%; strengthened review controls.`

Only use numbers supported by the user's saved evidence.

## One-page CV and formatting gates

Hard release criteria for every final CV version:

1. Actual **rendered page count = 1**. Neither AI assurance nor section word estimates can substitute for rendering.
2. Maintain the user's selected base CV typeface, headings, section order, size/spacing and style wherever this remains legible and parseable. If the source is incompatible, offer a controlled fallback with transparent review.
3. Use a readable single-column order for ATS, no decorative graphics, reliance on header/footer text boxes, or hidden keyword content.
4. Consistent left edge for section headings and role titles; right-aligned dates and key coordinates. **Maximum measured anchor drift: 1 PDF point**, with real PDF geometry checks and visual review.
5. Body font **at least 10 pt** and horizontal margins **at least 0.5 inch**. Never solve a page overflow by shrinking to illegibility.
6. STAR-derived bullets: action, responsibility and result grounded in evidence; **maximum two rendered lines per bullet**.
7. Avoid hyphens/dashes within narrative bullets and paragraphs; use commas, colons and semicolons where clearer. Dashes may appear in headings or legitimate identifiers/dates when necessary.
8. Inspect for clipping, unexpected line wraps, missing glyphs, absent contact details, missing evidence and distorted reading order.
9. DOCX and PDF must represent the same approved version; preserve the machine-readable extracted CV text for score audit.
10. If essential verified content cannot be fitted on one page without hurting readability, **block final approval and ask which lower-priority items to omit**, rather than quietly produce two pages or invent a compromise.

A rendering QA script now exists at `workers/cv_render_qa.py`. It checks page count, margins, text extractability, minimum font, alignment of recognised section headings and dates, and detected bullet-line counts. The report requires further visual/evidence review: these automated tests do not prove pixel-perfect fidelity or semantic STAR quality. A prebuilt LibreOffice image avoids installing LibreOffice per CV.

## Complete, private per-job audit folder

Use a **human-readable name plus stable UUID** to prevent collisions:

`Company Name - Designation - Location__<workspace-UUID>`

Private GCS root: `users/<auth.uid>/job-cv-workspaces/<folder-name>/`.

Expected versioned paths (some are future writer contracts and are **not yet produced by a live AI workflow**):

```text
Example Company - Financial Analyst - Dublin Ireland__<uuid>/
  01-jd/
    original.json
    cleaned.json
    stage-<run-id>-input.json
    stage-<run-id>-output.json
  02-match/
    profile-snapshot-<revision-id>.json
    stage-<run-id>-input.json
    stage-<run-id>-output.json
  03-gaps/
    pre-cv-score-<score-id>.json
    gaps.json
    feedback-<comment-id>.json
  04-generation/
    stage-<run-id>-input.json
    stage-<run-id>-output.json
  05-cv/
    cv-version-<id>.docx
    cv-version-<id>.pdf
    cv-version-<id>.txt
    post-cv-score-<score-id>.json
    rendered-qa-<version-id>.json
  06-usage/
    model-<event-id>.json
  07-revisions/
    request-<revision-id>.json
    ...
```

Firestore holds an authenticated per-user workspace manifest, transition history, version references, hash and size metadata; Cloud Storage retains larger private, immutable files. No public directory listing and no shared account folders.

### Audit invariants
- Save raw/cleaned JD, profile revision references and evidence, model input/output, user comments, prompt/rubric version, gap reports, scores, rendering diagnostics, CV outputs and every revision.
- Artifact files are **write-once**, have SHA-256 integrity checks, and cannot be overwritten by a retry.
- Preserve every failed attempt and reason; do not erase previous versions when a user reruns.
- The signed-in user may inspect own small JSON audit files through `readMyCvAuditArtifact` and view a compact report through `getMyCvWorkspaceReport`; a separate secure binary download/export API is required for full documents.
- Production retention, account deletion/export, privacy consent and file scanning must be resolved before real CVs are uploaded.

## Token usage and cost counter

Every provider AI call, stage and rerun must record:
- Provider, model ID, stage, provider request ID, measurement provenance.
- **Input, output, cached input, reasoning-output and total tokens** when supplied by the provider.
- Total per application and per-version breakdown, plus token counts for failed/retried paid calls whenever actually reported.
- Optional USD price snapshot, source URL and timestamp. Cost is estimated only when enough pricing information exists; otherwise display `pricing unavailable`.
- Do not invent measured token counts, infer a cost from word count or mislabel a calculated estimate as provider billing.

Actual provider usage is tracked server-side through `recordCvModelUsage` and summarised by `getMyCvWorkspaceReport`. Model adapters and billing controls are **not deployed** yet.

## Readiness and unresolved work

Committed foundation:
- Structured job and education metric/STAR schemas, 2 score calculators, strict stage and gap contracts, JD quote/evidence grounding checks.
- Private per-job folder creation, write-once artifact writer, score snapshot persistence helper, token meter, gap/revision request endpoints, authenticated report and small audit JSON reader.
- PDF/DOCX renderer QA worker and automated unit and two-user security tests.

Still required for a working CV builder:
- New isolated Firebase project, safe original-CV upload and malware checks, consent and private storage activation.
- Provider integrations for JD understanding, profile matching and truthful CV drafting with real usage telemetry and budget controls.
- Reliable DOCX base-template editing and **actual one-page candidate rendering** wired to the QA worker, followed by human preview/approval and full output downloads.
- Real-life tests against representative CV templates, several ATS systems, role types and multiple independent users.
- Secure full-folder download/export and deletion/retention lifecycle.

## Primary references
- Greenhouse resume parsing limitations and problematic graphics, headers, text boxes, columns: https://support.greenhouse.io/hc/en-us/articles/200989175-Unsuccessful-resume-parse
- Notre Dame ATS readability and margins: https://undergradcareers.nd.edu/preparation/professional-documents/resume/
- Harvard Career Services results-focused accomplishment writing: https://careerservices.fas.harvard.edu/resources/create-a-strong-resume/
- UC Santa Barbara single-column ATS guidance: https://career.ucsb.edu/get-hired/resumes
- OpenAI provider token usage reporting: https://help.openai.com/en/articles/4936856-understanding-and-counting-tokens
- Firestore document size quota, motivating artifact storage separately from record metadata: https://docs.cloud.google.com/firestore/quotas


## Addendum v1.1 — Opt-in creative drafting and unconditional no-tables rule

The user selects **Evidence First** (default) or **Think Creatively** before Make CV. The creative mode can change sentence structure, priority, accomplishment focus, transferable-skill wording, and suggest accurate functional department descriptors. It must not rewrite an official employer, title, date, formal department, education, visa rights or unverified KPI. A descriptive functional label cannot be presented as a formally held department. Each creative change cites the confirmed source evidence and is presented for user approval. The selected mode is saved with an immutable audit record and can be changed on rerun.

**Generated DOCX must contain zero tables, including invisible layout tables.** It must also contain zero text boxes, a single column, zero decorative drawings and no material content in headers/footers. The `cvQualityInputSchema` now requires verified OpenXML counts and rejects any violations. The PDF geometry and strict one-page checks still apply. The uploaded base CV stays unchanged even if an ATS-safe output needs structural adaptation.

See [Job Discovery and Creative Mode](JOB_DISCOVERY_CREATIVE_MODE.md) and Master Plan Addendum v1.3 for per-user job favourites, statuses, smart sort and screenshot-inspired filter controls.
