# MySchoolPlacement Notifications, Reminders & Adviser Enquiries

Authoritative roadmap and approval record for this feature, started 2026-10-11. Same discipline as `SCHOLARSHIP_IMPLEMENTATION_PLAN.md`: this file is updated at the end of every phase, before asking for approval to proceed. Split out as its own document rather than folded into the scholarship plan because the scope has grown past "the scholarship feature" -- it now covers Phase 1 memo items 6 (Reminders) and 7 ("Speak to a MACL Adviser"), which share notification plumbing but are otherwise unrelated features with different audiences.

**Current phase: SCOPED AND APPROVED — all 7 open decisions resolved 2026-10-11 (below). Implementation not started yet.**

## Why this exists, and why it's one document covering two memo items

Starting from "build WhatsApp alerts," three rounds of clarification established:
1. WhatsApp vendor: **Meta WhatsApp Cloud API**, direct (not a BSP, not Termii).
2. Scope isn't just saved-scholarship deadlines -- it's 4 student-facing alert types that all share the same plumbing (channel preference, provider, scheduler, dedup), confirmed via a grounded audit of what data actually exists in the app today (not guessed).
3. Memo item 7 ("Speak to a MACL Adviser," §2.4/§6.3's stated actual revenue mechanism -- "adviser must be alerted within 5 minutes") doesn't exist as a feature at all yet -- confirmed via grep, the only trace anywhere is a Dashboard promo banner whose "Book a call" button opens the external marketing site's `/contact` page, not an in-app booking flow. You chose to scope and build the enquiry pipeline itself together with its alert, not defer it.

These share one WhatsApp/email sending layer and one scheduler, so they're planned together. They are otherwise independent: one is scheduled batch reminders to students about dates; the other is a real-time operational alert to staff about a new lead.

## Part A -- Shared notification infrastructure

### What already exists (confirmed via code, don't rebuild)
- Email: `notification.service.js` -> `mailer.js` -> gemfi-mail-service, falls back to direct SMTP, falls back to logging.
- SMS: `smsSender.js` -> Termii, same dark-launch convention (logs when unconfigured).
- **WhatsApp: zero capability anywhere.**
- Scheduler: none in-process. This server's real convention is OS crontab + a standalone Node script (see the Tier A/B deploy entries and scholarship-service's weekly crawl -- [[gemfi_push_to_deploy_automation]], [[scholarship_service_crawler]]).
- `User`: has `email`/`phone`/`phoneVerified`, **no notification-preference or consent fields**.
- No websocket/SSE/any live-push infrastructure anywhere in this API -- confirmed via grep. "Alert an adviser within 5 minutes" (Part B) has to mean "send them email+SMS/WhatsApp the moment an enquiry is created," not an in-app live push, because the latter doesn't exist and building it would be a much bigger architectural change than this feature needs.

### Proposed design
- **WhatsApp provider** (`src/modules/notifications/providers/whatsapp/metaCloud.provider.js`): targets Meta's Cloud API (`graph.facebook.com/v{N}/{PHONE_NUMBER_ID}/messages`), bearer-token auth (`WHATSAPP_ACCESS_TOKEN`), dark-launched like `sendSms` -- logs instead of sending when unconfigured. **Meta requires a pre-approved message template for any business-initiated message outside a 24-hour user-initiated session window.** Every alert type below needs its own approved template before it can actually send in production -- this is a real lead-time item independent of code (template review can take days), and independent per template (the scholarship-deadline template and the adviser-alert template are separately submitted and approved).
- **Channel preference**: `User.notificationPreferences: { email: Boolean (default true), whatsapp: Boolean (default false) }` -- email opt-out, WhatsApp opt-in, per §6.1's note that WhatsApp consent wording needs separate legal sign-off. Exposed via `PATCH /profile`.
- **Scheduler**: `scripts/reminders/run.js`, OS cron, once daily. One script, one pass, checks all 4 alert types below in sequence (cheap enough not to need 4 separate cron entries).
- **Dedup pattern**: generic, not scholarship-specific -- a `NotificationLog` collection (`user`, `type`, `dedupeKey`, `sentAt`) that every alert type writes to and checks before sending, rather than bolting ad hoc "already sent" fields onto 4 different models. `dedupeKey` design per type is listed below.

## Part B -- The 4 student-facing alerts (confirmed in scope)

| Alert | Trigger | Dedup key | Notes |
|---|---|---|---|
| Saved scholarship deadline | 14/7/1 days before a `SavedScholarship`'s **live** deadline (re-fetched from scholarship-service at send time, not the saved snapshot -- this is what makes "auto-reschedule" work for free) | `scholarship:{savedScholarshipId}:{offsetDays}:{deadlineISO}` | 404 from scholarship-service (admin deleted it since saving) -> skip silently, per your decision. |
| Parental consent pending | N hours after signup with `ParentConsent.status=PENDING` and still pending (propose 24h and 72h reminders, two total, then stop) | `consent:{parentConsentId}:{offsetHours}` | Goes to the **parent's** contact (email/phone captured in `ParentConsent`), not the student -- this one isn't gated by the student's own `notificationPreferences` since it's not the student being notified. Uses whatever `channel` the parent originally chose, same as the existing manual resend. |
| Unpaid/abandoned assessment | Assessment created, `paymentStatus=UNPAID`, N hours later and still unpaid (propose a single reminder at 24h) | `assessment:{assessmentId}:unpaid` | Not in the Phase 1 memo's 8 items -- a product add-on you're choosing to add, not a spec requirement. Worth remembering if this is ever audited against the memo. |
| Admission session closing soon | An `AdmissionSession` a student has an `Assessment` against is within 14/7 days of `endDate` | `session:{userId}:{admissionSessionId}:{offsetDays}` | Coarse signal -- session-level only, no per-institution/programme deadline exists anywhere in the data model. Many `AdmissionSession` docs may have no `endDate` set at all (optional field) -- those are simply skipped, not an error. |

