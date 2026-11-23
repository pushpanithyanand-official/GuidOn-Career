# Phase 0 — Implementation checklist

Master-plan source: [GuidOn Career Master Development Plan](GUIDON_CAREER_MASTER_PLAN.md), Phase 0 and addendum Sections 11–18.

## In this initial repository setup

- [x] Independent repository and read/write access verified.
- [x] Preserve master plan in full.
- [x] Responsive branded application shell and navigation.
- [x] Local development/build commands and a documented environment example.
- [x] Firebase Hosting configuration prepared (NOT deployed).
- [ ] Validate `npm install`, TypeScript checks and production build in CI or a connected development runner.

## Remaining Phase 0 work before signing off

- [ ] Create an independent GuidOn Career Firebase/GCP project, separate dev/prod environments and explicit project ownership.
- [ ] Configure Firebase Hosting, Authentication and isolated storage while retaining least privilege.
- [x] Add emulator tests for deny-by-default Firestore/Storage access plus owner-scoped candidate upload rules.\n- [ ] Complete production review and live cross-user testing before enabling any real CV uploads.
- [ ] Set billing alerts/budgets, basic error monitoring, rate/cost controls and retention choices.
- [ ] Document lawful data handling, AI-processing disclosures, deletion/export boundaries and accepted file types.
- [ ] Add CI for typecheck, build, tests, dependency scanning and deployment gate.
- [ ] Deploy a non-sensitive starter to the independent environment, test both desktop/mobile, and document rollback.

## Acceptance

A developer can run and deploy the static starter; secrets remain outside Git; environment setup is documented; navigation never implies unavailable features work. **Do not mark Phase 0 complete until hosted deployment and checks are verified.**
