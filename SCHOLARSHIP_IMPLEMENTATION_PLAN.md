# MySchoolPlacement Dynamic Scholarship Discovery, Verification and Management System

Authoritative roadmap, stage status, and approval record for the scholarship feature. This file is the single source of truth for stage status — update it at the end of every stage, before asking for approval to proceed.

**Current stage: 6 (Public directory) — DONE and verified on web + mobile. Stage 7 (student matching) not started.**
**Next stage authorized: none yet. Stage 7 requires your go-ahead.**

**2026-10-11 process note:** you directly instructed "wire up with my school placement... ensure admin can verify, confirm dates, delete... sources needs to be added on UI" rather than approving Stage 1 and waiting for Stage 2/3 write-ups one at a time. That instruction *is* the answer to Stage 1's blocking question (the source API's contract) and effectively decided Stages 2-3 by example, so this update folds Stages 1-5 into one entry rather than performing an empty ceremony of writing speculative Stage 2/3 documents for decisions you'd already made. Stages 6-10 (public directory, student matching, notifications, SEO, QA/release) were **not** touched and still need their own approval before starting.

## Stage table

| Stage | Name | Status | Evidence | Next action |
|---|---|---|---|---|
| 1 | Repository analysis | DONE (approved by proceeding) | This document + `ARCHITECTURE.md` | — |
| 2 | Source/verification design | DONE (by direct instruction, see note) | Source of truth = `/opt/scholarship-service` (separate repo, SQLite); it already owns discovery, crawling and the open/upcoming/closed/suspended/unconfirmed/review_required/archived status lifecycle, plus `verified_at`/`verification_notes`. MACL does **not** duplicate this -- see [[scholarship_service_crawler]]. | — |
| 3 | Data model and architecture | DONE (by direct instruction) | **No new Mongoose model.** `scholarshipService.client.js` proxies scholarship-service's REST API server-to-server; the admin API key never reaches the browser. `RESOURCE_TYPES.SCHOLARSHIP`/`SCHOLARSHIP_SOURCE` + 3 new permissions added for audit/authorization only. | — |
| 4 | Ingestion and verification engine | **Not rebuilt here** -- already exists in scholarship-service (crawler + admin verify/delete endpoints). This stage's only MACL-side work was adding the two endpoints scholarship-service was missing (`DELETE /api/admin/scholarships/:id`, and `deadline`/`applicationUrl` on the verification PATCH) so "confirm dates" and "delete inaccurate record" were possible at all. | — |
| 5 | Admin management | DONE for verify/confirm-dates/delete/source-management | MACL admin routes (`/api/v1/admin/scholarships/*`), controller, validators, `permit()`-gated on `VERIFY_SCHOLARSHIPS`/`DELETE_SCHOLARSHIPS`/`MANAGE_SCHOLARSHIP_SOURCES` (granted to `CATALOG_MANAGER` + `SUPER_ADMIN` via `PERMISSIONS.ALL`), audit-logged. Admin UI: `AdminScholarships.jsx` (verify/confirm-dates/delete) + `AdminScholarshipSources.jsx` (add source/enable-disable/run crawl/crawl history), following the `AdminUniversities.jsx` modal-CRUD convention. Verified end-to-end via curl against a real minted JWT (list/get/verify/confirm-dates/delete, audit entries confirmed in Mongo) and via `eslint` + Vite HMR for the frontend (no browser automation tool was available this session, so the UI was not click-tested in an actual browser -- flagging that gap honestly rather than claiming full UI verification). | Student acceptance: click through the UI in a real browser before fully trusting it. |
| 6 | Public directory | DONE | See Stage 6 section below. Verified via Playwright (web + mobile Expo-web preview) and curl. | — |
| 7 | Student matching | NOT STARTED | — | Requires Stage 6 |
| 8 | Notifications and jobs | NOT STARTED | — | Requires Stage 7 |
| 9 | SEO and onboarding | NOT STARTED | — | Requires Stage 8 |
| 10 | QA and release | NOT STARTED | — | Requires Stage 9 |

