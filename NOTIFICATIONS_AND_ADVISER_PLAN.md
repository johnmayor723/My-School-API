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

### Part B -- built, 2026-10-12

`scripts/reminders/run.js` + `src/services/reminders/` (one module per alert type, shared `notifyStudent.js` dispatcher). All 4 types verified end-to-end against the live dev DB (real unpaid assessments fired for real; scholarship-deadline, parent-consent, and admission-session-closing exercised with temporary synthetic fixtures, cleaned up after) -- including dedup idempotency (a second run sends nothing) and the WhatsApp dark-launch log path.

One design refinement made during implementation, beyond what's in the table above: for the two day-threshold types (scholarship deadline, admission session closing), only the single nearest unmet offset fires per run, worded from the *actual* days remaining rather than the offset number itself. Checking every offset independently (as originally written) meant a scholarship saved -- or a session's endDate set/moved -- with e.g. 5 days already left would fire both the 14-day and 7-day buckets in the same run, each wrongly saying "14 days" / "7 days" instead of the true 5. This doesn't change the decided offsets (14/7/1 and 14/7 still gate which bucket can fire), just which single bucket wins when more than one would otherwise match at once.

Email copy is live now (via whatever mail provider is configured); WhatsApp is still dark-launched pending the 3 templates below being submitted to and approved by Meta -- **not yet submitted**, since that's a real-world step outside this codebase.

**Cron wired 2026-10-12**: `0 8 * * * cd /opt/my-school-placement-api && node scripts/reminders/run.js >> /var/log/my-school-placement-reminders.log 2>&1`. Reminder emails to real signed-up students are now live, once daily at 08:00. WhatsApp sending stays dark-launched regardless (no templates approved yet), so the WhatsApp branch of the cron run only logs.

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

### Scope correction, 2026-10-12 (before Part C build started)
Student↔adviser communication must be **in-app messaging**, not email/WhatsApp-only as originally scoped above. Email/WhatsApp stay as the *alerting* mechanism (staff alerted on creation, student notified on status transitions, per decisions 1-4 above, unchanged) -- but the actual back-and-forth conversation is a real in-app chat thread, added as a new `AdviserEnquiryMessage` model + `GET`/`POST .../messages` endpoints on both the student and admin routes. No websocket/live-push infra exists anywhere in this API (same finding as before), so this is a plain REST-polled thread, same pattern as the existing assessment AI chat (`ChatMessage` / `AssessmentChatScreen`) -- clients poll every 5s, not real-time push.

## Part C -- built, 2026-10-12

Backend (`38dd2ea`): `AdviserEnquiry` + `AdviserEnquiryMessage` models, `ADVISER` role + `VIEW_ADVISER_ENQUIRIES`/`MANAGE_ADVISER_ENQUIRIES` permissions (seeded as a system role), round-robin assignment (`count % adviserStaff.length`, not a pointer document), synchronous email+WhatsApp staff alert on creation, student notified via the existing `notifyStudent` dedup mechanism on NEW→CONTACTED and →CLIENT/CLOSED. Student-facing routes (`/v1/adviser-enquiries`) and staff routes (`/v1/admin/adviser-enquiries`) both expose the message thread. Verified end-to-end via live HTTP calls: creation + round-robin + dark-launched alerts, ownership-isolated student access (a second student 404s on someone else's enquiry), staff reply + status transition + audit logging, and validator edge cases (missing consent, missing sourcePage).

Web (`32e9f2f`): student-facing `/adviser` page (consent + callback-window form, flips to the chat thread once an enquiry exists) linked from the student sidebar and a new Dashboard quick action. Admin `/admin/adviser-enquiries` list + detail page (status/notes + staff reply thread), gated server-side only (same uniform-sidebar convention as the rest of the admin console -- permission enforcement is server-side via `permit()`, not hidden in the UI).

Mobile (`5a7257a`): `AdviserEnquiryScreen` replaces the dead "Book a call" CTA on Dashboard (previously just opened the marketing site's `/contact` page in a webview). Same form/chat pattern as web, styled per the mobile design system, mirroring `AssessmentChatScreen`'s bubble/poll UI.

**Playwright-verified full loop, both platforms, 2026-10-12**: student submits on web → admin sees it in the list, correctly round-robin assigned → admin opens detail, replies, marks CONTACTED → student's page (polling) shows the reply and "An adviser is on this" status. Mobile: navigated in via the Dashboard banner, loaded the same open enquiry + its messages, successfully sent a new student reply.

**Not yet built, per the memo's own broader ask**: the "Speak to a MACL Adviser" CTA only exists on the student Dashboard (both platforms) so far -- the memo also calls for it on every university/course/checker/scholarship page. Mechanism is proven and reusable (same `/adviser` route on web, same `AdviserEnquiry` screen+params on mobile, just needs a CTA + `sourcePage` label added per page) -- treated as a fast-follow, not re-litigated here.

**Operational gap, not a code gap**: no staff member currently holds the `ADVISER` role in the live database -- round-robin assignment correctly no-ops (`assignedAdviser: null`, a warning logged) rather than crashing when this happens, but it means real enquiries will sit unassigned until a real adviser is designated. Someone needs to either grant an existing staff account the `ADVISER` role or create a dedicated one via the admin console's Users/Roles pages.

## Explicitly not in this document
General deadline/reminder types beyond the 4 listed (e.g. per-institution application deadlines -- that data doesn't exist anywhere yet, a prerequisite of its own). The admin "unverified >12 months" dashboard flag (memo item 8) -- a UI badge question, not a notification-sending one, out of scope here.

## Approval to proceed
**All decisions made, approved to build.** Given the size (new WhatsApp provider + 4 alert types + an entire new staff-facing feature), building Part A (shared infra) first as one commit, then B and C as separate follow-on pieces -- same incremental-vertical-slice discipline as the scholarship system's stages.