### Decisions, Part B (2026-10-11)
1. **Offsets confirmed as proposed**: parental-consent-pending at 24h + 72h after signup; unpaid-assessment at 24h after creation.
2. **Message content/templates** -- still to draft. I'll write copy for all 4 email templates + the WhatsApp template text that needs Meta submission as part of implementation; worth your review before anything is actually submitted for approval (resubmitting a rejected template costs more lead time).

## Part C -- Adviser enquiry pipeline (memo item 7, new feature)

### What the memo actually requires (§3.1 item 7, §6.3)
A "Speak to a MACL Adviser" button on every university/course/checker/scholarship page. Student consents to share their profile, picks a callback slot. Enquiry assigned to an adviser, who must be alerted within 5 minutes. Tracked New -> Client/Closed. This is called out as the platform's actual revenue mechanism, not a minor feature.

### Proposed data model
- New `AdviserEnquiry` model: `student` (ref User), `sourcePage` (string -- which university/course/checker/scholarship the button was clicked from, for adviser context), `profileConsent` (Boolean, required true to submit), `preferredCallbackSlot` (a date/time range the student picks), `status` (`NEW` -> `CONTACTED` -> `CLIENT` | `CLOSED`, mirroring the memo's wording), `assignedAdviser` (ref User, staff), `notes` (staff-only), timestamps.
- **No existing "adviser" role or staff concept** -- need a new `ROLE_NAMES.ADVISER` (or reuse `SUPPORT`? recommend a dedicated role, since "assigned enquiries" is a distinct responsibility from Support's existing student-account-assistance scope) and permissions (`VIEW_ADVISER_ENQUIRIES`, `MANAGE_ADVISER_ENQUIRIES`).
- **Assignment mechanism**: open question below -- round-robin across all ADVISER-role staff, manual assignment by a lead, or first-to-claim from a shared queue?

### Proposed flow
1. Student clicks "Speak to a MACL Adviser" (already exists as a dead CTA on mobile's Dashboard; needs building on every university/course/checker/scholarship page per the memo, both platforms).
2. Consent + callback-slot picker -> `POST /v1/adviser-enquiries`.
3. On create: immediately notify assigned/queued adviser(s) via email + WhatsApp (not just in-admin-UI, since there's no live-push mechanism and staff won't be staring at a dashboard 24/7) -- "within 5 minutes" in practice means "synchronously on request, not batched."
4. Admin UI: enquiry queue (list + detail, status transitions, notes) -- same CRUD-list convention as `AdminScholarships.jsx`.
5. Status changes (e.g. a staff member marks CONTACTED) are not currently required to notify the student back, per the memo's wording -- confirm if you want a confirmation message to the student too.

### Decisions, Part C (2026-10-11)
1. **Assignment: round-robin.** On creation, auto-assign to the next `ADVISER`-role staff member in rotation (simple counter/last-assigned pointer, not a complex load-balancing scheme) -- so the 5-minute alert can fire synchronously on creation with no manual step in between.
2. **Callback slot: free-text preferred window** (e.g. "weekday evenings"), not real scheduling. No calendar/availability system -- out of scope, consistent with nothing like that existing anywhere in this app today.
3. **New `ROLE_NAMES.ADVISER` role**, with its own permissions (`VIEW_ADVISER_ENQUIRIES`, `MANAGE_ADVISER_ENQUIRIES`) -- not reusing `SUPPORT`.
4. **Student gets notified on both transitions**: a short email/WhatsApp when an adviser takes the enquiry (NEW -> CONTACTED) and again when it resolves (-> CLIENT or CLOSED).
5. Same WhatsApp-template lead-time note as Part B applies here too -- the adviser-alert and student-update templates are separate Meta submissions from the 3 Part-B templates (5 total across this whole doc).

## Explicitly not in this document
General deadline/reminder types beyond the 4 listed (e.g. per-institution application deadlines -- that data doesn't exist anywhere yet, a prerequisite of its own). The admin "unverified >12 months" dashboard flag (memo item 8) -- a UI badge question, not a notification-sending one, out of scope here.

## Approval to proceed
**All decisions made, approved to build.** Given the size (new WhatsApp provider + 4 alert types + an entire new staff-facing feature), building Part A (shared infra) first as one commit, then B and C as separate follow-on pieces -- same incremental-vertical-slice discipline as the scholarship system's stages.
