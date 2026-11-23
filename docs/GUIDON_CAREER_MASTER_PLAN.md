# GuidOn Career — Master Development Plan

**Document status:** Initial product roadmap / build baseline  
**Version:** 1.0  
**Date:** 23 November 2026  
**Intended repository:** `pushpanithyanand-official/GuidOn-Career`  
**Delivery strategy:** Build a secure, useful end-to-end application first; improve automation after the essential journey works.

---

## 1. Product vision

GuidOn Career is a multi-user platform for managing the full job-search and application process. A person should be able to sign up, create one reusable Career Intelligence Profile, discover relevant vacancies, choose a job, analyse the role, generate an accurate tailored CV and optional cover letter, proceed to the employer's application, and track what happens afterwards.

The platform should serve an individual user from their first login through to the eventual outcome of each application. It should be suitable for international students, graduates, career changers and experienced professionals without being designed around any one candidate.

### Product promise

**One secure account. One evolving professional profile. Relevant jobs. Tailored applications. Complete history.**

### End-to-end user journey

1. **Register / log in:** The user signs up and gets an independent, private account.
2. **Build profile:** The user completes personal, professional, qualification, work eligibility, career preference and common employer application information.
3. **Find jobs:** The platform surfaces permitted job opportunities and supports search, filters, direct links and manually added jobs.
4. **Review a job:** The user opens a job-detail page showing the description, requirements, context, match analysis and next actions.
5. **Prepare an application:** The user generates a job-specific CV and, when useful, a cover letter based on verified profile evidence.
6. **Review and apply:** The user checks and downloads the files or uses them on the employer's website. Submission remains under user control.
7. **Track the result:** The user marks statuses, records dates, notes, follow-ups, interviews and outcomes, and can see documents prepared for that application.
8. **Improve continuously:** Newly verified information and approved answer corrections become available for future applications.

The product must work even without a browser extension or automatic job submission.

---

## 2. Build principles

1. **User-first:** Every major screen must support the end-to-end user journey, not an isolated feature showcase.
2. **Multi-user from day one:** No shared candidate account or fixed two-person configuration; every private record belongs to its user.
3. **Profile as source of truth:** Professional facts, achievements, qualifications and approved answers are stored once and reused.
4. **Accurate applications:** Never invent experience, qualifications or employment eligibility; distinguish verified facts from unconfirmed suggestions.
5. **Human-controlled applications:** Do not advance external application pages or submit forms without deliberate user action.
6. **Progressive onboarding:** Collect essential information first, then let the user enrich their profile as needed.
7. **Privacy by design:** Ask only for necessary data, avoid mandatory sensitive disclosures, and provide deletion/export pathways.
8. **Useful before automation:** Job browsing, CV creation and status tracking must not depend on a browser extension.
9. **Reusable foundations:** Keep job, account, profile, CV and application records designed for future mobile apps and extensions.
10. **Incremental releases:** Each phase ends with a verifiable user-facing outcome and quality gates.

---

## 3. Product structure and navigation

### Initial navigation

- **Dashboard:** Personal overview, profile completion, recommended next actions, recently viewed or saved jobs, application activity.
- **Discover Jobs:** Search, filter, view details, save and shortlist jobs.
- **My Career:** Career Intelligence Profile, evidence, career goals and application answers.
- **My Applications:** Saved and prepared opportunities, application statuses, important dates and notes.
- **CV Studio:** Generate, review, download and manage CV/cover-letter versions for selected jobs.
- **Account / Settings:** Login methods, notifications, privacy controls, preferences and eventually subscription/usage.

### Later navigation

- **Application Assistant:** Supported job-page capture and user-controlled autofill.
- **Optional networking/contact features:** Explicitly outside the first complete release.

The interface should be responsive and accessible on desktop and mobile. Keep page conventions, buttons, terminology and status labels consistent throughout.

---

## 4. Development roadmap

### Phase 0 — Project foundation

**Goal:** Establish an independent GuidOn Career project that can be developed, tested and deployed reliably.

**Scope**
- Initialise the source repository, documentation and project conventions.
- Set up a Google Cloud/Firebase environment for the new product, separate from any existing production platform.
- Create the application shell, shared visual identity, navigation and initial page placeholders.
- Establish environment configuration, deployment, error logging, basic automated checks and cost safeguards.
- Define early privacy, account ownership and access-control principles.

**Completion criteria**
- A developer can run the application and deploy a non-sensitive starter version.
- Secrets are never committed to the repository.
- There is a documented way to configure development and production environments.
- The repository contains this roadmap and a clear setup guide.

**Dependencies:** Repository write access and a Google Cloud/Firebase project owner for hosted deployment.

### Phase 1 — User registration, login and account lifecycle

**Goal:** Any new user can access a private workspace without administrator intervention.

**Scope**
- Sign up with Google and email/password; sign in, sign out and reset password.
- Persistent login sessions and clear handling of expired or invalid sessions.
- First-time onboarding and returning-user routing.
- Basic account identity, preferences and account settings.
- An account can be created only for the authenticated individual.
- Clear sign-in errors and basic account recovery support.

**Completion criteria**
- Two independent users can register and sign in on separate accounts.
- They land in separate workspaces and cannot read or change each other's private information.
- Returning users do not need to repeat onboarding.

### Phase 2 — Career Intelligence Profile and application information

**Goal:** Build a trustworthy, reusable profile that supports both CV generation and employer application questions.

**Scope: profile categories**
- **Personal and contact:** Legal/preferred name, communication details, location, professional links.
- **Professional summary and experience:** Headline, past roles, employers, dates, achievements, responsibilities and evidence.
- **Education and qualifications:** Institutions, degrees, certifications, licences, accomplishments and relevant dates.
- **Skills and tools:** Skills, software, languages, proficiency and experience context.
- **Projects and achievements:** Evidence that can support job requirements and CV statements.
- **Career goals and job preferences:** Target roles, locations, working style, salary expectations, notice period and relocation/travel preferences.
- **Work authorisation:** Country-specific eligibility, permit details and current/future sponsorship requirements where appropriate.
- **Employer screening information:** Common questions relevant to professional applications, with safe, explicit answer confirmation.
- **Answer Bank:** Verified reusable responses to recurring questions; record question meaning, source, confirmation, jurisdiction, scope and freshness.
- **Optional sensitive disclosures:** Separate, strictly optional and controlled; do not auto-populate without appropriate user approval.

**Experience requirements**
- Users can add, edit, remove and revisit all repeatable entries.
- Users can skip nonessential sections and see progress/completeness guidance.
- The system distinguishes user-verified facts, incomplete fields and answers that require review.
- CV-generated claims can be traced back to stored profile evidence.
- The profile is not locked to a single country, profession or career stage.

**Completion criteria**
- A new user can complete a useful profile from scratch, leave and return without losing data.
- Employer-related answers are stored with enough context to prevent misleading reuse.
- One user's profile is inaccessible to any other ordinary user.
- Optional sensitive disclosures are not required and not silently included in general AI context.

**Implementation approach:** Build the essential profile editor first, then add extended employer information and the Answer Bank within this phase.

