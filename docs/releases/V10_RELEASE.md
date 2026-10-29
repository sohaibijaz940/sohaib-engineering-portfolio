# CareIndex V10 — Final Major Feature Release

**Status: verified synthetic-data release candidate. NOT APPROVED FOR REAL CLINIC OPERATIONS.**

V10 closes a meaningful portion of the remaining engineering work: configurable fictional doctor profiles and clinic hours; server-side schedule-conflict protection; account password change/session invalidation; retention-safe patient archiving; privacy-conscious audit actor labels; tested backup/restore integrity tools; deployment container and health endpoint; operational and security documentation.

Detailed install and test instructions: `docs/V10_RELEASE.md`.

Real patients and real money are NOT enabled. Before real use a specific clinic, host, PSP, security assessor and privacy/legal reviewer must validate the use case and formally sign off: `docs/CLINIC_READINESS_GATES.md`.

New features:
- Admin-only **Clinic operations** in the existing sidebar.
- Account Security page `/demos/careindex/security/` for staff and patient accounts.
- Backup CLI `npm run backup:careindex` and non-destructive verification `npm run verify:backup -- <file>`.
- Health endpoint `/api/careindex/health/`.
- Synthetic-data preview Docker Compose.

Run `npm run typecheck`, `npm run test:clinic`, `npm run test:operations`, `npm run test:server`, and other scripts in `README.md` after updating. A production Next.js build must still be verified on Windows; the authoring environment lacks Linux SWC download connectivity.
