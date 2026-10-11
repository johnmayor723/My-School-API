# Architecture Reference — Scholarship Feature

Companion to `SCHOLARSHIP_IMPLEMENTATION_PLAN.md`. Scoped to what the scholarship feature needs to know about the existing platform — not a full platform architecture doc. Update this as later stages make real decisions.

## 1. The three repos

| Repo | Stack | Notes |
|---|---|---|
| `my-school-placement-api` | Express + Mongoose/MongoDB (`mongodb://127.0.0.1:27119/my_school_placement`) | REST API, `/api/v1` base path |
| `my-school-placement-admin-repo` | Vite + React 18 + react-router 6, shadcn-style components, Tailwind | Serves **both** students and staff/admin through one app, gated by role. Client-rendered SPA only — no SSR/SSG, confirmed via `vite.config.js` (no SSR plugin) |
| `my-school-placement-mobile` | Expo / React Native | Student-only, no staff concept |

Confirmed (grep across all three, zero matches): no WordPress, no Next.js, no other CMS, no `next.config.*` anywhere.

## 2. Auth, RBAC, and the parental-consent gate

- JWT access + refresh tokens. Students: OTP-only (email or phone) via `/auth/otp/request` → `/auth/otp/verify` → `/auth/register/complete`. Staff: password via `/auth/login`.
- `src/middleware/auth.js`: `authenticate` (verifies JWT, blocks only `SUSPENDED`/`DELETED` users), `requireStudent`/`requireStaff` (userType check), `requireActive` (blocks `INACTIVE` — i.e. under-18 accounts pending parental consent — from feature routes: assessments, chat, payments, compare).
- `src/middleware/permit.js`: `permit(...permissions)` — staff-only, checks `req.user.hasPermission(permission)` against the user's `Role.permissions` array (or the `"*"` wildcard held by `SUPER_ADMIN`).
- Permissions are plain strings in `PERMISSIONS` (`src/config/constants.js`), assigned to roles in `scripts/seed/run.js`'s `SYSTEM_ROLES` array (idempotent upsert — safe to re-run after adding a new permission to an existing role).
- **Relevant precedent**: `ROLE_NAMES.CATALOG_MANAGER` already holds `MANAGE_INSTITUTIONS`/`MANAGE_PROGRAMMES`/`MANAGE_ADMISSION_SESSIONS`/`MANAGE_CUTOFF_SOURCES` — a new `MANAGE_SCHOLARSHIPS` permission would naturally join this role (decide in Stage 3).
- See `[[my_school_placement_parental_consent_gate]]` memory for full detail on the consent gate — any scholarship "save"/bookmark action should likely be gated the same way as assessments (open question, Stage 3).

## 3. Existing "ingest → verify → publish" prior art

### 3a. Cut-Off Marks Intelligence (`CutoffSource` / `CutoffCandidate` / `CutoffRecord`) — incomplete, do not copy wholesale

Models (`src/models/CutoffSource.js`, `CutoffCandidate.js`, `CutoffRecord.js`):

- `CutoffSource`: a scraper registry (`scraperKey`, `baseUrl`, `rateLimitMs`, `lastRunAt`/`lastRunStatus`).
- `CutoffCandidate`: a staging document — raw unresolved text fields alongside resolved ObjectId refs, a `confidence` enum (`HIGH`/`MEDIUM`/`LOW`), a `status` enum (`PENDING`/`APPROVED`/`REJECTED`/`DUPLICATE`), an embedded `source` sub-document, a `dedupeKey`, and a `promotedRecord` ref.
- `CutoffRecord`: the published fact — embedded `source` and `verification` sub-documents, `isCurrent`/`supersedes` for history, `promotedFromCandidate`.

**What's real**: the regex-based extraction (`src/scrapers/jambCutoffExtractor.js`) and the CLI scrape script (`scripts/cutoffs/jamb-cutoff-scrape.js`) both contain genuine working logic, not stubs.

**What's broken**: `cutoffCandidate` has no admin controller or routes at all (no way to review/approve/reject via HTTP). `cutoffSource`'s admin routes exist but are **never mounted** in `routes/v1/admin/index.js` — unreachable. The promotion step (`cutoffCandidate.service.js#approve` calls `cutoffRecordService.promoteCandidate`) targets a service file, `cutoffRecord.service.js`, **that does not exist** — this would throw at runtime if ever called. No real data was ever ingested (no cache directory, no completion marker file). `PROMOTABLE_CUTOFF_TYPES` is defined in constants but never actually enforced anywhere in code.

**Takeaway**: the staging/confidence/dedupe-key *shape* is reasonable to reference, but this is a scaffold that was never finished end-to-end — a warning against building wide before building deep.

### 3b. AdmissionRule verification/review — complete and working, the real template