### Phase 3 — Personal dashboard and core navigation

**Goal:** Give each user a coherent, useful home page connecting their profile and future applications.

**Scope**
- Profile completion indicator and suggested next actions.
- Entry points for Discover Jobs, My Career, CV Studio and My Applications.
- Recent activity and saved progress.
- Basic notifications, empty states, and informative prompts for incomplete setup.
- Consistent desktop and mobile navigation.

**Completion criteria**
- A new user understands what to do next after first login.
- A returning user can quickly resume the last task and find saved information.
- No placeholder screen pretends a feature is operational when it is not.

### Phase 4 — Job discovery, job details and saved jobs

**Goal:** Users can find and manage relevant vacancies without leaving GuidOn Career until they choose to apply.

**Scope**
- Job Discovery feed with search, filters, sorting and relevant vacancy cards.
- Job details showing title, company, location, source, description, requirements and external application link.
- User-specific preferences based on career goals, geography and roles.
- Save, dismiss, shortlist and return to jobs.
- Manually add a vacancy by URL/details; support permitted job alert and feed integrations incrementally.
- Detect duplicates without deleting each user's individual history or status.
- Clearly show source and availability/freshness when known.

**Completion criteria**
- A user can find or manually add a job, open its details and save it to their own workspace.
- Different users can save the same vacancy independently with different preferences and statuses.
- Jobs displayed are based on real user entries or permitted sources; the product does not promise universal access to all job listings.

### Phase 5 — Job analysis and profile matching

**Goal:** Help a user decide whether and how to apply before spending time generating documents.

**Scope**
- Extract the main requirements from a selected job description.
- Compare the requirements against verified education, employment, skills, achievements and preferences.
- Explain strengths, missing evidence, incomplete profile details and important eligibility questions.
- Recommend the most relevant experiences/projects for this application.
- Let the user add or correct factual evidence before generating a CV.
- Keep match assessments understandable and avoid presenting an unvalidated score as a hiring probability.

**Completion criteria**
- A selected job has a readable job-analysis view.
- The user can see what profile information supports the proposed application.
- Gaps and possible improvements can be reviewed without fabricated credentials.

### Phase 6 — Tailored CV and cover-letter studio

**Goal:** Turn a selected vacancy and approved profile evidence into a useful, professional application document.

**Scope**
- Generate a job-specific CV based on selected, verified evidence.
- Offer an optional cover letter tailored to the same vacancy.
- Provide a clear review screen for claims, wording, formatting and missing details.
- Allow targeted edits, regeneration, and retention of prior versions.
- Save generated documents to the correct user and job/application record.
- Support downloadable formats suitable for employer upload.
- Track processing status, failures, retries and usage without charging repeatedly for the same successful work where preventable.
- Protect against accidental unsupported claims and keep the user in control of final documents.

**Completion criteria**
- User opens a job, chooses Make CV, reviews an output, saves or downloads it, and can locate it later.
- A second version does not overwrite the first without user intent.
- No other user can access or download these documents.

### Phase 7 — Apply journey and application status tracking

**Goal:** Complete the essential product journey from discovery to a recorded application outcome.

**Scope**
- Clear Apply action from each job, linked to the employer's authentic application destination when available.
- Easy access to the CV and cover letter prepared for that role.
- Guided checklist for application preparation, with the user navigating/submitting the external application.
- Explicit status controls: Interested/Saved, Preparing CV, CV Ready, Applied, Connected, Interview, Offer, Rejected, Withdrawn, Snoozed and other relevant outcomes.
- Record application dates, notes, next steps, follow-up dates, interview rounds and outcomes.
- Link each application to the job and exact CV/cover-letter version used.
- Personal dashboard metrics and searchable application history.
- Prevent false 'Applied' events: opening a job link alone does not prove an application was submitted.

**Completion criteria — First complete product milestone**
- A first-time user can register, create a career profile, find a job, open its description, prepare a tailored CV, follow the application link, record the submitted application and update its subsequent statuses.
- This journey works independently for multiple users without an extension.

### Phase 8 — Browser assistant and assisted autofill

**Goal:** Reduce repetitive typing while preserving user control and correctness.

**Scope**
- Recognise supported external employer application forms and relevant fields.
- Use the verified profile and question Answer Bank to prepare answer suggestions.
- Clearly distinguish saved/verified answers, contextual inferences and unknowns.
- Allow the user to inspect, edit and approve answers before filling.
- Fill supported fields on the **current page only**; never click Next, Continue or Submit automatically.
- Ask before saving corrections for reuse; distinguish global facts from employer-specific responses and reversed wording.
- Record a user-confirmed application update back in GuidOn Career.
- Validate browser compatibility across real application systems before broad availability.

**Completion criteria**
- Supported forms are filled accurately enough to reduce user effort; fields are checked after filling.
- Unsupported or sensitive questions remain visibly unresolved rather than receiving hidden guesses.
- The core web application remains fully usable if autofill is unavailable.

### Phase 9 — Public beta, reliability and scaling

**Goal:** Turn the functional first product into a safe, supportable service for wider use.

**Scope**
- Structured testing with multiple independent accounts and real job-application scenarios.
- Privacy controls, transparent notices, data export/deletion and retention policies.
- Monitoring, usage/cost controls, error handling, backup/recovery plans and operational support.
- Improve onboarding, discovery relevance, CV review quality, accessibility and mobile usability.
- Introduce quotas, payments/credits and subscriptions only when a defined commercial model is ready.
- Expand integrations and optional mobile features based on validated demand.

**Completion criteria**
- Repeatable end-to-end test scenarios pass for unrelated users.
- The service can be operated and supported without exposing personal data or creating uncontrolled AI costs.
- Commercial and legal requirements are reviewed before broad public onboarding.

---

## 5. Release milestones

### Release A — Account and profile foundation (Phases 0–3)

A user can register, log in, create and maintain a secure career/application profile, and view their progress on a basic dashboard. This is the first usable build and development checkpoint.

### Release B — Discovery and decision support (Phases 4–5)

The same user can browse or add jobs, save them, view complete details and see a grounded job/profile comparison.

### Release C — Complete application journey / initial MVP (Phases 6–7)

The user can generate and download a tailored CV, open the employer application, record that they applied, and manage subsequent statuses. This is the primary launch-ready product target.

### Release D — Assisted application and scale (Phases 8–9)

Add the optional browser assistant, stronger integrations, service hardening and monetisation after the essential journey has been proven.

---

## 6. Key cross-cutting requirements

### Multi-user privacy and ownership

Each user owns their profile, saved jobs, applications, files, answer history and AI results. Shared public job records do not create shared personal statuses. Authentication is not enough: all read/write/download operations must enforce ownership. Private data must not appear in another user's search, output or generated document.

### Document and answer accuracy

The user should be able to identify and correct the evidence used to make CV claims. Sensitive, temporary, employer-specific and jurisdiction-dependent answers must not be reused without context. The system should never silently assert sponsorship eligibility, criminal history or conflict-of-interest facts from a weak guess.

