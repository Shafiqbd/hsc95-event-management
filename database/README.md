# Database — HSC 95 Society Event Management

`../db.txt` is the authoritative specification. The application calls PostgreSQL
**functions only** — it never runs `SELECT/INSERT/UPDATE/DELETE` against tables.
Every SQL statement the backend can issue is listed in
[`backend/src/database/db-functions.ts`](../backend/src/database/db-functions.ts).

## Files

| File | Applied by | Purpose |
|---|---|---|
| `setup/000_prerequisites.sql` | you, **fresh DB only** | `pgcrypto`, schema `hsc95`, and the 3 sequences `db.txt` references but never creates. No-op on an existing DB. |
| `../db.txt` | you | Supplied tables + functions (unchanged). |
| `migrations/001_app_support_functions.sql` | you, **required** | 9 **new, additive** functions. Does not alter tables or replace any `db.txt` function. Safe to re-run. |
| `proposed/002_fix_existing_functions.sql` | you, **after review** | Fixes 3 bugs in `db.txt` functions. **FIX A is required for login to work.** |
| `proposed/003_recommended_extensions.sql` | optional | Unique indexes, payment / gender columns, pass-code generator. Not used by the code yet. |
| `setup/900_dev_seed.sql` | local dev only | Assumed `T_UserType` rows (1 Admin, 2 Member) + `admin` / `ChangeMe!2026`. |

### Required on the production database (checked 2026-10-17)

1. **pgcrypto** — `sp_insert_user` / `sp_user_login` call `crypt()` / `gen_salt()`, but the
   extension is not installed and the `hsc95db` login may not install it. A superuser or the
   database owner must run, once:
   ```sql
   CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA public;
   -- or let hsc95db do it:  GRANT CREATE ON DATABASE postgres TO hsc95db;
   ```
   It must go in `public`: the functions call `crypt()` unqualified and the search path is
   `"$user", public`.
2. **FIX A** from `proposed/002_fix_existing_functions.sql` (`sp_user_login` return type).
3. **`migrations/001_app_support_functions.sql`.**
4. **First admin:** `cd backend && npm run build && npm run create-user -- --name "…" --login admin --email … --role admin`
   (asks for the password; calls `sp_insert_user`).

### Install order

```bash
psql "$DB" -v ON_ERROR_STOP=1 -f database/setup/000_prerequisites.sql   # fresh DB only
psql "$DB" -v ON_ERROR_STOP=1 -f db.txt                                 # fresh DB only
psql "$DB" -v ON_ERROR_STOP=1 -f database/migrations/001_app_support_functions.sql
psql "$DB" -v ON_ERROR_STOP=1 -f database/proposed/002_fix_existing_functions.sql   # after review
psql "$DB" -v ON_ERROR_STOP=1 -f database/setup/900_dev_seed.sql        # local dev only
```

All of these were executed against PostgreSQL 16 during development (see the
verification notes in the main README).

## Function usage

| Function | Source | Used for |
|---|---|---|
| `sp_user_login` | db.txt | Credential check for both login pages |
| `sp_insert_user` | db.txt | Creating staff users (Admin → Users page, `npm run create-user`) |
| `sp_insert_event_form` | db.txt | Saving the registration |
| `sp_insert_event_form_photo` | db.txt | Saving the photo path (deactivates older photos) |
| `sp_prepare_entrypass` | db.txt | **Print All Tokens** |
| `sp_get_user_list` | db.txt | Admin → Users |
| `sp_prepare_sms`, `sp_SendToken_sms` | db.txt | Not used (no SMS gateway in scope; both are broken — see below) |
| `sp_get_session_user` | 001 | `UserStatus` / role check at login and on **every** authenticated request |
| `sp_check_registration_duplicate` | 001 | Duplicate mobile / form number check (under advisory lock) |
| `sp_check_login_exists` | 001 | Unique login name when creating users (under advisory lock) |
| `sp_get_next_form_no` | 001 | Next form number when the paper form number is left empty |
| `sp_get_registration_list` | 001 | Registration list, search, pagination, token selection |
| `sp_get_registration_by_id` | 001 | Admin detail view |
| `sp_get_entrypass_by_ids` | 001 | Printing **selected** tokens |
| `sp_get_dashboard_stats`, `sp_get_tshirt_summary` | 001 | Admin dashboard figures |

### Per-user scope (Register users)

`sp_get_registration_list`, `sp_get_registration_by_id`, `sp_get_entrypass_by_ids`,
`sp_get_dashboard_stats` and `sp_get_tshirt_summary` take a trailing `p_entryby integer`
(default `NULL`). When it is set, only forms whose `T_EventForm."EntryBy"` equals it are returned;
`NULL` returns everything. The API passes the signed-in user's id for Register users and `NULL`
for Admin / Report Viewer. For a Register user's "print all", `sp_get_entrypass_by_ids(NULL, <id>)`
is used; others use the supplied `sp_prepare_entrypass()`.

## Bugs found in `db.txt` (verified on PostgreSQL 16)

