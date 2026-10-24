# HANDOVER — where we stopped and how to continue

_Last updated: 18 October 2026_

## 1. Where things stand

**Done and tested**
- **Frontend** (Next.js) works fully in **demo mode** without a database:
  - the public website
  - staff login with three roles
  - New Registration (paper-form entry)
  - the registration list and search
  - token printing and PDF download
  - the Users page
- **Roles** (from `hsc95."T_UserType"`):
  - **Admin (1):** everything, including creating users.
  - **Register (2):** enters members and sees **only the members they registered**.
  - **Report Viewer (3):** read-only.
- **Backend** (NestJS) is finished and tested (40/40 tests). It talks to PostgreSQL **only through
  `hsc95.sp_*` functions**.
- **Test results:** frontend 27/27 tests pass. Type checks, lint and builds are clean.

**Not done yet: blocked on the real database (72.60.208.13, db `postgres`, schema `hsc95`)**
- Nothing has been written to the real database. Checks were read-only or rolled back.
- **`pgcrypto` is not installed**, so the supplied `sp_insert_user` and `sp_user_login` fail with
  "function gen_salt/crypt does not exist".
- The `hsc95db` login is **not allowed** to install extensions (error 42501).
- The app's helper functions (`database/migrations/001_app_support_functions.sql`) are not
  installed yet.
- `sp_user_login` on the server still has the `ContactNumber numeric` bug, which makes every
  login fail.

## 2. ➜ START HERE next time (in this order)

1. **Install pgcrypto.** This must be done by the `postgres` superuser or the database owner,
   not `hsc95db`:
   ```sql
   CREATE EXTENSION IF NOT EXISTS pgcrypto SCHEMA public;
   ```
   If you can't log in as `postgres` yourself, ask the server or hosting admin to run it, or to run
   `GRANT CREATE ON DATABASE postgres TO hsc95db;` so you can run it.
   It must go in **`public`**, not `hsc95`.
2. **Apply the database files** as `hsc95db` (from the project folder):
   ```bash
   psql -h 72.60.208.13 -p 80 -U hsc95db -d postgres -v ON_ERROR_STOP=1 -f database/proposed/002_fix_existing_functions.sql
   psql -h 72.60.208.13 -p 80 -U hsc95db -d postgres -v ON_ERROR_STOP=1 -f database/migrations/001_app_support_functions.sql
   ```
   - `002` fixes `sp_user_login` (required) and the two SMS functions.
   - `001` only **adds** new functions; it does not change your tables.
   - You can also open both files in DBeaver and run them there.
3. **Create the first Admin.** It uses `sp_insert_user` and asks for the password without
   showing it:
   ```bash
   cd backend
   npm run build
   npm run create-user -- --name "Your Name" --login admin --email you@example.com --role admin
   ```
4. **Frontend → real API.** `frontend/.env` contains `NEXT_PUBLIC_API_URL=http://localhost:4000/api`
   (the browser calls the API directly, no proxy). Start both apps (section 4).
5. Log in at `/backend/login` as that admin, then create the **Register** and
   **Report Viewer** users on the **Users** page.

## 3. Setting up the new laptop

**Install**
- **Node.js 24** (20.19 or newer works).
- Optional: **PostgreSQL client tools** (`psql`) or DBeaver, for step 2 above.

**Copy the project folder** `hsc95-event-management/`. You can skip these (they are rebuilt
automatically):
- `frontend/node_modules`, `backend/node_modules`
- `frontend/.next`, `backend/dist`
- `backend/.test-storage`

**Copy the secret files carefully.** They are not in any repository:
- `backend/.env`: contains the **database password** and `AUTH_SECRET`. Copy it privately
  (USB or a password manager). Don't email it or upload it anywhere public. If it's lost, rebuild
  it from `backend/.env.example`.
- `frontend/.env`: no secrets, one line (`NEXT_PUBLIC_API_URL=...`); same as `frontend/.env.example`.

**Install packages**
```bash
cd backend  && npm install
cd ../frontend && npm install
```

## 4. Running

**Demo mode (no database needed).** Put `NEXT_PUBLIC_API_MODE=mock` in `frontend/.env`:
```bash
cd frontend
npm run dev          # open http://localhost:3000
```
Demo logins at `/backend/login` (there are one-click buttons):

| Role | Login name | Password |
|---|---|---|
| Admin | `admin` | `admin123` |
| Register | `desk` | `desk123` |
| Report Viewer | `viewer` | `viewer123` |

**Real mode** (after section 2). `frontend/.env` has `NEXT_PUBLIC_API_URL=http://localhost:4000/api`, then:
```bash
cd backend  && npm run start:dev     # API on http://localhost:4000/api
cd frontend && npm run dev           # site on http://localhost:3000
```

**Checks**
```bash
cd backend  && npm test && npm run lint && npm run build
cd frontend && npm test && npm run lint && npm run build
```

## 5. Where to read more

- `README.md`: full project guide (routes, roles, printing, environment settings, checklist).
- `database/README.md`: the database steps, the bugs found in `db.txt`, and the gap analysis.
- `database/proposed/003_recommended_extensions.sql`: optional extras, not applied:
  - unique indexes
  - payment method and verification columns
  - gender column
  - pass-code generator

## 6. Open questions / possible next work

- Payment verification: the database has no column for it, so all payments show
  "যাচাই হয়নি" (unverified). Decide whether to add the columns from `003`.
- Editing or deactivating a registration: no update function exists yet.
- SMS sending: the supplied SMS functions are fixed by `002`, but no SMS gateway is connected.
- Deployment (domain and HTTPS) once the database is ready.