### Job freshness and source compliance

Job feeds and alert imports must use accessible and permitted sources. Link validity and posting dates should be displayed when known. An employer application may change or close, so the platform must handle unavailable listings gracefully.

### Status integrity

Distinguish viewing a job, opening its application URL, preparing documents and actually submitting an application. Only a user confirmation or a reliable submission signal should mark Applied. A history of status changes and associated documents should be retained.

### Performance and costs

Keep inexpensive activities such as login, profile editing, browsing and status changes independent of expensive AI work. Run paid AI only on explicit user-triggered work or a clearly approved workflow. Provide predictable failures and recovery behaviour.

### User experience

A new user should not be blocked by a long form. Provide clear progress, optional fields, meaningful empty states and straightforward navigation. Every phase should be checked on mobile as well as desktop.

---

## 7. First MVP: explicit inclusion and exclusion

### Must be included by the end of Release C

- User registration/login/logout and private accounts.
- Reusable professional and employer-application profile.
- Personal dashboard and profile completion.
- Job discovery and manual job addition with vacancy details.
- Saved jobs and application-specific status controls.
- Profile-to-job analysis and evidence review.
- Tailored CV generation, review, download and saved versions.
- Optional cover letters.
- Link to the employer's application and manually confirmed Applied status.
- Application history and outcomes.
- Ownership protection, basic operational safeguards and mobile-friendly UX.

### Not required for the first complete release

- Automatic final submission of applications.
- Full browser autofill or mobile in-app browser.
- Billing and subscriptions.
- Large-scale autonomous scraping of job platforms.
- Employer recruiter dashboards, university dashboards or enterprise team workspaces.
- Advanced networking/contact CRM.
- Full native mobile application.

---

## 8. Acceptance test for the complete journey

Use a fresh, previously unseen test user:

1. Open GuidOn Career and register with Google or email.
2. Complete the basic profile, add an education entry and a job experience, set target roles, and save employer-application preferences.
3. Log out, log in, and confirm all information remains intact.
4. Open Discover Jobs, use a role/location filter, select a real listing and read its description; alternatively add a real vacancy manually.
5. Save the vacancy, start job analysis, and confirm the identified requirements and evidence relate to this user's profile.
6. Select **Make CV**, generate a document, review it, edit it if necessary and download it.
7. Open **Apply** to go to the employer's authentic site and complete the submission manually.
8. Return to GuidOn Career, mark **Applied**, record the submission date and the CV version used.
9. Later update to **Interview** or **Rejected** and confirm the timeline, notes and dashboard change accordingly.
10. Repeat with a separate user; prove that accounts, evidence, files and application history cannot cross over.

**Release C is complete only when this whole test passes.**

---

## 9. Dependencies and build order

- The account model and security foundation come before saving private profile data.
- The profile and evidence model come before reliable job matching and CV generation.
- The job detail and saved-job workflow come before attaching generated documents to an application.
- The CV review workflow comes before advertising the Apply journey as complete.
- Application status tracking works without a browser extension and should be implemented before advanced autofill.
- Public onboarding and paid AI should follow meaningful isolation, privacy and cost tests.

Each phase should be recorded in the project with its scope, tasks, risks, acceptance checks and changes to decisions. Future enhancements should be added to the backlog rather than silently replacing this agreed core journey.

---

## 10. Immediate next actions

1. Approve this roadmap as the project baseline.
2. Establish working GitHub repository write access for the intended development account.
3. Configure an independent GuidOn Career Google Cloud/Firebase project and environments.
4. Implement the Phase 0 application foundation.
5. Continue in order through accounts, profiles and dashboard; demonstrate Release A with two independent test users.
6. Then build job discovery, matching, CV generation and application tracking toward the complete Release C journey.

**Source context:** This roadmap consolidates the supplied *Career Intelligence & Job Application Automation Platform* blueprint and subsequent requirements for employer-ready profiles and user-controlled autofill. It describes the **new GuidOn Career product target**, not a claim that the empty GuidOn repository already contains these features.


---

# Addendum v1.1 — CV-First Onboarding, Installable Mobile Experience, and Cross-Platform Application Assistant

**Added:** 23 November 2026  
**Change approach:** Additive only. Everything in Sections 1–10 above remains preserved verbatim.  
**Scope:** This addendum expands the existing phases and acceptance tests; it does not remove the end-to-end journey or postpone the first complete web product.

## 11. Updated vision: one account, three connected experiences

GuidOn Career will provide **one shared account and one Career Intelligence Profile** across three related experiences:

1. **GuidOn Career website and installable web app:** The main product. Users register, upload a base CV, verify their AI-prepared profile, discover jobs, create CVs, open employer applications, and track progress. On compatible mobile browsers, users can install the web application to their home screen directly from the GuidOn website (progressive web app, or PWA), without manually downloading an APK.
2. **GuidOn Career desktop Chrome extension:** An optional companion, offered through an **Install Extension** link on the website. It can inspect supported, accessible employer/job pages, capture job descriptions, suggest or fill application fields from the shared profile, and report user-confirmed outcomes back to GuidOn.
3. **GuidOn Career enhanced Android Career Browser:** A later optional experience based on the previously explored hybrid architecture. Its Secure Browser uses Chrome Custom Tabs; its Preparation Browser uses an app-controlled Android WebView with a native Career Assistant. This architecture needs native Android capability and **cannot be delivered in full by a PWA alone**. A future native release should be accessible through a website link to an approved app-distribution channel, rather than assuming a standalone website can silently install native code.

All three experiences use the same profile, saved jobs, CV versions, approved answers, and application history. The core product must remain useful when the extension or enhanced Android browser is not available.

### 11.1 Core journey, updated

**Sign up → Upload base CV → AI prepares profile → User verifies and fills gaps → Discover relevant jobs → Open job details → Capture/review job if needed → Analyse fit → Make tailored CV using saved base format → Review/download CV → Open authentic employer application → Fill supported fields with assistance where available → User submits → Update application status and history.**

If a person has no existing CV, they can use guided manual setup. Upload-first is the **default**, not a barrier to account creation.

### 11.2 Experience and distribution principles

- A user can always use the browser-based website without installing anything.
- On supported devices, an **Install GuidOn Career** action guides the user to the browser's install-to-home-screen process. The browser/device retains control of whether installation is offered and confirmed.
- The installed web app uses the same account, cloud data and core screens as the main website; it is not a separately maintained product or a disguised downloadable APK.
- A web-installed PWA cannot automatically read or inject code into arbitrary external employer pages or take over the mobile Chrome browser. Its mobile capture flows must use supported user-initiated mechanisms (such as sharing or pasting a vacancy link, adding job details, or opening a permitted source).
- Chrome extensions are a **desktop Chrome distribution path** for this plan, not an Android Chrome extension installation promise. The website may link to an unlisted Chrome Web Store listing or an approved enterprise deployment. A normal public website cannot silently install a desktop Chrome extension.
- Native Chrome Custom Tabs / WebView capabilities will be designed and validated separately. We must not advertise them as features already available in the PWA.
- Navigation labels, visual identity, profile controls, and data should remain consistent between platforms, while respecting each browser's security and rendering limitations.

