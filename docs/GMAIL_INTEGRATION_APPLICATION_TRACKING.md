# GuidOn Career — Gmail Integration and Automated Application & Interview Tracking Roadmap

**Decision date:** 23 November 2026
**Status:** **Planned only.** This is the *second major capability* of the Gmail integration system, after job-alert discovery. No Gmail OAuth integration, mailbox monitoring, interview-email classifier or automatic email-derived status writer has been built or enabled in GuidOn.
**Relationship to product:** One user-owned career profile, job database, application history, CV versions and notification centre shared by the website/PWA, Chrome extension and future mobile browser.
**Design ownership:** UI/UX designer chooses layout; backend owns permission boundaries, matching evidence, timeline and confirmation rules.

## 1. Product vision

The connected mailbox becomes an **authorised, optional** source of signals across the job-search journey:

```text
User authorises Gmail for explicitly selected purpose(s)
                 |
       +---------+----------+
       |                    |
  Capability A          Capability B
  Job Alert Discovery   Application & Interview Intelligence
       |                    |
  New job captures      Application confirmations, review,
  and deduplication     assessments, recruiter messages,
       |                interviews, offers, rejection
       +---------+----------+
                 |
         Verified matching to
      user's private job/application
                 |
    Evidence, confidence and approval
                 |
   Append-only event history and alerts
                 |
  Dashboard: Jobs · Applications · Interviews · Offers
```

The user can choose **job-alert imports only**, **application/interview tracking only**, **both**, or **neither**. An account may continue to use GuidOn without Gmail.

## 2. Capability A — Job-alert intake (earlier phase)

Import permitted LinkedIn, employer and recruiter job-alert messages, identify vacancy links and relevant metadata, deduplicate against the current user's saved jobs and an authorised shared catalog, then surface discoveries for review. A job alert is **not** proof that the user applied.

Potential ingestion options to assess during implementation:
- **User-created forwarding/label route:** relevant messages are forwarded to a dedicated GuidOn intake address by a rule the user knowingly configures. Handle per-user mailbox routing, sender authenticity, abuse, opt-out and duplicate message IDs; do not assume a forwarding rule can be silently created.
- **Consent-based Gmail connection:** explicit Google sign-in/permissions with an initial limited-scope job-alert discovery feature. Use scopes required by the actual feature and reevaluate Google verification/security requirements before launch; no assumed access to all messages.
- **User paste/share fallback:** add vacancy URLs or content without connecting email.

A one-click website onboarding goal does **not** mean unreviewed automatic forwarding or read access. For 100+ users use **per-user permissions, mapping, checkpoints, quotas and deduplication** rather than one common Gmail account or shared inbox identity.

## 3. Capability B — Automated Application & Interview Tracking (FUTURE)

This is **the second major Gmail capability**, separate from job discovery. Expand the user's explicitly authorised Gmail access only when this phase is activated and the user accepts the additional purpose.

| Incoming signal | Proposed GuidOn action | Release / confidence gate |
| --- | --- | --- |
| LinkedIn or employer job alert | Create or suggest a Discovery job | Never infer an application |
| "Application received", acknowledgement with application ID | Create/confirm a submitted application event | Auto-link only when matching is unambiguous; otherwise ask |
| "Application under review" | Append In Review event | Correct application and clear employer signal required |
| "Complete this assessment" | Create an assessment task with link/deadline if provided | Verify invitation, avoid opening untrusted links automatically |
| "We'd like to interview you" | Interview Invited event | Strong sender/role/thread match |
| Interview scheduled on a named date | Capture date, time, timezone, location or meeting link | Explicit date/time parsing, timezone ambiguity review |
| Interview rescheduled | Amend linked interview occurrence with a reschedule event, preserving the old time | Match existing interview and confirm ambiguity |
| Recruiter asks for more information | Recruiter Response / Action Needed event | Do not claim rejection or offer |
| "Unfortunately, we won't proceed" | Propose Rejected event | **User confirmation before changing consequential status** |
| "We'd like to offer you..." | Flag a Potential Offer, then Offer Received if verified and user approved | **User confirmation; never infer acceptance** |
| Generic newsletter, email receipt, job alert | Ignore or tag as discovery only | Never equate with an application confirmation |

