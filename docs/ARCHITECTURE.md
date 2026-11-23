# GuidOn Career — architecture decisions (Phase 0)

## Product surfaces
- Web app first: responsive React / TypeScript shell hosted on a *new*, independent Firebase Hosting site.
- PWA readiness: mobile-responsive shell; installability is not claimed until manifest, icons and device tests exist.
- Later companions: desktop Chrome extension and optional **native** Android Career Browser. They will share authenticated backend APIs and user-owned records, not a browser-local master database.

## Trust boundaries
- Firebase Authentication for Google/email sign-in (Phase 1): protected React auth gate, enabled only when an independent Firebase project is configured.
- Firestore user-scoped verified profile data, user-scoped saved jobs/applications/Answer Bank (Phases 1–7).
- Private Cloud Storage for unchanged source CVs and generated document versions (Phases 2/6).
- Server-side AI processing through authenticated, rate-limited services with explicit user initiation; never expose server AI secrets in client bundles.
- Shared job metadata can be distinct from per-user job status/notes, to avoid cross-account leakage.

## Proposed private data tree (not deployed)
- users/{uid}: account preferences, onboarding state
- users/{uid}/profile/*: verified career and application facts, provenance and confirmation state
- users/{uid}/baseCvs/{id}: original file metadata and chosen format reference
- users/{uid}/savedJobs/{id}: user-specific decisions
- users/{uid}/applications/{id}: status timeline, notes, selected CV
- users/{uid}/documentVersions/{id}: private generated output metadata
- users/{uid}/answerBank/{id}: scoped, approved employer answers

Cloud Storage object prefixes must be tied to authenticated UID and protected by independent Storage rules, not only by Firestore rules. Do not enable writes until rules and cross-user isolation tests exist.

## Phase 0 defaults
- Firestore and Storage rules currently deny **all** client reads/writes. Firebase Hosting configuration references the restrictive rule files.
- Firebase project IDs, API configuration, deployment sites, server secrets and permissions have not been provisioned here.
- Static UI has no genuine data operations and displays development-stage labels.
- No automation is permitted to mark an external application as Applied without a reliable submission signal or explicit user confirmation.

## Open decisions
Cloud project identifiers, regional residency/retention requirements, deployment ownership, monitoring/cost budget, uploaded-file scanning and consent details require separate configuration and review. Future proposals are additive to the original master plan.