---

## 12. Phase 1 and Phase 2 expansion — Base CV upload as the primary onboarding method

### 12.1 First-time experience (new default)

A new user should not be forced to complete a long category-by-category form. After login:

1. **Welcome / create profile:** Explain that the easiest way to begin is by uploading an existing CV or résumé.
2. **Upload base CV:** Accept supported source documents (prioritise DOCX and PDF); disclose supported formats and file limits clearly. Offer an alternative **I don't have a CV** guided setup.
3. **Permission and processing:** Tell users that AI will extract career facts from their uploaded document. Ask for appropriate permission and show progress and recoverable errors. Do not begin chargeable or external AI processing without a clear user action and relevant privacy notice.
4. **AI-assisted extraction:** Populate as many supported profile sections as the CV provides: identity/contact, headline, summary, work history, education, certifications, skills, tools, projects, achievements, dates, professional links and other relevant information.
5. **Review and confirm:** Present the extracted profile in simple sections. Show doubtful/ambiguous items and missing fields. Users correct values and explicitly confirm important facts before these become trusted evidence.
6. **Complete employer-specific information:** Ask for high-value details that CVs usually omit: work authorisation, sponsorship, notice period, salary preferences, preferred locations, relocation, referrals or conflict questions where appropriate, and reusable application answers. Keep sensitive or optional disclosures separate.
7. **Save:** Store both the confirmed structured profile and the original base CV privately under the user's account. Keep a record of the extraction result and any user-approved corrections.
8. **Finish / enter dashboard:** Show profile readiness, missing application information and clear actions to discover jobs. Allow later edits, additional evidence and refreshed CV uploads.

### 12.2 Trust and accuracy of AI-filled data

- AI is an **extraction and drafting assistant**, not the authority over the user's identity or employment facts.
- Preserve the relationship between extracted fields and the source document when feasible (e.g., source section or page). Label fields as **confirmed**, **extracted but not confirmed**, or **missing / needs user input**.
- Never fabricate missing qualifications, grades, dates, employment rights, sponsorship facts, achievements or metrics.
- Flag contradictory information, unclear date ranges, overlapping employments and unsupported claims instead of silently deciding what is true.
- Normalise headings and dates for consistent use, while preserving the user's actual meaning.
- Users can edit extracted entries, delete mistakes, add more work history and verify information later. Changes should not silently overwrite previously confirmed facts.
- An AI parse failure must not block the user: retain the uploaded file if authorised, explain the problem, and provide manual entry and retry options.
- Retain private uploaded documents only according to the product's disclosed storage and deletion policies; enforce access controls and reasonable file validation, scanning and size limits.

### 12.3 Save the base CV as both a source document and a format reference

The uploaded CV has **two separate roles**:

**A. Professional evidence source.** Its content seeds the structured Career Intelligence Profile, which is then verified and enriched over time. Subsequent CVs use the *confirmed profile and evidence*, not blindly copied, outdated source text.

**B. Preferred base format.** Its layout, headings, typography, spacing, page style and section order can be reused as the user's starting CV style for future job-specific output. The user can select **Use my uploaded CV format** as their default CV template and later choose a standard GuidOn template instead.

Requirements:

- Save the **original uploaded file** unchanged, privately, and associate it with the user and upload version.
- Store a separate **format/template reference** so profile content and visual formatting are not treated as the same object.
- Let users see or change their selected base CV, upload replacements, and keep an intentional version history.
- For job-specific generation, preserve the original formatting **as faithfully as practical**, while allowing necessary content reflow and user-approved updates.
- DOCX is preferred when editability and formatting fidelity are important. Extracting and reproducing a design from a PDF can be less exact; explain limitations and provide a template fallback rather than promising pixel-perfect duplication.
- A later upload does **not** overwrite confirmed evidence or replace the default base format without the user's approval.
- Users may choose which base format a generated CV uses; the format preference can be reused across multiple applications.

### 12.4 What the profile must support beyond a CV

Keep all existing Phase 2 sections. In addition, make the guided profile-completion flow explicitly cover:

- Standard application fields: preferred and legal names, current address, phone, email, portfolios and social/professional links.
- Education and experience detail: credentials, academic dates, employer dates, title histories, available references to achievements, licence/certification validity and software proficiency.
- Location, mobility and preferences: target jurisdictions, remote/hybrid/on-site choices, willingness to relocate or travel, desired pay/currency, start date and notice period.
- Work authorisation in each relevant jurisdiction: current rights, future sponsorship requirements, document expiry and answers that can change over time.
- Common screening questions: previous employment with the company, previous applications, referrals, contractual restrictions and potential conflicts. Employer-specific answers must stay employer-specific.
- Reusable free-text answers: motivation, relevant experience, selected projects and role-specific explanations, clearly labelled as approved or draft and scoped to their appropriate usage.
- Optional disclosures with stricter handling: accessibility/accommodations, demographic equal-opportunity answers and other sensitive topics, only when lawful and requested by the user. Never demand these to finish onboarding or auto-submit them.

The **Answer Bank** must support semantic equivalence without confusing reversed questions, current versus future requirements, countries, employers or dates. Missing conflict-sensitive facts remain questions for the user, not unlabelled default answers. Record user corrections so appropriate answers can be suggested again, but require explicit user approval before learning an employer-specific or sensitive response as a globally reusable fact.

### 12.5 New Phase 2 acceptance criteria

- A user can create an initial professional profile primarily by uploading a CV rather than typing every field.
- The system clearly identifies AI-extracted, confirmed and missing information and preserves user changes.
- The base CV remains available later as the original source and the chosen formatting reference.
- Two independent users can upload different CVs without crossing documents, extraction outputs, profile details or saved styles.
- If no CV exists, the user can still create and use their profile manually.

---

## 13. Phase 3 expansion — Installable GuidOn mobile web application

The first mobile delivery target is the **same responsive GuidOn website packaged as an installable PWA experience**, linked from the website itself.

### User experience

- The homepage can show an **Install GuidOn Career** action when installation is supported, along with browser-specific guidance when a direct install prompt is unavailable.
- The installed experience opens to the same signed-in workspace and displays familiar navigation for Dashboard, Discovery, My Career, CV Studio, Applications and Settings.
- Users can upload a CV from their phone, verify AI-extracted information, browse saved jobs, download or share generated CVs, and update statuses.
- A selected job can be opened on the authentic employer website, with a clear return path to the GuidOn workspace.
- The app should use consistent mobile styling, practical thumb-accessible controls, safe-area/keyboard handling, and no misleading controls for unimplemented features.
- The PWA must still behave reasonably when installation is unsupported; web usage remains the fallback. Offline viewing can be considered later but must not falsely imply offline AI or job processing.

### Mobile capture within the PWA

- Support a **Save job / Add job** flow from an employer URL, a user-shared link where supported, and editable vacancy details.
- Use permitted metadata or content sources when available; ask the user to correct missing job descriptions.
- Do **not** represent a PWA as having unrestricted DOM inspection/autofill capabilities on external ATS websites.

