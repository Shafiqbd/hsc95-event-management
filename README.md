# HSC 95 Society — 30 Years Celebration · Event Management

Bengali event website with a staff panel (Admin / Register / Report Viewer) for entering members' registrations and
printable entry passes (tokens) for **এইচএসসি '৯৫ সোসাইটি — ৩০ বছর পূর্তি উৎসব**
(TSC, University of Dhaka · 30 October 2026).

```
frontend/   Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · RHF + Zod · Lucide
backend/    NestJS 12 · TypeScript · pg (node-postgres) · class-validator · JWT in HttpOnly cookie
database/   install order, additive functions, proposed fixes, gap analysis
db.txt      supplied PostgreSQL specification (unchanged)
```

> ⚠️ **Read [database/README.md](database/README.md) first.** The app needs pgcrypto and the
> additive functions in `database/migrations/001_app_support_functions.sql`. The supplied
> `hsc95.sp_user_login` fails on every call (a return-type bug), so the app logs in with
> `sp_staff_login` from 001 instead.

## Quick start — frontend only (demo mode, no database or API needed)

```bash
cd frontend
cp .env.example .env.local     # NEXT_PUBLIC_API_MODE=mock
npm install
npm run dev                    # http://localhost:3000
```

All staff sign in at `/backend/login` (the login page has one-click demo buttons):

| Role | Login name | Password | Can do |
|---|---|---|---|
| Admin | `admin` | `admin123` | Everything, including creating users |
| Register | `desk` | `desk123` | Enter members' paper forms; sees **only the members they registered** (list, dashboard, tokens) |
| Report Viewer | `viewer` | `viewer123` | Read-only lists, statistics, token PDFs |

In demo mode:
- 12 static registrations are preloaded (`frontend/src/lib/mock-data.ts`).
- New registrations, logins and photos are stored in the browser's localStorage.
- **Download PDF** (print preview, registration detail, after saving a registration) creates a
  real A4 PDF file in the browser.
- **Reset demo data** in the admin sidebar restores the original data.

**Connecting the real API later:** set `NEXT_PUBLIC_API_MODE=live` in `frontend/.env.local`,
run the backend, and restart `npm run dev` (or rebuild). Nothing else changes; the screens use
the same API interface (`frontend/src/lib/api.ts`).

## Architecture

```
Browser ──► Next.js (:3000)  ── /api/* rewrite ──►  NestJS (:4000/api)  ──►  PostgreSQL (hsc95.sp_* functions only)
            pages, theme, print                     auth, validation,        
                                                    photos on local disk
```

- The browser only ever calls same-origin `/api`. Next.js forwards it to NestJS, so the session
  cookie is first-party (HttpOnly, SameSite=Lax, Secure in production) and no backend URL or
  secret is exposed through `NEXT_PUBLIC_` variables.
- **Database access is function-only.** Every SQL statement is a parameterised
  `SELECT … FROM hsc95.sp_…($1, …)` listed in `backend/src/database/db-functions.ts`. A unit
  test asserts that no statement touches a table directly.
- Registration runs in **one transaction**: form number (advisory lock) → duplicate check →
  `sp_insert_user` → `sp_insert_event_form` → `sp_insert_event_form_photo`. On any failure
  everything rolls back and the saved photo file is deleted.
- Authorisation is enforced in NestJS. Each authenticated request re-reads the user via
  `sp_get_session_user`, so `UserStatus` and role changes take effect immediately. The JWT
  carries only the user id; role and identity are never taken from the client.

## Prerequisites

- Node.js 20.19+ (developed and tested on Node 24)
- PostgreSQL 13+ with the `pgcrypto` extension (tested on PostgreSQL 16)

## Installation

```bash
# 1. Database (see database/README.md for details)
psql "$DB" -v ON_ERROR_STOP=1 -f database/setup/000_prerequisites.sql      # fresh DB only
psql "$DB" -v ON_ERROR_STOP=1 -f db.txt                                    # fresh DB only
psql "$DB" -v ON_ERROR_STOP=1 -f database/migrations/001_app_support_functions.sql
psql "$DB" -v ON_ERROR_STOP=1 -f database/proposed/002_fix_existing_functions.sql   # after review
psql "$DB" -v ON_ERROR_STOP=1 -f database/setup/900_dev_seed.sql           # local dev only

# 2. Backend
cd backend
cp .env.example .env        # fill in DB_* and AUTH_SECRET; check the user-type mapping
npm install
npm run start:dev           # http://localhost:4000/api

# 3. Frontend (second terminal)
cd frontend
cp .env.example .env.local
npm install
npm run dev                 # http://localhost:3000
```