1. **`sp_user_login` cannot run (blocking).** It declares `"ContactNumber" numeric(11,0)` but
   returns `T_Users."ContactNumber"` (`varchar(11)`). Every call — even with a wrong
   password — fails with *"structure of query does not match function result type"*.
   **Nobody can log in until FIX A in `proposed/002` is applied.** The fix keeps the
   name, parameters and return signature. Until then the API answers login with a
   generic 503 and logs the hint.
2. **`sp_prepare_sms` / `sp_SendToken_sms` fail** with *column reference "MobileNo" is
   ambiguous* (output column vs. unqualified table column).
3. **`sp_SendToken_sms` never inserts the pass code:** `"||"PassCode"||"` is inside the
   string literal. The unquoted name is stored as `sp_sendtoken_sms`.
4. `sp_user_login` does **not** check `UserStatus`; the app enforces it via `sp_get_session_user`.
5. `db.txt` uses sequences it never creates and needs the `pgcrypto` extension (handled by `000`).
6. `sp_insert_event_form_photo` generates `PhotoId` with `MAX()+1` — two concurrent
   inserts can collide on the primary key. Self-registration is serialised by the
   registration advisory lock, so the app does not hit this, but other writers could.

## Database Gap Analysis

| Missing operation | Why existing functions are insufficient | Minimal addition | Parameters → returns | Security / consistency |
|---|---|---|---|---|
| Enforce `UserStatus`, re-validate sessions | `sp_user_login` returns no status; no lookup by id | `sp_get_session_user` *(001)* | `(p_userid int)` → user + `UserTypeName` + `UserStatus` | Called per request so deactivation applies immediately |
| List / search / page registrations | `sp_prepare_entrypass` has 4 columns, only rows with photos, no paging | `sp_get_registration_list` *(001)* | `(p_search text, p_limit int, p_offset int)` → rows + `TotalCount` | `strpos` matching (no LIKE-wildcard injection); limit clamped to 500 |
| Registration by id | none | `sp_get_registration_by_id` *(001)* | `(p_entryid int)` → registration | Admin-only endpoint |
| Print selected tokens | `sp_prepare_entrypass` has no filter and no `EntryId` | `sp_get_entrypass_by_ids` *(001)* | `(p_entryids int[])` → `EntryId, MemberName, FormNo, MobileNo, PhotoPath` | Same eligibility rule as `sp_prepare_entrypass` |
| Generate unique form numbers | `FormNo` is nullable, no sequence/generator | `sp_get_next_form_no` *(001)* | `()` → `numeric(5,0)` = `MAX+1` | Transaction-scoped advisory lock; recommend unique index (003) |
| Duplicate prevention | No unique constraint on `MobileNo` / `FormNo` / `LoginName` | `sp_check_registration_duplicate`, `sp_check_login_exists` *(001)* | `(p_mobileno, p_formno)` → 2 booleans; `(p_loginname)` → boolean | Advisory locks → race-free check-then-insert |
| Dashboard statistics | none | `sp_get_dashboard_stats`, `sp_get_tshirt_summary` *(001)* | `()` → counts / sums | Read-only aggregates |
| **Payment method / reference / verification** | Only `AmountPaid` exists | columns + `sp_verify_payment` *(003, proposed)* | `(p_entryid, p_verifiedby)` → boolean | Admin-only; audit row in `T_Events`. **Not implemented** — app shows all payments as *unverified* |
| **Gender (লিঙ্গ)** | No column | `Gender char(1)` *(003, proposed)* | — | **Not collected** until the column exists |
| **Pass code generation** | `PassCode` varchar(8) exists but nothing generates it | `sp_assign_missing_passcodes` *(003, proposed)* | `()` → count assigned | Unique random 6 digits under advisory lock. **Not implemented** — shown as "not issued yet" |
| **Update registration / change status / lock** | No update functions; `MemberLock` / `MemberStatus` can't be changed | e.g. `sp_update_event_form(p_entryid, …, p_updatedby)` and `sp_set_member_status(p_entryid, p_status, p_updatedby)` | → boolean | Must refuse updates when `MemberLock='Y'` for members; log to `T_Events`. **Not implemented** — members and admins have read-only views |

### Assumptions to confirm with the database owner

- **Roles** come from `T_UserType`: 1 Admin (everything), 2 Register (enters members),
  3 Report Viewer (read-only). Configured by `*_USER_TYPE_NAMES` / `*_USER_TYPE_ID` in `backend/.env`.
  Unmapped types cannot log in. Members themselves have no login.
- `UserStatus = 1` and `MemberStatus = 1` mean active (matching the column defaults).
- `EntryBy` is the Register/Admin user who entered the form (taken from the session).
- The paper form's e-mail and gender lines have no column in `T_EventForm` and are not collected.
- Online form numbers are `MAX(FormNo)+1`. If pre-printed paper forms use a reserved range,
  change `sp_get_next_form_no` to start above it.
- The printed token shows **`FormNo`** (what `sp_prepare_entrypass` returns). `PassCode` is the
  separate "token number" meant for SMS and is shown on the member dashboard when issued.