**Phase 3 expanded completion criteria:** A user can access the full early product on mobile; install the web app on a supported Android device without manually handling an APK; sign in; verify a CV-derived profile; resume saved work; and return to an employer page through a clear user-controlled link.

---

## 14. Phase 4–7 expansion — The complete job-to-application journey across devices

All existing requirements in Phases 4–7 remain intact. These additions integrate the new onboarding and browser surfaces.

### Job discovery and capture

- The web platform is the primary job feed and saved-job source. Users can open vacancies directly from the platform.
- Captured jobs from the desktop Chrome extension, the installable PWA or the later Android Career Browser flow into the **same job and saved-job records** after user review.
- Capture job title, employer, location, source URL and description when accessible; always provide an edit-and-correct step.
- A vacancy may be present for multiple users, but saved decisions, matching, generated documents and application states are separate for each user.
- Discovering or saving a job is not the same as applying.

### Matching and document creation

- AI matching uses **user-confirmed profile evidence**, including any facts verified after base CV extraction.
- The Make CV action produces a job-specific version while respecting the user's selected base CV format or selected GuidOn template.
- Users review all generated claims and the rendered document before saving or downloading.
- The final CV should be connected to the job, generation run, chosen format and saved version; optional cover letters follow the same ownership principles.
- A user can prepare more than one version and choose the actual version used when applying.

### Apply and status tracking

- The **Apply** action goes to an authentic employer destination where available; account sign-in or external submission may still be necessary.
- The user manually controls Next, Continue, final Review and Submit actions on external employer forms.
- The platform can offer saved CV downloads, copying approved information and assisted fields when supported by the surface.
- Only user confirmation or genuinely reliable evidence marks an application as **Applied**. Opening the link, generating a CV or prefilling forms must not trigger a false submission status.
- The timeline records the job, status changes, relevant dates, selected CV version, notes, interviews and outcomes.

**Release C remains the first complete MVP:** A brand-new user uploads a CV, confirms a profile, discovers a job, prepares a tailored CV preserving the chosen base format where feasible, follows the application link and updates the status, on desktop or mobile web **without relying on the extension**.

---

## 15. Phase 8 expansion — Desktop Chrome extension

The extension is a connected application companion, not a separate candidate database. The website provides an **Install Chrome Extension** entry point once a distributable version is available.

### Required capabilities

1. **Recognise the open job page:** Identify the title, employer, location, job URL and job description from supported, accessible page content; allow a user to correct the result.
2. **Capture / Save Job:** Send a user-approved capture to the user's GuidOn workspace and deduplicate without overwriting their private job status.
3. **Connect to the profile:** Read only the signed-in user's permitted profile and approved Answer Bank fields through authorised services.
4. **Recommend prepared documents:** Show available CV versions for the selected job or link to Make CV in the GuidOn web application.
5. **Inspect application forms:** Discover standard fields and supported dynamically rendered questions, dropdowns, repeated sections and accessible embedded content where technically allowed.
6. **Classify suggestions:** Mark values as verified, inferred or unresolved; show a compact review/edit experience and explain the source or reason for non-obvious answers.
7. **Fill current page only:** Apply approved values to the current step, verify whether fields actually changed, and report unresolved or unsupported fields. **Never press Next, Continue or Submit.**
8. **Learn from corrections safely:** Offer to store user-approved edits for semantically equivalent future questions, with employer, jurisdiction, tense and sensitivity boundaries.
9. **Track after user action:** Provide a user-confirmed Mark Applied / status update and sync it to the same GuidOn application history.

### Distribution and release

- The public website may send desktop Chrome users to a published or **unlisted Chrome Web Store** listing; browser installation remains an explicit Chrome-controlled action.
- For approved managed enterprise environments, administrator distribution may be possible, but a public website cannot silently install the extension or promise one-click ZIP installation on ordinary desktop Chrome.
- Early testing may use developer-mode loading on controlled devices; do not describe that as the final public installation flow.
- Limit permissions and content access to what is required, and test against representative ATS forms before claiming broad compatibility.

**Phase 8 extension completion criteria:** A signed-in user captures a supported vacancy, creates or retrieves a CV, fills supported fields only on the currently visible application step, verifies what was filled, and manually proceeds and submits while GuidOn retains the confirmed job/application history.

---

## 16. Phase 8 mobile expansion — Career Browser and application assistant

### 16.1 Two mobile capability levels, not one misleading promise

**Level A: Website-installed PWA (initial, no APK download).** Provides account, CV upload/AI profile setup, discovery, document creation, job link opening, user-initiated job sharing/capture and status tracking. It cannot inject autofill controls into arbitrary external websites in mobile Chrome or programmatically inspect those pages' DOM.

**Level B: Optional enhanced Android app (later, native runtime).** Implements the previously designed two-browser workflow using native Android facilities: Chrome Custom Tabs for authenticated secure browsing, and a separate visible Android WebView preparation workspace for allowed DOM inspection and native controls. The user can reach its distribution/install page from GuidOn's website, but a PWA installation by itself does not install this native implementation. If we choose to ship Level B without asking users to handle raw APK files, we need an appropriate app-store or approved managed distribution route.

**Decision gate:** Begin with Level A. Validate whether Level B offers enough additional benefit to justify native development, distribution, security review and on-device testing. Do not imply that browser-extension-level autofill works in mobile Chrome solely because GuidOn is installed as a web app.

### 16.2 Previously selected hybrid Android browser experience (Level B)

The hybrid flow to preserve from the existing Android prototype design is:

**Discover job → Open Secure Browser (Chrome Custom Tab) → User chooses Capture Job → Open visible Preparation Browser (Android WebView) → Capture / Review JD / Save Job / Make CV / Save CV → Apply → Return to Secure Browser where feasible → User completes application → Update status.**

**Secure Browser responsibilities**

- Open the real employer or job-platform page with the browser's supported existing authentication state.
- Keep credentials and final application submission in the more trusted browser environment.
- Provide a supported Capture Job handoff control without pretending that a Chrome Custom Tab permits unrestricted script injection or a full overlay of native application controls.
- Prefer resuming the intended existing session/tab when the Android/browser behavior permits it; do not assume that reopening the same URL restores scroll position or form state.

**Preparation Browser responsibilities**

- Display the real employer page visibly inside the application's own WebView when technically allowed.
- Extract title, employer, location, link and accessible job-description content through permitted DOM access, with editable corrections.
- Expose consistent native assistant controls without requiring the user to switch to a generic text-only job preview.
- Let the user save the vacancy, inspect the job description, request a tailored CV with explicit cost/processing consent, review and retain the document, and select Apply to return to secure browsing.
- Treat the WebView primarily as a preparation surface. It **does not automatically inherit Chrome Custom Tabs cookies, session credentials or the current form state**.

**Career Assistant controls**

- **Capture Job:** Extract accessible vacancy details.
- **Review JD:** Inspect/edit the extracted description.
- **Save Job:** Save to the user's shared GuidOn workspace.
- **Make CV:** Generate from their verified profile, using the selected base CV format.
- **Save CV:** Review and retain the generated document/version.
- **Apply:** Return to secure external application browsing where feasible.
- **More:** Application status, notes and other job actions.