The dev seed creates the admin `admin` / `ChangeMe!2026`. **Change it before using it anywhere
except your own machine.**

## Environment

**backend/.env** (see `.env.example` for all options)

| Variable | Notes |
|---|---|
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_SCHEMA`, `DB_SSL` | `DB_SCHEMA` defaults to `hsc95` |
| `AUTH_SECRET` | ≥ 32 random chars. `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"` |
| `SESSION_TTL_HOURS` | Session/JWT lifetime (default 8) |
| `COOKIE_SECURE`, `COOKIE_SAMESITE` | Defaults: Secure in production, `lax` |
| `ADMIN_/REGISTER_/VIEWER_USER_TYPE_NAMES`, `…_ID` | Map `T_UserType` rows (1 Admin, 2 Register, 3 Report Viewer) to roles |
| `UPLOAD_DIR`, `PHOTO_MAX_BYTES` | Photo storage folder (outside the source tree) and size limit (2 MB) |
| `EVENT_REGISTRATION_FEE`, `EVENT_DRIVER_FEE` | **Authoritative** fees; the stored `AmountPaid` = fee + (driver ? driver fee : 0) |

**frontend/.env.local**

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Keep `/api` |
| `API_PROXY_TARGET` | Server-only URL of the NestJS API, read when `next dev` / `next build` starts |
| `SESSION_COOKIE_NAME` | Same as the backend; only used for login redirects |
| `SITE_URL` | Public URL (Open Graph) |

Event text (name, venue, date, welcome message, confirmed facilities) lives in
`frontend/src/config/event.ts`. When fees change, update the backend env **and** `displayFees` in
that file. The registration form always shows the backend's fees.

## Routes

| Route | Who | |
|---|---|---|
| `/` | public | Landing page: hero, event info, facilities, how to register |
| `/backend/login` | staff | One login for Admin, Register and Report Viewer |
| `/backend/dashboard` | all staff | Statistics |
| `/backend/registrations/new` | Admin, Register | Enter a member's paper form (form no., photo, T-shirt, driver); token preview, print and PDF after saving |
| `/backend/registrations` | all staff | Search (name / mobile / form no.), pagination, detail panel |
| `/backend/tokens` | all staff | Select tokens across pages, preview, **Print All Tokens**, Download PDF |
| `/backend/users` | Admin | Create users (`sp_insert_user`) and list them |

Members have no login; old `/user/*` links redirect to the staff login.

API (`/api` prefix): `GET event` · `POST auth/login` · `POST auth/logout` · `GET auth/me` ·
`POST registrations` (multipart; Admin/Register) · `GET admin/stats` ·
`GET admin/registrations?search&page&pageSize` · `GET admin/registrations/:id` ·
`GET admin/tokens/print-data[?ids=1,2]` · `GET admin/photos/:file` ·
`GET admin/users` / `POST admin/users` (Admin). Every response has the shape `{ data }` or
`{ error: { statusCode, message, details? } }`. State-changing requests must send
`X-Requested-With` (CSRF guard).

## Authentication and roles

- Roles come from `hsc95."T_UserType"`: **Admin** (1), **Register** (2), **Report Viewer** (3),
  mapped in `backend/.env` (`*_USER_TYPE_NAMES`, `*_USER_TYPE_ID`). The role is re-read from the
  database on every request and enforced by the API, not just hidden in the UI.
- A registration's `EntryBy` is always the signed-in Register/Admin user.
- **Register users only see their own entries** (`EntryBy` = their UserId) in the list, detail,
  dashboard figures and token printing. The database functions apply the filter, and a form
  outside their scope answers 404. Admin and Report Viewer see everything.
- The first Admin is created on the server with `npm run create-user` (see database/README.md).
  After that, admins create users on the Users page.
- Login is rate-limited (10/min per IP).
- Logout clears the cookie. Sessions are stateless JWTs (8 h); setting `UserStatus ≠ 1`
  revokes access immediately.

## Photos

- Accepts JPEG, PNG or WebP up to 2 MB. The **actual bytes** are checked, and the declared type
  must match them.
- Files are named after the token, like the SMS: `UPLOAD_DIR/photos/95-0043.<ext>` (saved inside the
  registration transaction once the token number is known). Only that key goes into
  `T_Photos.PhotoPath`. Photos saved earlier keep their `<uuid>.<ext>` names.
- Photos are never served statically. Members get their own photo from `/api/registrations/me/photo`;
  admins use `/api/admin/photos/95-0043.<ext>` (validated name, so no path traversal).
- Existing `PhotoPath` values that are `http(s)` URLs are shown as-is; any other value is treated
  as "no photo".
- `PhotoStorageService` is the single storage class. To move to object storage, replace it with
  an implementation that has the same methods.
