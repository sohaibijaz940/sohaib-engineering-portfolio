# CareIndex V10 — Final major portfolio release / clinic readiness candidate

**Important: V10 is a working synthetic-data demonstration, not certified, verified, or approved for actual patient care. Do not upload real patient records, collect actual payment credentials, or expose this instance as a clinical record system.**

## Scope delivered in V10

- Admin **Clinic operations** section integrated with the existing cinematic staff workspace: add/edit fictional doctor profile, specialty, consultation fee in PKR, weekly half-hour working hours, active state.
- Backend-enforced role permission, Origin check, data validation and atomic transactions for all clinic-schedule writes. Cannot deactivate/restrict schedules in ways that invalidate future booked consultations. Invoice amounts are snapshots.
- Booking times expanded from 09:00–16:30 to 08:00–19:30 to support configurable hours, with last appointment starting before configured closing time.
- Admin patient deletion now archives the record and preserves appointment/visit history. Linked patient accounts remain protected from deletion. Synthetic bulk replacement blocked if business transactions or patient accounts exist.
- New Account Security page for signed-in staff/patients: password change verifies original password, salts and hashes new credential, revokes all older sessions, refreshes current cookie.
- New authenticated audit actor pseudonyms instead of email addresses in trace metadata. The existing Engineering Lab still uses recorded server-side steps and user-ID-based ownership filters.
- SQLite online backup CLI; SHA-256 sidecar, integrity and FK verification, non-destructive restore drill with a temporary copy. Backups are local and **not encrypted**. Use encrypted off-host storage separately.
- `/api/careindex/health/` readiness endpoint with no record-count/path/secret disclosure, cache prevention. Baseline security response headers.
- Optional standalone Docker deployment artifact and local-loopback Docker Compose with persistent named SQLite and backup volumes. It is for a **synthetic-data pilot**, not a healthcare production authorization.
- Adds 10 new automated tests for administration, session invalidation, booking/fee behavior, patient retention, backup and tamper detection.

## Installation over V9

1. **Back up the entire project first** and preserve `data/` and `.env.local` on Windows.
2. Stop the development server (`Ctrl+C`). Extract the `CareIndex_V10_Clinic_Release_Patch_for_V9.zip` **outside** the existing project. Copy the contents of the extracted folder into `sohaib_engineering_portfolio_v2` beside `package.json`; choose merge/replace matching code files.
3. **Do not delete** `node_modules`, `.env.local`, `data`, or previous records. No new npm dependencies or schema reset are required.
4. Run `npm run typecheck`, `npm run test:clinic`, `npm run test:operations`, `npm run dev`.
5. Staff workspace: `http://localhost:3000/demos/careindex/` → **Clinic operations** (Administrator only). Account security: `http://localhost:3000/demos/careindex/security/`. Patient portal remains `/demos/careindex/patient/`; engineering lab remains `/demos/careindex/engineering/`.
6. Optional baseline `npm run build` on your Windows machine to check the production bundle. It could not be compiled in the authoring Linux environment, which only had Windows Next SWC packages installed.

## Back up your local demonstration records

From the application root run `npm run backup:careindex`. This creates a timestamped, integrity-checked SQLite snapshot and `.sha256` file in `backups/`. Do not commit or share these backups; they contain all application account/data records. To verify a backup without modifying the live DB:

```powershell
npm run verify:backup -- backups\careindex-YYYY-MM-DDTHH-MM-SS-sssZ.sqlite
```

A passed checksum and restore drill do **not** prove off-host disaster recovery. Encrypt, transfer, periodically test restoration on a separate machine, and have an approved recovery plan. Never overwrite a running SQLite database by pasting a backup file over it.

## Demo deploy versus genuine clinic deployment

The included Dockerfile/Compose use one persistent SQLite node, configured to bind only to `127.0.0.1:3000`. Put a trusted HTTPS reverse proxy in front *for a synthetic-data preview only*. Set secrets in a private environment and validate the actual deployment with real browser tests. Do not expose the dev server or the SQLite database over the internet.

Production clinical use would require additional implementation, clinic-specific validation, independent security assessment, privacy/legal review, appropriate vendor agreements, hosting decisions, encrypted off-site backups, disaster recovery drills, access and audit controls, retention management, real payment integration, real identity verification, and operational handover. See `docs/CLINIC_READINESS_GATES.md`.

**This release is the final major portfolio feature release, not a claim of legal, clinical, or cybersecurity certification.**
