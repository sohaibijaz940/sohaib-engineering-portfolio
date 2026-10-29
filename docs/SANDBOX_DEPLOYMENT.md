# CareIndex V10 synthetic-data deployment notes

**Use this only for a synthetic dataset. Not an instructions-to-go-live checklist for actual healthcare delivery.**

## Single-host Docker preview

1. Install Node.js 24 for local development, or Docker Engine/Compose for a Linux preview machine.
2. Create a **strong private setup key** (48+ random hex characters). Supply it to Docker Compose through a local `.env` file not tracked in version control (`CAREINDEX_SETUP_KEY=...`). Set `NEXT_PUBLIC_SITE_URL` for the expected URL. Do not print this secret in logs or share it with recruiters.
3. Build with `docker compose up --build -d`. The application binds to **localhost only**, port 3000, not an unauthenticated internet address. A reverse proxy with real TLS certificate would be required for remote access to the synthetic demo. Never run the dev server as a public application.
4. Verify `GET http://localhost:3000/api/careindex/health/` returns a minimal `ready` indicator. Create the first admin with the setup secret before allowing demo accounts.
5. Run `docker compose exec careindex node scripts/backup-careindex.mjs`; online backup and SHA sidecar appear in the named backups volume. Copy backups off-host and encrypt using an independently maintained key. Restore drills require the file and SHA sidecar in the same directory.
6. Perform full role/booking/billing/learning-lab browser acceptance testing. Protect the public demo against abuse and reset **fictional** demo accounts on a schedule.

## Server design limitations

- This bundle uses a **single SQLite writer**. It cannot simply be scaled by running multiple instances with independent databases.
- Built-in scrypt sessions and checks are useful engineering demonstrations, **not a complete audited production identity platform**.
- There is no verified email channel for recovery, no MFA, and no merchant payment integration.
- SQLite snapshots are not encrypted merely because they have a SHA-256 digest. SHA verifies bytes, not secrecy.
- Next.js `NEXT_PUBLIC_*` configuration needed in browser bundles must be supplied at build time for remote hostnames. Verify canonical URL, trusted Origin, secure cookies, redirects and reverse proxy settings in staging.
- Keep the portfolio demo **separate** from any prospective real-clinic service and dataset. Never use shared databases or share an admin account with recruiters.

## Failure policy

If backup verification, readiness health, permissions, database integrity, or booking tests fail: stop accepting new demo bookings and investigate. Do not bypass authorization, disable CSRF checks, or import actual medical records to “test” production readiness.