- Back up `UPLOAD_DIR` together with the database.

## Token printing

- **Paper = token: 391 × 399 px** (103.5 × 105.6 mm), **one token per sheet**, no margins and
  nothing to cut. Load paper of that size in the printer. Browser print uses
  `@page { size: 391px 399px; margin: 0 }`; **Download PDF** (`token-pdf.ts`) produces the same
  page size, one token per page.
- Background: `frontend/public/images/token-background.jpg`, the supplied 294 × 366 px artwork,
  stretched to 391 × 399. The photo is cover-fitted into the photo box (never distorted).
- `EntryPass` (`frontend/src/features/token/entry-pass.tsx`) shows, top to bottom: token no.,
  name, mobile, T-shirt size and a green **With Driver** badge when a driver is
  included (`tokenDetails()`, shared with the PDF). Positions are percentages of the artwork's
  boxes and text is in container units, so preview, print and PDF match.
- **Print All Tokens** fetches the complete set (not just the visible page) and "Preview & print
  selected" fetches the chosen ones, both from `sp_get_entrypass_by_ids`. The preview shows one
  token at a time (Previous / Next or ← / →) with **Print this token**, **Print all** (one print
  dialog, one sheet per token) and **Download PDF**.
- Printing waits for the background, every photo and the web font before opening the dialog. In
  print media everything else is hidden.
- A token is *ready* when the registration is active and has a form (token) number. The photo is
  optional; a token without one prints with an empty photo box.
- The supplied background is low resolution (294 × 366 px), so it prints at about 72–90 dpi at
  this size. A higher-resolution export of the same artwork will print sharper.

## Commands

| | backend | frontend |
|---|---|---|
| Dev | `npm run start:dev` | `npm run dev` |
| Type-check | `npx tsc --noEmit` | `npm run typecheck` |
| Lint | `npm run lint` (oxlint) | `npm run lint` (ESLint) |
| Tests | `npm test` (Vitest) | `npm test` (Vitest + Testing Library) |
| Production | `npm run build && npm run start:prod` | `npm run build && npm start` |

In production, put both apps behind one domain (or keep the Next.js `/api` rewrite) and serve
over HTTPS.

## Verification performed

- Backend: `tsc` ✔, `oxlint` ✔, `nest build` ✔, **39/39 tests** ✔. The tests cover:
  - staff login and role mapping (Admin / Register / Report Viewer), invalid credentials,
    inactive and unmapped users
  - role permissions per endpoint, CSRF, forged sessions
  - registration entry with `EntryBy` = session user, paper and generated form numbers,
    duplicate mobile / form number, rollback and photo cleanup
  - creating users (Admin only, unique login, type id), DTO and photo validation, path traversal,
    missing-function handling, and a function-only SQL check
- Frontend: `tsc` ✔, ESLint ✔, `next build` ✔, **26 tests** ✔ (schema, login form, theme,
  role-based navigation and page gates, tables, token and print layout, demo API).
- Headless Chrome in demo mode:
  - a Register user entered a member with a paper form number, saw the token and downloaded its PDF
  - a duplicate form number was blocked
  - Register and Report Viewer only see their pages
  - Admin created a user who could then log in
  - no browser errors
- Real database (2026-10-17, read-only checks): `sp_insert_user` and `sp_user_login` fail because
  **pgcrypto is not installed** (see database/README.md). Nothing has been written to it.

## Manual test checklist

- [ ] Home page in dark and light mode, desktop and mobile; the theme survives a reload
- [ ] Admin creates a Register and a Report Viewer user on the Users page; both can log in
- [ ] Register: enter a member with a paper form number, with and without a driver: ৳১,৫০০ / ৳২,০০০; the success screen shows the token
- [ ] Leaving the form number empty assigns the next number
- [ ] Same mobile number or same form number again → clear error, nothing saved
- [ ] Invalid inputs (short mobile, wrong photo type, photo over 2 MB) show field errors; double-clicking submit saves once
- [ ] Report Viewer cannot open New Registration or Users (UI and API)
- [ ] Search by name, mobile and form number; pagination; detail panel
- [ ] Tokens: select across pages → preview → print shows only tokens, 6 per A4 page
- [ ] Print All Tokens / Download PDF include every eligible member
- [ ] Setting a user's `UserStatus` to 0 signs them out on their next request

## Known limitations

See the gap analysis in [database/README.md](database/README.md):
- Payments can't be verified: there is no column for it, so every payment shows as *unverified*.
- Gender is not collected (no column).
- Pass codes are not generated.
- Registrations can't be edited and status can't be changed (no update functions).
- No SMS sending; the supplied SMS functions are broken.