---

## Stage 1 — Repository Analysis and Requirements

### Objective
Establish the actual architecture across all three repos, identify reusable systems and relevant prior art, and document risks/open decisions before any implementation begins.

### Scope
Analysis and planning only. No feature code, no schema migrations, no destructive changes. (One self-correction mid-stage: a small set of scholarship-specific enum constants had been added to `src/config/constants.js` before this master prompt's process was adopted — these were reverted back out once the larger scope was confirmed, since Stage 3 will define the real data model from scratch.)

### Dependencies
None — this is the first stage.

### Architecture found (see `ARCHITECTURE.md` for full detail)

- **Three repos, no CMS**: `my-school-placement-api` (Express + Mongoose/MongoDB), `my-school-placement-admin-repo` (Vite + React SPA, react-router, shadcn-style components — **client-rendered only, no SSR/SSG**), `my-school-placement-mobile` (Expo/React Native, student-only). Confirmed via grep across all three: **no WordPress, no Next.js, no other CMS anywhere.**
- **Auth/RBAC**: JWT access+refresh tokens; students sign up/log in via OTP (email or phone), staff via password. Staff permissions are a flat string set (`PERMISSIONS.*`) attached to `Role` documents, enforced per-route by a `permit(...permissions)` middleware. `requireActive` additionally gates feature routes (assessments/chat/payments/compare) behind an under-18 parental-consent check — see `[[my_school_placement_parental_consent_gate]]` memory; any scholarship "save" action should likely sit behind this same gate for consistency, to be confirmed in Stage 3.
- **No scraping infrastructure, and none needed**: you've confirmed scholarship data will come from an **API you already built for this purpose**, not web scraping. This removes the per-source ToS/legal-risk question the master prompt's §4 otherwise raises, and removes the need for an HTML-parsing library, a source-adapter-per-website architecture, or a robots/rate-limit policy engine. It does **not** remove the need for a verification/editorial-review layer — your API is the *source of facts*, not necessarily a guarantee that every fact is ready to publish without review (to be confirmed in Stage 2).
- **No scheduler/job-queue infrastructure for this project.** `package.json` has no `node-cron`/`bullmq`/`bull`/`agenda`. `src/server.js` has zero scheduling code. The real OS crontab on this box has 6 entries, all deploy pipelines for *other* GemFi projects — none for My School Placement. Periodic re-sync against your API will need a new mechanism; given this server's own convention is OS cron + a Node script (not an in-process queue library), that's the natural default, to be confirmed in Stage 3/8.
- **Notification infrastructure that exists**: email via `notification.service.js` → `mailer.js` (gemfi-mail-service, falling back to direct SMTP, falling back to logging) and SMS via `smsSender.js` (Termii). **No WhatsApp capability exists anywhere** (confirmed, zero matches) — the master prompt's WhatsApp-reminder suggestion would need new integration work, not reuse.
- **No SEO/meta-tag infrastructure on the web SPA at all**: no `react-helmet`, no sitemap, no `document.title` management, no SSR. This is a real architectural gap against the master prompt's Stage 9 expectations (server-rendered pages, sitemap integration, structured data) — a pure Vite CSR SPA cannot be made search-engine-crawlable the way the master prompt assumes without either (a) adding `react-helmet-async` for client-side meta tags (works for social-share previews and basic on-page SEO, but Googlebot-only-adequate, not true SSR) or (b) a real SSR layer, which is a much bigger change than this feature should carry on its own. Flagging as a Stage 9 decision point, not solving it now.

### Prior art found in this exact codebase (important)

Two previous attempts at an "ingest → verify → publish" pipeline already exist here, with very different outcomes:

1. **Cut-Off Marks Intelligence scaffold (`CutoffSource`/`CutoffCandidate`/`CutoffRecord`, `src/scrapers/`, `scripts/cutoffs/`) — incomplete and non-functional.** The staging/candidate/confidence/dedupe-key pattern is a reasonable shape to borrow conceptually, but as a *cautionary tale*: the scraper logic itself is real, but the admin review surface is broken (`cutoffCandidate` has no routes/controller at all; `cutoffSource`'s routes exist but are never mounted, so they're unreachable; the promotion service `cutoffRecord.service.js` doesn't exist, so `approve()` would throw at runtime). Zero real data was ever ingested — no cache files, no completion markers. **Lesson for this project: build thin, fully-wired vertical slices (model → service → controller → route → mounted → admin UI, confirmed reachable end-to-end) at each stage, rather than a wide scaffold left with gaps.**
2. **`AdmissionRule`'s verification/review pattern — fully working and mounted.** `RULE_STATUS` (`DRAFT → REVIEW → APPROVED → PUBLISHED`, plus `ARCHIVED`), one dedicated permission per transition, embedded `source` (title/type/url/sourceDate) and `verification` (lastVerifiedAt/verifiedBy/notes) sub-schemas, a review-queue list page linking to a detail page whose action buttons are driven by a `statusFlow` map plus a dedicated "Source & verification" card. **This is the real template to follow for the scholarship editorial workflow** — proven, reachable, and already matches a pattern staff are used to.

### Existing UI conventions to match (web)

- Public finder precedent (`Universities.jsx`/`UniversityDetail.jsx`): debounced search + `Select` dropdown filters, infinite-scroll pagination (not page buttons), card grid grouped by a dimension (zone), detail page as a 3-column info-card layout with a disclaimer box.
- Admin CRUD precedent (`AdminUniversities.jsx`): single list page + modal dialog form for create/edit, soft-delete via a confirm dialog, no separate create/edit routes.
- **No existing bookmark/save/favorite UI pattern anywhere in the repo** — confirmed via full grep, zero hits beyond false positives. The "saved scholarships" feature is a net-new UI pattern, not a reuse of something existing.

### Unresolved decisions / open dependencies (blocking Stage 2)

1. **Your scholarship-source API's contract is not yet known to this plan.** Stage 2 (source/verification design) and Stage 3 (data model) cannot be done honestly without: base URL/auth mechanism, pagination shape, exactly which fields it returns per scholarship, whether it already expresses academic-session/application-cycle and verification/evidence data itself (in which case MACL's own verification layer is thinner — mostly ingest + lighter review) or returns only raw facts that still need MACL-side eligibility/verification review before publishing (in which case MACL needs the fuller editorial pipeline the master prompt describes), its rate limits/pagination/update-notification mechanism (polling vs. webhook), and how it represents status changes (e.g. does it tell you when a scholarship closes, or do you have to infer that from a disappearing record or a past deadline). **This is the single most important input needed before Stage 2 can be written for real rather than generically.**
2. Whether "save" (bookmark) should sit behind the existing `requireActive` parental-consent gate (consistent with assessments/chat/payments/compare) — recommended yes, to confirm in Stage 3.
3. SEO approach given no SSR exists (see above) — needs a decision in Stage 9, flagged now so it isn't a surprise later.
4. Scheduling mechanism for periodic re-sync against your API — recommended OS cron + Node script (matches this server's existing convention), to confirm in Stage 3/8.

### Deliverables
- `SCHOLARSHIP_IMPLEMENTATION_PLAN.md` (this file).
- `ARCHITECTURE.md` (companion document, full findings).

### Acceptance criteria
- [x] Actual architecture documented (all three repos, auth/RBAC, notification/scheduling infra, SEO reality).
- [x] Existing functionality and integration points identified (parental-consent gate, AdmissionRule review pattern, cutoff-intelligence cautionary tale, public finder + admin CRUD UI conventions).
- [x] No unnecessary infrastructure proposed without justification (scraping explicitly ruled out per your direction; scheduler/WhatsApp flagged as genuinely new work, not assumed-reusable).
- [x] Scope and dependencies documented, including the one blocking dependency (your API's contract).
- [ ] Artifact reviewed and approved by you.

### Tests / checks performed
Read-only repository inspection only (grep, file reads, `crontab -l`, `ls node_modules/*`, `node -e "require(...)"` module-existence checks) across all three repos. No code was run, no destructive commands, no migrations. All three Explore-agent passes cited above are reflected in `ARCHITECTURE.md` with file:line references.

### Files created or modified
- Created: `SCHOLARSHIP_IMPLEMENTATION_PLAN.md`, `ARCHITECTURE.md`.
- Modified then reverted: `src/config/constants.js` (net zero change — added and then removed scholarship-specific enums/permission from a premature simple-scope attempt before this master-prompt process was confirmed).

### Commit reference
Not yet committed — per your standing instructions, commits happen only when you explicitly ask.

### Known issues / blockers
- Blocked on your scholarship-source API's contract (see "Unresolved decisions" #1) before Stage 2 can be written concretely rather than generically.

### Completion evidence
Three parallel read-only reconnaissance passes (cutoff-intelligence + AdmissionRule pattern; infra inventory; admin/public UI conventions), synthesized above and in `ARCHITECTURE.md`.

### Approval to proceed
**Awaiting your review.** Stage 2 will not begin until you approve this document (and ideally supply the API contract details above).

---

## Stages 2-5 — Wiring, admin management (2026-10-11)

### Objective
Connect this app to scholarship-service as its scholarship system of record, and give staff the ability to verify scholarships, confirm/correct dates, delete inaccurate records, and manage the source registry -- all from MACL's own authenticated admin console.

### Scope
Backend: `src/config/env.js` (+`scholarshipService` block), `src/config/constants.js` (+2 `RESOURCE_TYPES`, +3 `PERMISSIONS`), `src/services/scholarshipService.client.js` (new), `src/controllers/scholarship.controller.js` + `src/controllers/admin/scholarship.controller.js` (new), `src/routes/v1/scholarship.routes.js` + `src/routes/v1/admin/scholarship.routes.js` (new, mounted), `src/validators/scholarship.validators.js` (new), `scripts/seed/run.js` (`CATALOG_MANAGER` role gains the 3 new permissions; re-run against the live DB). Upstream: `/opt/scholarship-service/src/server.js` gained a `DELETE /api/admin/scholarships/:id` and `deadline`/`applicationUrl` support on the verification PATCH -- neither existed before this, and both were required for "confirm dates" and "delete" to be possible. Admin UI (`my-school-placement-admin-repo`): `AdminScholarships.jsx`, `AdminScholarshipSources.jsx`, wired into `App.jsx` routes and `AdminLayout.jsx` nav.
Explicitly out of scope: no new Mongoose model, no public student-facing pages, no scraping/ingestion logic in this repo (that stays in scholarship-service).

### Architecture decision
MACL proxies scholarship-service server-to-server rather than syncing/duplicating its data into MongoDB. Reasoning: scholarship-service already carries the full editorial lifecycle (status enum, `verified_at`, `verification_notes`) that Stage 1's open question worried MACL might have to build itself -- it doesn't need to. A proxy keeps there being exactly one system of record, avoids a sync job, and still gives MACL its own audit trail (every verify/confirm-date/delete/source-change writes an `AuditLog` entry here, even though the underlying record lives in SQLite elsewhere). The scholarship-service admin API key lives only in this app's `.env`, never sent to the browser.

### Tests / checks performed
- scholarship-service's new endpoints tested directly with curl (valid confirm-date, invalid-date rejected with 400, create+delete a disposable record) before building on top of them. A test PATCH was accidentally applied to a **real** scholarship record (the Dangote Foundation one) during this; caught immediately and reverted to its original `deadline:null, verified_at:null` state before moving on.
- Full MACL proxy round-trip tested with a JWT minted directly for the existing `SUPER_ADMIN` seed user (no password was available/changed) against a disposable test record created directly in scholarship-service: list, get, verify+confirm-dates+delete via `PATCH`/`DELETE /api/v1/admin/scholarships/:id`, confirmed gone via the public endpoint (404), confirmed two `AuditLog` entries written with the correct `resourceId`.
- `CATALOG_MANAGER` role re-seeded (`node scripts/seed/run.js`) against the live Mongo instance so the new permissions actually took effect, not just in code.
- Frontend: `eslint --quiet` clean on all new/changed files; Vite dev server (already running under pm2) picked up every change via HMR with no compile errors; `/admin/scholarships` route returns HTTP 200.
- **Not done:** no real browser click-through -- no browser-automation tool was available this session (no puppeteer/playwright installed, no Claude-in-Chrome). The backend is proven end-to-end; the UI is proven to compile and mount but not proven to work correctly from a user's perspective.

### Known issues / follow-ups
- You should click through `AdminScholarships.jsx`/`AdminScholarshipSources.jsx` in a real browser before relying on them.
- Stage 6 (public directory) is the next real gap: students can't see scholarships anywhere yet, only staff.
- `my-school-placement-admin-repo` is a Base44-managed app (see its `AGENTS.md`) -- worth knowing before its next session.

### Commit reference
Committed and pushed same day: `my-school-placement-api` `364b0cf`, `my-school-placement-admin-repo` `103b2f7`, `scholarship-service` `e5c807f`..`b472537`.

---

## Stage 6 — Public directory (SCOPING, 2026-10-11)

### Objective
Give students somewhere to actually see scholarships -- a list page with filters, a detail page, and a save/bookmark option -- mirroring the public university/course finder's existing UX conventions. Backend read access already exists (`GET /api/v1/scholarships`, `/:id`, built in Stage 5); this stage is almost entirely frontend plus one small new backend piece (save/bookmark persistence).

### The blocking finding: the data isn't ready for students yet, independent of code
Checked the live data right before writing this: of 96 crawler-discovered records, **96 are `unconfirmed` or `review_required` -- zero are `open`, `upcoming`, or verified.** They're also mostly out-of-scope overseas-study scholarships (see [[scholarship_service_crawler]]) pulled from a federal ministry's general advert archive, not Nigeria-university-specific. The only genuinely current, in-scope, student-ready records live in the separate hand-researched `/api/nigeria-scholarships` snapshot (8 records, and even that's mostly `unconfirmed`/`closed` -- only 1-2 are actually `open` right now, one of which closes same-day it was researched).

**This means shipping Stage 6 against the raw `/api/scholarships` feed today would show students a page that's ~95% noise.** Two ways to handle this, your call:
1. **Default-filter the public page to `status=open` or `status=upcoming` only** (hide unconfirmed/review_required/closed/archived by default, maybe with a "show all" toggle for transparency). Code-only fix, ships today, but the "open" set may be near-empty most of the time until the admin review backlog gets worked down.
2. **Treat `/api/nigeria-scholarships` as the actual public source for now**, and park `/api/scholarships` as an internal admin-review queue until records get promoted/verified. Means building a promotion step (admin marks a crawler candidate "ready," which either flips its status or copies it into the curated set) -- more work, but avoids ever showing a half-verified crawler artifact to a student.
Recommend **option 1** to start (simpler, still correct given scholarship-service's own status semantics), with the admin review backlog called out as a separate, non-code workstream (someone needs to actually work through 96 `review_required` rows).

### Scope
**Web** (`my-school-placement-admin-repo`, public routes under `PublicLayout`):
- `src/pages/Scholarships.jsx` -- list page. Follows `Universities.jsx`'s exact pattern: hand-rolled debounced search (`useState`+`useEffect`, no library), `Select` dropdown filters, `IntersectionObserver`-based infinite scroll (not page buttons -- `page`/`PAGE_SIZE`/`sentinelRef`/`hasMore`), card grid. Filters per the Phase 1 memo item 5: country (fixed to Nigeria for now, not really a filter), study level, funding type *(not a field scholarship-service tracks today -- would need adding, or drop this filter)*, provider type (`source.type`: official/secondary), deadline range. Default `status=open` per the decision above.
- `src/pages/ScholarshipDetail.jsx` -- 3-column info layout matching `UniversityDetail.jsx`'s convention, disclaimer box. **Must carry the memo's exact §6.2 disclaimer text** (verbatim, not the existing `MATCH_SCORE_DISCLAIMER` wording, which doesn't match): *"Information is compiled from official sources and was last verified on the date shown. Requirements and cut-off marks can change. Always confirm with the institution or JAMB before applying. MySchoolPlacement does not guarantee admission."* Shows source link + verification date prominently (scholarship-service already carries both).
- Save/bookmark button on both pages -- **net-new UI pattern, confirmed zero precedent anywhere in the repo** (re-confirmed, matches Stage 1's finding).

**Mobile** (`my-school-placement-mobile`): equivalent list + detail screens, same design-system tokens as the rest of the app ([[my_school_placement_mobile_design_system]]). Not scoped in detail here pending your go-ahead on the web approach first -- would mirror it once web is settled.

**Backend** (`my-school-placement-api`): one new piece, save/bookmark persistence --
- New Mongoose model `SavedScholarship`: `student` (ref `User`), `scholarshipId` (string -- scholarship-service's sha256-derived id, **not** a Mongo ref, since the record lives in a different database entirely), plus a **denormalized snapshot** (`title`, `deadline`, `applicationUrl` at save time) so a saved-list page still shows something useful if scholarship-service's record is later edited or deleted. Unique index on `(student, scholarshipId)`.
- Routes: `POST /v1/scholarships/:id/save`, `DELETE /v1/scholarships/:id/save`, `GET /v1/scholarships/saved` (student's own list). All student-authenticated.
- **Dangling-reference handling needed**: scholarship-service now has a working `DELETE` (added this session) and staff will use it. A saved-scholarship whose source record was deleted should still render from the snapshot, clearly marked ("this scholarship may have been removed or updated -- re-check the source link") rather than erroring.

### Open decisions (need your call before implementation)
1. **Default status filter for the public page** -- option 1 or 2 above (recommend option 1).
2. **Does "save" sit behind the `requireActive` parental-consent gate?** (consistent with assessments/chat/payments/compare, per Stage 1's original flag -- recommend yes, browsing stays open to everyone but saving requires an active account, same as the rest of the app).
3. **"Funding type" filter**: scholarship-service doesn't track this field today. Drop the filter, or add the field upstream (small scholarship-service schema change)?
4. **Mobile scope for this stage**: build mobile screens alongside web, or web-first and mobile as a follow-up stage?

### Dependencies
Stage 5 (done). No dependency on Stages 7-10.

### Explicitly not in this stage
Matching scholarships to a student's profile (Stage 7), reminders/notifications (Stage 8), SEO/meta tags for these new pages (Stage 9 -- flagged in Stage 1 as a real gap, this repo has no SSR/react-helmet at all, so these new public pages will have the same search-invisibility problem every other public page here already has, not a new regression).

### Decisions (2026-10-11, via AskUserQuestion)
1. **Default status filter: open/upcoming only** (option 1). Admin review backlog (96 `review_required`/`unconfirmed` rows) remains a separate, non-code workstream.
2. **Save does NOT sit behind `requireActive`** -- a deliberate, confirmed exception to the pattern assessments/compare/payments use. A student with pending parental consent can still save scholarships. Record this as an intentional deviation, not a gap, if it's ever questioned later.
3. **Add `fundingType` to scholarship-service** -- small upstream schema change (new nullable column on `scholarships`, exposed on create/verification endpoints, filterable on `GET /api/scholarships`) before building the web/mobile filter against it.
4. **Build web and mobile together**, not web-first.

### Implementation (2026-10-11, same session as scoping)

**A fifth finding surfaced mid-build, not caught during scoping:** the only genuinely current, in-scope scholarships (FAJIM, UNILAG Erasmus+, Dangote Foundation) lived *only* in the separate, non-queryable `/api/nigeria-scholarships` snapshot -- never in the actual `scholarships` table `/api/scholarships` reads from. Shipping the "default to open/upcoming" decision as planned would have shown **zero results** on day one. Fixed by replacing scholarship-service's old single-record `seedKnownCurrentSessionRecord()` with `seedNigeriaScholarshipsSnapshot()` (`src/seed.js`), which upserts all 8 snapshot records into the real table on every boot, using the same `verified_at`-guard pattern the crawler already uses so an admin's own edit always wins over a reseed. This is the kind of gap that only shows up by actually running the thing, not by reading the code -- worth remembering for future stages too.

**scholarship-service**: `funding_type` column (migrated via `PRAGMA table_info` check + `ALTER TABLE`, since the live `scholarships.sqlite` predates this field), `fundingType`/`sourceType` query filters, `status` now accepts a comma-separated list (`status=open,upcoming`) so the public directory can request its default scope in one call instead of merging two paginated requests client-side.

**my-school-placement-api**: `SavedScholarship` model (`student` ref + `scholarshipId` string + a title/deadline/applicationUrl snapshot, so a saved-list page still shows something useful if the source record is later edited or deleted), `POST`/`DELETE /v1/scholarships/:id/save`, `GET /v1/scholarships/saved` -- `authenticate`+`requireStudent` only, deliberately no `requireActive` per the Stage 6 decision. `fundingType`/`sourceType` passthrough on the public list endpoint; `status` validator now accepts the same comma-separated list.

**Web** (`my-school-placement-admin-repo`): `Scholarships.jsx` (public, `Universities.jsx`'s exact debounced-search/infinite-scroll/card-grid pattern, 5 filters incl. an "Open opportunities only / Show all" toggle for the Stage 6 decision), `ScholarshipDetail.jsx` (`UniversityDetail.jsx`'s 3-column layout, **verbatim** §6.2 disclaimer text), `MySavedScholarships.jsx` (student sidebar). Nav links added to `PublicNavbar.jsx` and `StudentLayout.jsx`.

**Mobile** (`my-school-placement-mobile`): `ScholarshipsScreen.tsx`, `ScholarshipDetailScreen.tsx`, `SavedScholarshipsScreen.tsx` -- same structural patterns as `UniversitiesScreen.tsx`/`UniversityDetailScreen.tsx`, same design-system tokens. One new icon added to `Icon.tsx` (`bookmark`) -- not sourced from the original mockup artifact (scholarships are outside its scope), hand-drawn to match the existing set's stroke/viewBox convention rather than deviating from it. Dashboard quick-action tile + Profile link added as entry points (no new bottom tab -- would have crowded an already-5-item tab bar, a bigger design call than this stage needed to make).

### Tests / checks performed
- scholarship-service: curl-verified `fundingType`/`sourceType`/comma-separated `status` filters against a disposable test record (created and deleted within the test, not a real one this time).
- Backend save/unsave: curl round-trip with a JWT minted for a real existing student user -- save, duplicate-save (409), list, unsave, double-unsave (404), all correct.
- Full stack, both platforms, via Playwright (same cached-Chromium setup as Stage 5, see [[sandbox_playwright_available]]): web -- public list shows exactly the 3 real open/upcoming records, detail page disclaimer text matches §6.2 verbatim, save toggles and appears on the saved-list page, zero console errors; mobile -- Expo web preview (port 8099), JWT + `localStorage` injection (now including `msp_onboarding_complete`, a gate the Stage 5 verification didn't need to clear), Dashboard tile navigates to the list screen, screens render correctly against the design system, zero console errors.
- `eslint --quiet` (web) and `tsc --noEmit` (mobile) both clean.

### Known issues / follow-ups
- The 96-record crawler backlog (still `unconfirmed`/`review_required`) is unaffected by this stage -- it stays hidden from the default public view by design, but someone still needs to actually review it.
- Saved-list UI doesn't yet special-case a 404 from a deleted source record (shows the stale snapshot with a generic "may have been updated" note) -- acceptable for this vertical slice, not polished.
- SEO (Stage 9) not addressed for these new pages, consistent with every other public page in this repo.

### Commit reference
Not yet committed in any of the four repos touched this stage (`scholarship-service`, `my-school-placement-api`, `my-school-placement-admin-repo`, `my-school-placement-mobile`) as of 2026-10-11 -- per standing instruction, commits happen only when explicitly asked.