**Look and feel**

- Consistent navy-themed headers, navigation, branding and familiar control names across the two experiences.
- Actual employer page occupies the main content area; controls are compact, accessible and collapsible where appropriate.
- An expandable Career Assistant, predictable Android Back behavior, keyboard/safe-area handling and smooth transitions.
- Similar appearance is a design goal, but **identical rendering, complete control of Custom Tab chrome and seamless cookie/session sharing are not guarantees**.

### 16.3 Mobile autofill is a separate research and validation milestone

- Investigate what an Android Autofill Service can legitimately fill in secure browser contexts, and what an app-controlled WebView can fill through accessible DOM fields.
- Reuse the same verified profile and Answer Bank as the desktop extension, while respecting per-surface technical limits.
- Do not equate WebView DOM access with authenticated Chrome Custom Tab DOM access.
- Provide transparent answer confidence, user edits, current-page-only field filling where possible, and **never automatically Next / Continue / Submit**.
- If an employer page forbids WebView or uses inaccessible controls, fall back to secure browser browsing and manual user entry rather than trying to bypass protections.

### 16.4 Prototype heritage and quality gates

The supplied project summary describes Android prototype work through **v0.5.0**, including a debug APK build and **27 automated checks passing**. This is useful design history, **not evidence of production deployment or successful physical-device validation** and not proof that the native source is in the GuidOn GitHub repository.

Before describing the hybrid browser as ready, validate on supported Android devices:

- Secure Browser to Preparation Browser handoff and clear return path.
- Preservation/resumption of the intended authenticated browser tab where technically supported, with a graceful fallback otherwise.
- Correct extraction and editing on a representative variety of employer pages.
- CV creation and access to the chosen saved document.
- Handling of user login, browser back navigation, keyboard, cookies, failed loads and unavailable job descriptions.
- Security and privacy of each surface, followed by a real-user usability test.

---

## 17. Revised phased delivery and release criteria (additive clarification)

This table **extends**, rather than replaces, the original Phase 0–9 roadmap.

| Original phase | Additional commitment from this addendum | Required release result |
| --- | --- | --- |
| **0 — Foundation** | Design private storage for uploaded base CVs, document versions, installable-PWA readiness, and safe AI-processing integration. | Secure starter and infrastructure foundations. |
| **1 — Accounts** | Route first-time users into **Upload Base CV** onboarding; manual option remains. | Independent users can create accounts and begin CV-first setup. |
| **2 — Career profile** | AI extract from CV; editable review, user verification, employer details, Answer Bank; preserve original CV and reusable format. | Profile is populated and confirmed without requiring manual re-entry of everything on the CV. |
| **3 — Dashboard / navigation** | Include PWA install flow and mobile-first continuity. | Same user can access and manage profile from website and installed web app. |
| **4 — Discovery** | Support incoming saved jobs/captures from permitted cross-platform sources. | Discover, view, save or add actual jobs. |
| **5 — Analysis** | Analyse from confirmed CV-derived profile data and later evidence. | Evidence-based, editable job matching. |
| **6 — CV Studio** | Use saved base CV as formatting reference; preserve output versions. | Generate tailored CV and optional cover letter with user review. |
| **7 — Applications** | Cross-device Apply link and user-confirmed status history. | End-to-end job-to-application MVP completed. |
| **8 — Assistant** | Desktop Chrome extension; PWA mobile capture; optional hybrid Android Career Browser; research assisted mobile autofill separately. | Supported, reviewed, current-page-only assistance; no auto-navigation/submission. |
| **9 — Scaling** | Cross-platform testing, data privacy, distribution readiness, device QA and support operations. | Safe, supportable multi-user release. |

### Revised releases

**Release A — CV-first account and profile**  
User signs up, uploads a base CV, receives AI-assisted profile extraction, reviews and saves verified information and employer-answer preferences, selects a reusable CV style, and opens a private dashboard. The same essential experience works on mobile web; installability can be enabled once verified.

**Release B — Discover and prepare**  
User sees relevant jobs, opens or adds a job, saves it, gets meaningful job analysis, and resolves missing profile evidence. Cross-platform job capture is integrated as the relevant companion becomes ready.

**Release C — Complete first product**  
User chooses Make CV, generates a tailored document using the saved style where technically feasible, reviews and downloads it, follows an authentic Apply link, submits manually, and tracks a confirmed application status and later outcomes. The entire journey works through the website and mobile web without any extension.

**Release D — Connected assistants**  
Optional desktop Chrome extension and mobile browser assistance reduce repeated entry. The **PWA** remains the install-from-website mobile baseline. Advanced secure-browser-to-WebView preparation belongs to a separately validated **native Android capability**, not a falsely promised PWA-only feature.

**Release E — Scale and wider distribution**  
Improve supported-platform coverage, privacy governance, reliability, cost controls, onboarding and commercially appropriate release channels.

### Revised first-use acceptance test

1. A previously unknown user opens the website and registers.
2. They upload a base CV as the primary setup path and understand how their document will be used.
3. AI extracts the available career information into editable profile sections, with uncertainty clearly identified.
4. The user reviews facts, fixes errors, and completes the common employer questions missing from their CV.
5. The original CV stays private, retrievable and selectable as the default formatting reference.
6. The user discovers a real job, opens its description and saves it.
7. The job is analysed against the **confirmed** profile, including any new corrections.
8. The user creates a tailored CV, reviews accuracy/format and downloads or saves the correct version.
9. The user opens the authentic employer application, submits it themselves and explicitly marks **Applied**.
10. They later update the status and see the history tied to the correct job and CV version.
11. They repeat the main journey from the mobile website or installed PWA where supported.
12. A second test user cannot access the first user's base CV, parsed data, preferred format, jobs, answers or documents.

**An additional future assistant test:** On supported desktop Chrome, the user captures a job, reviews field suggestions, fills only the current application step, manually advances/submits, and confirms the result in GuidOn. The hybrid Android secure/preparation browser receives its own physical-device sign-off later.

---

## 18. Roadmap decision record and safeguards

### Decisions accepted into scope

- **CV-first onboarding is the default**: upload once, let AI populate as many profile fields as possible, then review and supplement; manual entry is a fallback.
- **Uploaded base CV remains stored** as both an evidence source and an optional preferred **CV-format reference** for future tailored versions.
- **Full career and application profile** includes frequently requested employer information and context-aware saved answers, not just a traditional CV.
- **Website and installable PWA** are the primary accessible product and mobile delivery route.
- **Desktop Chrome extension** is a separately distributed companion accessed from the website.
- **Chrome-extension-like assistance inside the Android experience** is a future capability, subject to native browser constraints and real-device validation.
- **Secure Browser / Preparation Browser** hybrid architecture and Career Assistant design are preserved as the target for the optional enhanced Android implementation.
- **One account, one private shared data foundation** serves all supported experiences.
- **Final external job application navigation and submission remain user-controlled.**

