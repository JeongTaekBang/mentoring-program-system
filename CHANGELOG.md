# Changelog — Mentoring Program System

## 2025-09-07 — Data access optimisation & shared UI helpers

### Backend
- Added sheet-level caching utilities in `DataManager.gs` (`getSpreadsheet_`, `getProgramData_`, `getApplicationData_`, etc.) so program/application data is read once per request and reused across lookups.
- Tightened submission/cancellation paths: reuse cached rows for validation, guard `LockService.tryLock` failures with user-facing errors, and invalidate `신청현황`/`신청결과요약` caches immediately after mutations.
- `updateSummarySheet_DM` now builds summary rows in memory and writes them in bulk, avoiding row-by-row appends while keeping caches coherent.

### Frontend
- Introduced a shared `common.html` include exporting the `CommonUI` namespace (escape helper + period status utilities) and wired it into `index.html`, `status.html`, `mentor.html`, `admin.html` to remove duplicated scripts.
- `status.html`’s 취소 안내문과 기타 기간 알림이 `resolvePeriodStatus` 기반으로 실시간 신청 기간에 맞춰 자동 갱신되도록 정리.

### Files Changed
- `DataManager.gs`: caching/normalisation helpers, consolidated submit/cancel validation, cached 시간 충돌 검사, batch summary write, explicit cache invalidations.
- `index.html`, `status.html`, `mentor.html`, `admin.html`: consume `CommonUI`, update 기간 상태 처리, drop inline `escapeHtml` copies.
- `common.html`: **new** shared helper include (Apps Script 프로젝트에도 동일한 파일을 생성해야 함).

## 2025-09-06 — Option C hardening + UX refresh

### Security
- Admin PIN for privileged actions
  - New server-side validators: `getAdminDashboardDataWithPin`, `syncFormsToProgramsWithPin`, `updateSummarySheetWithPin`, `prepareExcelDataWithPin`
  - Client: `admin.html` adds PIN form, optional 12h remember (local-only), logout
- Reduce clickjacking risk
  - `doGet` allows iframe only for `apply` and `status` pages
- Secrets handling
  - Prefer Script Properties over hardcoded constants: `SPREADSHEET_ID`
- XSS hardening
  - Escaped dynamic content across `index.html`, `mentor.html`, `status.html`, `admin.html`

### Concurrency & Integrity
- Prevent over-capacity via lock and strict checks
  - `submitApplication` and `cancelApplication` guarded by `LockService`
  - Application ID now `Utilities.getUuid()`
- Data consistency
  - `getApplicationCount` counts only rows with status `신청완료`
  - Avoid function name collisions: internal admin functions in `DataManager.gs` renamed to `*_DM`

### Performance
- Server-side caching (120s)
  - `getPrograms()` → key `programs_list`
  - `getAdminDashboardData()` → key `admin_dashboard`
  - Cache invalidated on submit/cancel/sync
- N+1 removal in program listing
  - Applications scanned once and aggregated by program ID
- Optional cold-start mitigation
  - Warmup helpers: `warmup`, `setupWarmupTrigger`, `removeWarmupTriggers`

### UX — Apply (index.html)
- Filtering & grouping
- Status filter (전체/신청가능/마감/개설/미개설)
  - Group by 날짜(기본), 멘토
  - Sort by 시간순(기본), 잔여좌석 많은순
  - Quick filters: 전체/오늘 이후/이번 주/마감 임박
- Cards
  - Clean, consistent layout with `card-body` and `card-footer`
  - Description shows 4 lines (line-clamp) for uniform cards
  - "더보기" opens modal with full details (no layout shift)
  - Ensure groups take full width so cards always start from the left
- Removed the compare feature for simplicity

### Admin
- `admin.html`
  - PIN gate with optional 12h remember, logout, errors surfaced
  - Uses PIN-protected endpoints
- `Admin.gs`
  - Adds PIN validation and *WithPin wrappers
  - Caches dashboard results; summary sheet update uses Script Properties ID

### Styling
- `.program-grid` maintains neat rows; `details.group` spans full width
- `.program-card` uses flex column with `overflow:hidden` to prevent bleed
- Modal overlay raised `z-index` to avoid stacking conflicts
- Removed legacy modal CSS that caused overlay-only bug

---

## Files Changed
- `Code.gs`
  - Add: `getSpreadsheetId`, `clearCaches`, warmup helpers
  - Update: `doGet` (limit ALLOWALL), `syncFormsToPrograms` (invalidate cache)
- `DataManager.gs`
  - Optimize `getPrograms` (cache + aggregate counts); handle string dates
  - Locking + UUID in `submitApplication`/`cancelApplication`
  - Status-filtered `getApplicationCount`
  - Rename internal admin helpers to `getAdminDashboardData_DM`, `updateSummarySheet_DM`
- `Admin.gs`
  - Add PIN validation and `*WithPin` endpoints; cache dashboard; Script Properties for IDs
- `index.html`
  - Grouping/filters/sorting; sanitized rendering
  - Card layout with clamp + modal; removed compare feature
  - Modal HTML + show/close handlers
- `admin.html`
  - PIN login UI + remember (12h) + logout; call *WithPin endpoints; escape content
- `mentor.html`, `status.html`
  - Escape dynamic content; safe tel/mailto
- `styles.html`
  - Card/grid refinements; line clamp; modal styling; remove conflicting legacy CSS

---

## Setup & Ops Notes
- Script Properties (Apps Script → Project Settings → Script properties)
  - `SPREADSHEET_ID` = your Google Sheet ID (optional; falls back to constant)
  - `ADMIN_PIN` = PIN for admin actions (default `0000` if absent)
- Optional: warmup trigger
  - Run `setupWarmupTrigger()` once to reduce cold-start latency
- Cache TTL
  - Default 120s. Adjust in `DataManager.gs` / `Admin.gs` (`cache.put(..., 120)`).

---

## Known Behaviors / Tweaks
- Card description clamp = 4 lines (editable via `.clamp-4`)
- Modal width = 720px max; adjust in `.modal`
- Only `apply` and `status` are iframe-embeddable by default; adjust in `doGet` if needed

---

## Rollback Hints
- Disable PIN: call non-*WithPin endpoints in `admin.html` and remove validator calls
- Disable caching: bypass cache get/put and `clearCaches()`
- Restore full descriptions inline: remove `.clamp-4` and modal usage in `index.html`