Distinguish **email signals** from **verified state**. Even apparently clear messages may be replies to a different vacancy, forwarded to the user, spoofed or from a third-party recruiter. The event history must retain that distinction.

## 4. Correct-application matching is the central intelligence

The same employer may have multiple applications (e.g., three Microsoft roles). Matching is not just company-name comparison.

Candidate evidence signals:
- Employer's **application ID / requisition ID**; exact match is highest-priority when trustworthy.
- Role/title and requisition from the email subject/body compared with saved application data.
- Verified sender domain, recruiter contact, linked employer ATS identifiers.
- Gmail thread/message identifiers, References/In-Reply-To where available, and chronology.
- Employer-specific links and dated application actions.
- Source email type: alert, submission receipt, recruiter interaction, assessment, interview, generic newsletter.

Proposed match outcome contract:
- **Matched:** sufficient unambiguous evidence, linked to one user-owned application.
- **Needs confirmation:** several plausible roles, partial match or consequential change; suggest candidates, show only necessary metadata.
- **Unmatched:** retain an optional user-reviewed inbox item; do not create/overwrite an application based on an assumption.
- **Ignored/duplicate:** same message/event already processed or irrelevant.

Never let an AI model assign an application ID without server-side membership checks. Use idempotency keyed by user, provider message ID, event type and target application. Confidence is explainable, not a made-up probability.

## 5. Application lifecycle and append-only history

Maintain **two independent sets of states**, rather than overloading the existing jobs dashboard:
1. **Job workflow:** Discovered, Interested, CV Preparing, CV Prepared, Applied, Applied + Connected, Rejected, Not Interested, Snoozed (existing per-user job choices).
2. **Application and interview process:** Submitted, In Review, Assessment Requested, Assessment Completed, Interview Invited, Interview Scheduled, Interview Rescheduled, Interview Completed, Offer Potential, Offer Received, Rejected, Withdrawn, plus optional other supported employer-defined stages.

Store per user:
- `applications/{applicationId}`: linked job ID, employer/requisition, associated CV version, optional external apply ID, **derived current state** and timestamps.
- `applications/{applicationId}/events/{eventId}`: immutable state transition, origin (`user`, `extension`, `email`), confidence, email/message reference hash or encrypted locator, extraction and user confirmation status.
- `applications/{applicationId}/interviews/{interviewId}`: typed rounds and appointments, start/end/timezone, location or meeting link, invitation thread reference, all reschedule history.
- `applications/{applicationId}/tasks/{taskId}`: assessment, response and preparation tasks with source references and due dates.
- `users/{uid}/emailConnections/{connectionId}`: minimal connection metadata, granted scope/purpose, enable/disable state, checkpoints and revoke status. OAuth tokens must be server-side encrypted and inaccessible to client scripts.

An email should produce an **inferred candidate event** first. Promotion to a verified status depends on matching and confirmation rules. Rejections, offers and ambiguous application matches **always require user confirmation**. Never auto-accept an offer, reply to a recruiter or submit any employer form.

### Example timeline (illustrative, not a live email event)

`Financial Analyst · Example Company · Dublin`

```text
Connected email
  -> Application receipt matched to job (Submitted)
  -> Employer review notice (In Review)
  -> Interview invitation (Interview Invited)
  -> Interview details saved (Scheduled, current)
  -> Rescheduling email (Rescheduled, old event retained)
  -> Potential offer identified (Needs confirmation)
  -> User confirms official offer (Offer Received)
```

The user can correct an incorrect match or revert a status without losing earlier event evidence.

## 6. Notifications and future calendar integration

Notifications may include interview invitations, ambiguous status requests, upcoming assessments, interview reschedules, recruiter requests for response and confirmed offers/rejections. Respect per-user quiet hours and notification preferences, deduplicate messages and do not expose private email content in push previews by default.