`src/models/AdmissionRule.js`: embedded `source` (`{title, type, url, sourceDate}`, `RULE_SOURCE_TYPE` = `OFFICIAL_BROCHURE`/`UNIVERSITY_WEBSITE`/`JAMB_BROCHURE`/`PRESS_RELEASE`/`OTHER`) and `verification` (`{lastVerifiedAt, verifiedBy, notes}`) sub-schemas. `RULE_STATUS` = `DRAFT → REVIEW → APPROVED → PUBLISHED`, plus `ARCHIVED`.

`src/routes/v1/admin/admissionRule.routes.js`: one HTTP endpoint per transition (`submit-for-review`, `review`, `approve`, `publish`, `archive`), each gated by its own permission (`MANAGE_`/`REVIEW_`/`APPROVE_`/`PUBLISH_`/`ARCHIVE_ADMISSION_RULES`). Fully mounted, fully reachable.

Admin UI: `AdminRuleReviews.jsx` is a review-queue list (status filter, flat cards, each linking to detail); `AdminRuleDetail.jsx` has a `statusFlow` map driving which action buttons render per current status, a status-color badge, a dedicated "Source & verification" card, and a "Change history" card showing who created/reviewed/approved/published the record.

**This is the pattern Stage 3/5 should follow for scholarships** — not the cutoff scaffold.

## 4. Notifications

`src/services/notification.service.js` → `src/utils/mailer.js` (email: gemfi-mail-service → direct SMTP → logging fallback chain) and `src/utils/smsSender.js` (SMS: Termii). **No WhatsApp integration exists anywhere** (confirmed, zero grep matches) — the master prompt's WhatsApp-reminder suggestion is new work, not reuse, if pursued.

## 5. Scheduling

No job-queue library (`node-cron`/`bullmq`/`bull`/`agenda`) is installed. `src/server.js` has zero in-process scheduling code. The real OS crontab on this box has 6 entries, all deploy pipelines for other GemFi/AZSA projects — none for this project. This server's established convention for recurring work is **OS cron + a standalone Node script** (see every other project's `*-deploy.sh` cron entries, and the cutoff-intelligence scaffold's own abandoned `watch-and-resume.sh` cron-watchdog pattern) — recommended default for Stage 8, to confirm.

## 6. Ingestion source: your own API (not scraping)

You've confirmed scholarship data comes from an API you built for this purpose — scraping is explicitly ruled out. This removes:
- The need for a source-adapter-per-website architecture (`src/scrapers/` pattern).
- Per-source ToS/ legal risk assessment (master prompt §4.2's "approved source registry" of external sites).
- The need for an HTML-parsing library (none is installed; `axios` is the only HTTP client in `package.json`, no `cheerio`/`puppeteer`/`playwright`).

It does **not** automatically remove the need for an editorial review layer before publication — that depends entirely on what your API already verifies vs. what MACL staff still need to check (open question, see Stage 1 plan's "Unresolved decisions").

Security principle carried forward regardless of source: treat any free-text fields returned by the API (descriptions, eligibility text) as untrusted external input when storing/rendering — safe (non-HTML-executing) rendering on both web and mobile, even though the API itself is one you control.

## 7. Web SPA SEO reality

No `react-helmet`/meta-tag management, no sitemap, no `document.title` handling, no SSR anywhere in `my-school-placement-admin-repo`. A pure CSR SPA has real limits on search-engine crawlability that the master prompt's Stage 9 expectations (server-rendered pages, structured data, sitemap integration) assume away. Needs an explicit decision at Stage 9 — likely `react-helmet-async` for client-side meta tags as a pragmatic middle ground, with the SSR question (if truly required) surfaced as a larger, separate decision rather than folded silently into this feature.

## 8. UI conventions to match (web admin-repo)

- **Public finder** (`Universities.jsx`/`UniversityDetail.jsx`): debounced search input, `Select` dropdown filters, infinite-scroll (IntersectionObserver), results grouped by a dimension into card grids, detail page = 3-column info-card layout with a disclaimer box.
- **Admin CRUD** (`AdminUniversities.jsx`): one list page, modal `Dialog` form for create/edit (no separate routes), soft-delete via `ConfirmDialog`.
- **No existing save/bookmark/favorite UI anywhere** — confirmed via full repo grep. This is new UI, not a reuse.

## 9. Open questions carried into Stage 2

1. Your scholarship API's exact contract (see plan doc).
2. Whether ingested-but-unverified records need the full AdmissionRule-style review gate, or a lighter touch, depending on how much your API itself already verifies.
3. Whether "save" sits behind the `requireActive` parental-consent gate.
4. SEO/SSR approach (Stage 9).
5. Scheduling mechanism specifics (Stage 3/8).