### Explicitly unresolved; do not silently assume a solution

- Whether the product will fund and distribute a native Android container through an app marketplace, an approved managed route, or defer it. A pure PWA does not provide the proposed native two-browser functionality.
- How closely each uploaded source CV's design can be reproduced, especially a PDF-only source or highly customised visual layout.
- Which ATS platforms and browser conditions will be covered reliably by field capture and autofill; comprehensive support is a testing goal, not an existing guarantee.
- Which job discovery feeds are lawful, supported, available and sufficiently fresh; no unrestricted scraping assumption.
- How Android Chrome session return works in practice on supported devices; reuse of existing tab/form state must be verified, not inferred from reopening a URL.
- The correct consent, retention, AI processing and deletion experience for uploaded personal CVs and optional sensitive screening answers.

### Authoritative platform references for implementation decisions

- Installable web apps and browser-controlled installation: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
- Android Chrome installation of web apps: https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DAndroid&hl=en-001
- Chrome extension distribution and enterprise restrictions: https://developer.chrome.com/docs/extensions/how-to/distribute
- Unlisted Chrome Web Store extension distribution: https://developer.chrome.com/docs/webstore/cws-dashboard-distribution
- Android Custom Tabs versus WebView capabilities and state sharing: https://developer.android.com/develop/ui/views/layout/webapps/in-app-browsing-embedded-web
- Chrome extension availability on mobile browsers: https://support.google.com/chrome_webstore/answer/1698338?hl=en

**Guiding rule:** The first released GuidOn Career must let an ordinary new user complete the end-to-end job application preparation and tracking journey. The optional companion experiences should make that journey easier, not become prerequisites for using the product.

---

# Addendum v1.2 — Mandatory Staged CV Builder, Dual Scoring, and Complete Job Audit

**Added:** 23 November 2026  
**Change approach:** Append-only, without deleting or superseding Sections 1–18 or Addendum v1.1.  
**Detailed specification:** [Strict CV Builder Engineering Specification](CV_BUILDER_STRICT_SPEC.md).

## 19. Staged CV building is a mandatory workflow

1. **Understand and clean the selected JD** without inventing or silently dropping requirements; retain unchanged original and cleaned JD plus provenance.
2. **Match a user-verified Career Intelligence Profile** to the JD, linking every relevant experience, qualification, achievement and STAR evidence record.
3. **Show both preliminary scores and concise gaps** before CV generation: Raw ATS distinct JD keyword coverage and a separate evidence-backed Recruiter Fit rubric; gap prompts must be short and actionable.
4. **Wait for the user's acknowledgement, comments and corrections.** Material new profile facts require explicit verification and matching/scoring updates before generation.
5. **Generate a truthful tailored CV** using the selected uploaded base CV format as closely as practical, with complete natural STAR bullets and separately verified metrics.
6. **Render and inspect the final candidate document.** Exactly one page is mandatory; alignment, date anchors, font size, margins, output text and line lengths must pass automated checks and human review.
7. **Recalculate both scores against the generated CV**, showing matched/missing keywords, recruiter evidence, gaps and change from pre-CV scores.
8. **Support user-requested rewrites/reruns**, preserving every generated CV version, user comment, score snapshot, model usage and audit trail. Do not overwrite earlier attempts.

## 20. Strict layout and integrity controls

- **Exactly one rendered page**: two pages is not a valid final output; if necessary, propose evidence-grounded content prioritisation rather than silently shrinking text below readability thresholds.
- **Consistent left/right alignment**: section and role headings align on the left; dates use consistent right-aligned positions; measure visible PDF coordinates and fail if alignment deviates beyond the specified tolerance.
- **Base CV formatting**: retain heading hierarchy, type, visual spacing and layout where feasible; if source formatting is incompatible with ATS or one-page constraints, require controlled fallback review.
- **STAR and key results**: no fabricated claims; natural action/result bullets supported by Situation, Task, Action, Result records and confirmed numerical achievements; individual bullets should not exceed two rendered lines.
- **Writing style**: avoid excessive hyphens in narrative text; prefer colons, semicolons and commas; reserve dashes for headings or legitimate identifiers and dates.
- **Readable parsing**: prioritise simple single-column structure, minimum 10 pt body text, sensible margins, actual text extraction, no misleading hidden keyword stuffing.

## 21. Career profile data extension

For **each** job and education entry, retain independently editable, versioned:

- Basic job or institution details and normal responsibilities.
- **Key numbers**: numeric value, measurement/unit, timeframe, context, evidence source and user-verification state.
- **STAR stories**: Situation, Task, Action, Result, linked verified metric IDs and source/confirmation state.
- Incomplete extracted stories remain unconfirmed until the user supplies or verifies missing facts; confirmation must not silently extend across another employer or qualification.

## 22. Raw ATS, Recruiter Fit and comparisons

- **Raw ATS Keyword Coverage**: number of distinct *JD-grounded relevant* phrases present divided by total distinct relevant phrases, multiplied by 100; duplicates and excessive repetition never increase the score. Record exact matching/missing terms and methodology.
- **Recruiter Fit**: independent qualitative and evidence-based rubric weighted for relevant experience, achievements, skills, seniority, qualifications and work eligibility. Unknown evidence is clearly labelled rather than assumed; the result is GuidOn's own decision support, not an employer rating.
- Calculate both scores **before generation** from confirmed profile evidence and **after each generation** from the actual CV, including each revised version; store per-category reasoning, matched/missing terms, gaps and history.
- No score should be presented as a hiring probability, universal ATS score or guarantee of a shortlist.

## 23. Every application gets a complete private folder and usage ledger

Folder naming rule: **Company Name - Designation - Location**, with an immutable internal UUID suffix to prevent collision or accidental overwrites.

Retain in the user's private folder: original/cleaned JD, extraction/analysis results, confirmed profile revision or evidence snapshot, all stage inputs and outputs, preliminary/final scores, brief gaps, user comments, every generated CV and optional cover letter, rendered document QA, edits/reruns, error/retry details, token/usage summaries and associated costs when available.

- Token counter must show **actual provider-reported** input, output, total, cached and reasoning tokens when supplied, by stage and per-job total. Never invent token consumption; calculate estimated costs only from recorded price snapshots.
- Save an inspectable artifact manifest, immutable version/checksum references and verified owner-scoped storage paths. File export/deletion, privacy consent and retention are mandatory for production readiness.
- All surfaces, including website, installable PWA, extension and optional native Android client, use the same authenticated folder and CV engine interfaces.

## 24. Release gate for the CV builder

The CV engine is **not complete** until a fresh test candidate and JD can complete the staged workflow and approve a real one-page rendered DOCX/PDF, with both pre/post scores, a concise gap review, one user-requested rerun, verified metrics, and a full private audit folder. A separate account must be unable to access any part of the first user's folder or token history.

**This addendum adds requirements; it does not claim that the current draft backend is deployed or that AI generation already works.**

---

# Addendum v1.3 — Creative CV Mode, ATS Structural Gate, Favourite Jobs and Smart Discovery