Calendar integration is a **separate later consent** for creating/updating reminders and interview events. Calendar write permissions must not be requested solely to import job alerts. Never join a meeting, respond to an invitation or reschedule on the user's behalf without explicit authorisation.

## 7. Permissions, privacy and operational safeguards

- Separate explicit consent for **job-alert discovery** and **application/interview tracking**; explain which categories of messages need access, the retention period and how to disable either purpose.
- Prefer least-privilege access, allow selective coverage where feasible, and review current Google OAuth scope verification, restricted-scope and security-assessment requirements before engineering launch.
- No reuse of the existing Chrome extension's website host permissions as authority to read Gmail. The extension and Gmail integration are independently authorised surfaces.
- Use background workers/checkpoints with rate limits and retry idempotency; no duplicated statuses after repeated email delivery or reconnect.
- Store minimal message metadata and purpose-limited extracted facts, not entire mailbox archives by default. Never persist passwords, account cookies, full attachments or sensitive email content unnecessarily.
- Use provider token rotation/revocation, encrypted storage, audit logs and clear connected-account controls. Users must be able to disconnect, stop processing and request personal data export/deletion under the adopted retention policy.
- Treat message content as untrusted input; ignore embedded instructions, suspicious links and HTML-based prompt injection. Only typed, verified application facts can alter user-owned records.
- Handle forwarded mail with authenticity limitations: forwarded content alone may be insufficient for verified sender or application matching.
- Track incomplete data, deletions, quota errors, expired permissions and false positives; provide an explanation/correction UI.

## 8. Exact future roadmap (not implemented)

| Phase | Capability | Status |
| --- | --- | --- |
| Gmail 1 | User-consented job-alert connection, permitted import and deduplication | **Planned** |
| Gmail 2 | Application receipt detection and association | **Future** |
| Gmail 3 | Recruiter responses and review status classification | **Future** |
| Gmail 4 | Interview invitations, scheduling, changes and rounds | **Future** |
| Gmail 5 | Assessment tasks, deadlines, reminder options | **Future** |
| Gmail 6 | Potential offer and rejection recognition with mandatory user confirmation | **Future** |
| Gmail 7 | Optional Calendar link and interview preparation workflow | **Future** |
| Gmail 8 | Analytics: applications, recruiter response rate, stage conversion, time to first interview and time to offer | **Future** |

**Prerequisites:** authenticated multi-user accounts, confirmed per-user application IDs and CV version links, job-dedup logic, consent/account settings, event persistence and support for manual correction. Email-based tracking cannot be accurately tested until the core application model exists.

## 9. Integration with Chrome extension and unified Dashboard

The [existing Chrome extension migration](CHROME_EXTENSION_INTEGRATION.md) remains a separate planned track:
- Capture Job → private job database; user reviews.
- Make/recommend CV → same user-owned evidence, file versions, scores and audit.
- Autofill **only current page** using approved data, with **no automated Next, Continue or Submit**.
- Candidate marks Applied after submission. Later Gmail detection may **supplement**, verify or propose updates to that **same** application, never create duplicate histories.

The future Dashboard should display Jobs, Applications, Interviews and Offers from shared user records, attributing every milestone to its source (manual, extension or Gmail) and its verification state. The website, installable PWA and optional native mobile browser remain presentation clients to this backend, not separate data stores.

## 10. Design and acceptance criteria for implementation later

Before declaring Gmail 1 complete: separate test mailboxes and users, consent and revoke, correct alert extraction, dedup, provenance and redaction, no applicant-status inflation.

Before declaring Gmail 2–6 complete: multiple same-employer roles, unknown/forwarded senders, no false rejection/offer changes, replay-safe updates, timezones/reschedules, event reversals, unreadable/ambiguous messages, privacy/export/delete, calibrated match review and real user sign-off.

**No live Gmail connection, mailbox polling, OAuth permission grant, automated event classifier or calendar write has been requested or executed here.** This document only adds roadmap requirements.
