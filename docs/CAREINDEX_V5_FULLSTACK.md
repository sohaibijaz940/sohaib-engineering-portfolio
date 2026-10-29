# CareIndex V5 — full-stack engineering lab

**Stage:** Running local full-stack portfolio project, **not a production EHR, not a patient portal**. Use only fictional or officially synthetic patient datasets. Do not upload real patient information.

## Technology

- **Next.js 15 App Router / React 19 / TypeScript**: full-stack browser UI, API Route Handlers, request validation.
- **Node.js 22.13+ built-in `node:sqlite`**: local file-backed relational database, WAL, foreign keys, transactions and parameterized SQL. Node **24 LTS** recommended: in Node 22 the SQLite API remains experimental. Does not need native packages or remote SQL credentials.
- **Authentication:** salted `scrypt` password hashing, 32-byte cryptographically random session tokens, SHA-256 hashed token verifiers at rest, 12-hour server expiration, HttpOnly/SameSite=Strict cookies, secure cookies in production, session revocation at logout and role changes, basic per-email lockouts.
- **Authorization:** server-side role checks for every protected endpoint, not just hidden UI controls. Public signup is `PENDING` until an admin changes its role. The **first administrator** needs a locally generated private setup secret. One clinic only; **no multi-tenancy**.
- **Roles:** ADMIN (all), CLINICIAN (patient/appointments/visits), RECEPTIONIST (patient/appointments), VIEWER (read-only), PENDING (no clinic access). Changing another user's role revokes their sessions.
- **Trace Explorer:** SQLite `audit` metadata table records request ID, actor, role, route, method, stages (session, authorization, validation, SQL, response), duration and outcome. Admin sees team events; staff see own; no passwords, cookies or patient field values in trace messages. The explorer displays **real recorded API requests**, not a fabricated flow diagram.
- **AVL inspector:** SQLite is the authoritative source. For an educational exact-ID inspection, the server rebuilds the in-memory AVL tree from active IDs and reports comparison path, size, height and rotations. An AVL search is O(log n) on an *already built* balanced tree. **The end-to-end inspection endpoint is not O(log n)** because it rebuilds the tree.

## Setup (Windows PowerShell in portfolio root)

```powershell
node --version   # Need >= v22.13.0; Node 24 recommended
npm install      # If existing V4 dependencies are already installed, can skip
npm run setup:careindex
# COPY the secret the command prints. Keep it private.
npm run dev
```

Open `http://localhost:3000/demos/careindex/`. Choose **Create your clinic admin** (first run), provide email/name/password (12+ characters), and paste the **private admin setup secret**. This initializes `data/careindex.sqlite` with 420 generated fictional patient records. `.env.local` is gitignored and must never be committed.

After admin setup, create a second account by clicking **Request an account** in a private browser window. It is PENDING by default. The admin can go to **Team & permissions**, assign VIEWER, RECEPTIONIST or CLINICIAN, and have the person sign in again. User permissions are checked in APIs before any SQL writes.

**No UI token or client-side role value is trusted.** The cookie is verified against the sessions table; the server checks the role from the database.

## Workflow demonstration

1. Sign in as ADMIN; create a fictional patient and record the numeric ID.
2. Search that ID in **Patient directory** and add an appointment.
3. Open **Index inspector** and search the same ID; compare the AVL steps.
4. Open **Backend explorer** and select an actual request to see session, RBAC, SQL and timing steps.
5. Create a VIEWER account in a private browser and attempt a write: controls are hidden and direct write API calls yield HTTP 403.
6. Give another account the RECEPTIONIST role; they can manage appointments, but cannot record visits or manage team roles.
7. In a CLINICIAN account, record a fictional visit. Inspect audit records as ADMIN.
8. Restart the app and verify the SQLite records remain (different from V4 localStorage).
9. In **Data & safety**, optionally import officially generated Synthea CSVs using an admin account. Existing synthetic patients are replaced; user accounts remain.

## API routes

| Path | Method | Permission | Purpose |
|---|---|---|---|
| `/api/careindex/auth/setup-info` | GET | public | First-admin setup status |
| `/api/careindex/auth/signup` | POST | public, same-origin | Pending account / first admin with secret |
| `/api/careindex/auth/login` | POST | public, same-origin | Password sign-in, session creation |
| `/api/careindex/auth/logout` | POST | signed-in, same-origin | Revoke session |
| `/api/careindex/auth/me` | GET | public | Check current session |
| `/api/careindex/patients` | GET/POST/PATCH/DELETE | read/write/admin-delete | Patient directory and maintenance |
| `/api/careindex/appointments` | GET/POST/PATCH | read/write | Appointment scheduling and status |
| `/api/careindex/visits` | POST | clinician/admin | Synthetic visit history |
| `/api/careindex/stats` | GET | approved account | Aggregated counts |
| `/api/careindex/lookup?id=...` | GET | approved account | Custom AVL search plus actual SQL retrieval |
| `/api/careindex/users` | GET/PATCH | ADMIN | Staff listing/approval/role changes |
| `/api/careindex/audit` | GET | approved account | Own/team audit metadata |
| `/api/careindex/import` | POST | ADMIN | Synthetic Synthea CSV replacement |

## Testing

```powershell
npm run typecheck
npm run test:avl
npm run test:careindex
npm run test:server
npm run build
```

`test:server` executes real Next.js API handler logic with a temporary SQLite file and tests first-admin bootstrap, missing setup secret, pending account denial, role changes/session revocation, read-only write denial, same-origin check, CRUD, appointments, AVL path, clinician/receptionist boundaries, audit visibility and sign-out.

## Deployment / privacy restrictions

- **Not suitable for serverless static hosting.** `output: 'export'` has been removed. `npm run dev` and `npm run start` need a Node runtime with writeable persistent disk.
- SQLite database files must be excluded from source control and backed up securely for any meaningful usage.
- This is **not production-ready**. Needs additional security review, external hardened auth and account recovery / MFA, IP/device-aware abuse protection, tenancy isolation, production database and indexing plan, encrypted backups, retention policy, audit immutability, monitoring, health data compliance, disaster recovery, accessibility and clinic acceptance before real use.
- Do not upload real patient details, even locally, during portfolio evaluation. Synthea is fictional; third-party Kaggle datasets may have restricted reuse and privacy risks.
- The previous browser-only sandbox is preserved at `/demos/careindex/sandbox/`; original algorithm visualizer at `/demos/avl-tree/`.

## Source map

- `src/components/CareIndexFullstack.tsx`, `src/app/demos/careindex/careindex-v5.css` — UI/UX.
- `src/server/careindex-db.ts` — relational schema, SQL transactions, seed.
- `src/server/careindex-auth.ts` — role matrix, password & session mechanics.
- `src/server/careindex-trace.ts` — audit trace / request guards / error handling.
- `src/app/api/careindex/auth/[action]/route.ts` — sign-in/sign-up/end session.
- `src/app/api/careindex/[resource]/route.ts` — permissions, patient/appointment/visit/import APIs.
- `tests/careindex-server.test.mjs` — integration tests through actual NextRequest handlers.
- `scripts/setup-careindex.mjs` — locally generated admin setup secret.