**Added:** 23 November 2026. **Append-only:** Original master plan, Addendum v1.1 and v1.2 remain intact.

## 25. User-selected “Think Creatively” before Make CV

- Offer two modes **before** preparation: **Evidence First** (default) and **Think Creatively** (optional).
- Creativity may vary framing, emphasis, action verbs, section priority, transferable-skills narrative, role focus and **descriptive functional department labels** where the user's verified work supports them.
- It must never create or alter *official* employer names, legal job titles, actual departments presented as official, employment dates, education, qualifications, immigration or sponsorship claims, responsibility level, quantitative achievements or other historical facts.
- A descriptive functional label such as “Finance Operations & Transformation Focus” may be suggested separately from the official department; do not claim it was the employer-assigned department unless independently verified.
- Every material suggested rewrite must cite verified evidence, be shown as a change for user review, and require user approval when it changes meaning or terminology. An AI output alone cannot approve new career facts.
- Both modes use exactly the same structured STAR evidence, short pre-CV gaps, Raw ATS and Recruiter Fit scores, document render gates, user comments, immutable revisions and audit/token history. Neither mode guarantees a score or employer shortlist.
- Persist the selected mode in the private job workspace and record the change as an auditable event. Reruns may choose either mode without modifying the original base CV or source facts.

## 26. No tables and enhanced ATS readability: absolute output rules

- All **generated** CVs must contain **zero Word tables** (including layout tables and nested tables), **zero text boxes**, **one column only**, and no unnecessary graphics or header/footer-dependent content.
- Do not align dates via tables. Use ordinary paragraphs, right-aligned tab stops or other parseable single-column text techniques and inspect the actual exported PDF alignment.
- Where an uploaded base CV contains tables, columns or text boxes, preserve it unchanged as the source template, but create an ATS-safe adapted output for the selected application and disclose any necessary structural deviation.
- Require editable DOCX and text-extractable PDF, both exactly one page with a minimum body font of 10 pt, measured section/date edge alignment, readable spacing and no clipped content.
- In addition to PDF render inspection, inspect the generated DOCX OpenXML structure to ensure that no forbidden layout construct remains. Approval is blocked if it fails.

## 27. Favourites, status timeline and separate user ownership

Users must be able to save/unsave a job as a **favourite** independently of its current workflow status.

Canonical stages: **Discovered, Interested, CV Preparing, CV Prepared, Applied, Applied + Connected, Rejected, Not Interested, Snoozed.**

- The status is **per user**, not written back to a global shared job listing. Each change is timestamped with history; favourites never erase a status.
- Applied and Applied + Connected require user confirmation or a verifiable authorised application event; the platform must never silently infer an external submission. Rejected must not be assumed from lack of response.
- Dashboard counts and filters can aggregate the stages. “Active” excludes Rejected and Not Interested; Snoozed remains separately filterable.
- Preserve state across browsers and mobile app for the same signed-in account. Reject stale multi-device state updates and support idempotent retries.

## 28. Smart Sort and Filter & Sort discovery panel

Smart Sort must be available on the main job-listings page and rank roles by the user's **confirmed** Career Intelligence Profile, target roles, preferred locations, recorded skills and relevant experience, with a small freshness tie-breaker. Without a confirmed profile, fall back transparently to Newest.

- Explain high ranking with concise reasons such as “Target role match”, “Location match”, “Confirmed skills match”. **Smart Sort is not the Raw ATS Score or the Recruiter Fit Score.**
- Never treat unknown work eligibility, salary or employer department as verified; show provenance. Any department inferred from a role title must be labelled **inferred**, not employer-verified.
- Provide an integrated **Filter & Sort** panel inspired by the supplied screenshot: multi-value searchable include/exclude selectors for Company, Location, Department/Function, Designation; Discovery Category/Source; Existing Job Status; and Sort Jobs.
- Include favourite-only filtering, keyword search, and available verified visa information. Existing future planned filters (including pay rate) are not removed.
- Sort modes include Smart Sort/Best Matches, Newest, Oldest, Company, Designation, Location and Recently Changed Status.
- Provide **Clear all** and **Apply filters** semantics; persist each user's own filter preferences.
- **All filters must be applied across the full eligible job collection before pagination**, not merely to the current visible page. A temporary complete-scan implementation must fail visibly when its declared limit is exceeded; use a proper indexed discovery/search backend at scale.
- Preserve job source URLs and posting provenance; do not imply that LinkedIn or an external ATS granted data extraction or scraping access.

**UI ownership:** These are service/data/interaction requirements, not a mandate to retain the screenshot's colours, typography or exact component dimensions. The UI/UX designer remains free to create the presentation.

**Detailed backend contracts:** [Job Discovery and Creative CV Mode Specification](JOB_DISCOVERY_CREATIVE_MODE.md) and [Strict CV Builder Specification](CV_BUILDER_STRICT_SPEC.md).


---

# Implementation checkpoint — Universal web.app, extension integration and full stage audit

**Recorded:** 23 November 2026. **Append-only**: no previous phase, addendum, acceptance condition, or strict CV-builder requirement is removed or weakened by this checkpoint.

- GuidOn's end-user target is **one independent Firebase Hosting `*.web.app` entrypoint**, responsive and installable as a PWA where supported, with one authenticated user account and shared backend. Actual address is assigned by a newly created Firebase Hosting site and must be verified after deployment; a GitHub code repository alone is not a live website.
- The optional desktop Chrome extension is included in the architecture as an existing legacy prototype to migrate, **not a separate profile or jobs database**. Legacy source was located in `abhisheknair607-ux/automate_cv/experimental/garamaal-autofill/extension`. This source still contains a Next/Continue automation control and old account assumptions, which **must not** be carried into GuidOn. Only user-reviewed current-page fills, with manual navigation and submission, are permitted.
- The website, extension and later optional native Android preparation browser share the exact same private Career Intelligence Profile, job captures, CV versions, evidence/Answer Bank and candidate-confirmed application events. A PWA does not gain an extension's external page DOM abilities.
- Verified JD analysis, user-approved pre-CV gaps, separate Raw ATS Keyword Coverage and Recruiter Fit, one-page/no-table CV rendering, immutable version history and token ledger remain strict release gates. **Think Creatively** is permitted for source-backed narrative reframing only, never changing actual employment/education facts.
- The complete [phase-by-phase acceptance audit](MASTER_PLAN_STAGE_AUDIT.md) distinguishes code foundations from a completed working user journey: **all original Phases 0–9 remain partial** until their own original exit criteria are demonstrated. No release milestone A–E is signed off.
- The [Hosting launch checklist](WEBAPP_HOSTING_LAUNCH.md) and [Chrome extension integration contract](CHROME_EXTENSION_INTEGRATION.md) are additive implementation handoffs for the UI/UX designer and backend developer; neither claims live deployment.

**Immediate acceptance order:** independent hosting and Auth → CV-first verified profile → live matching/gaps and strict CV generation → complete job/application workflow → optional connected Chrome extension → security/privacy/scaling sign-off. Features may be developed in parallel, but the core website must work without the extension.
