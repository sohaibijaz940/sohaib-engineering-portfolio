# TrustMart — Midnight Violet

A working source demonstration of Sohaib Ijaz's TrustMart concept for **in-person electronics markets in Pakistan**, based on the original 29-page SRS, MIT App Inventor prototype, uploaded React coursework, and read-only GitHub inspection. This is not an ecommerce checkout.

## Start on Windows

Requirements: Python 3.12+ (with pip/venv), Node.js 20.19+ or 22.12+, npm, a modern browser. Python 3.12 is recommended.

From this project folder in PowerShell:

```powershell
.\scripts\start-demo.ps1
```

The script creates a virtual environment, installs locked frontend dependencies and pinned Python requirements, builds, runs tests, and serves the app. Open **http://localhost:8000**. Keep the terminal open. If PowerShell policy blocks the script, use the manual commands below instead of changing system policy.

```powershell
py -3 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
npm ci
npm run build
.\.venv\Scripts\python.exe -m unittest discover -s backend -p 'test_*.py' -v
.\.venv\Scripts\python.exe backend\server.py
```

macOS/Linux: `sh scripts/start-demo.sh`. The source uses SQLite and Python's standard timezone support; no database server is needed.

## Demo accounts

All data and accounts are synthetic and public demonstration fixtures. Do not store personal information or real passwords in this instance.

| Role | Email | Password |
|---|---|---|
| Consumer | consumer@trustmart.demo | TrustMartDemo!804 |
| Supplier | supplier@trustmart.demo | TrustMartDemo!804 |
| Admin | admin@trustmart.demo | TrustMartDemo!804 |

The sign-in dialog's role buttons fill the demo credentials. Supplier/admin buttons retrieve a current TOTP code from the deliberately demo-only endpoint. This makes the flow reproducible; it is **not a production second-factor security boundary** because demo secrets are public. The backend enforces actual TOTP validation and rejects reused codes. If a code expires or was just used, wait for the next 30-second interval and click the role button again.

Consumer registration creates an account immediately. Supplier registration returns a one-time authenticator enrollment secret/QR and creates a Pending shop. Add it to an authenticator app before signing in. Only admins can approve the shop. No public admin signup exists.

## Recruiter walkthrough (5 minutes)

1. Discover: inspect the animated layered phone, scroll through the purpose and feature sections. Resize to mobile to see bottom navigation.
2. Sign in as Consumer. Open Price explorer, search `iPhone 13`, inspect the display. Its six eligible sample offers are matched by component, grade and 30-day warranty. Open calculation details; compare up to three offers.
3. Change grade to Refurbished and warranty to 7 days: the single eligible sample is explicitly Low confidence. Redmi Note 10 Battery also demonstrates stale-offer exclusion.
4. Open Scan QR. Enter `Shop804`: Ali Electronics, the original prototype's fictional shop. Download its generated QR and upload that image to exercise decoding. Display the QR on another screen for a physical camera test.
5. Try `Shop811` Warning, `Shop812` Revoked, `Shop813` Pending, and an unknown ID. Only Verified offers can enter averages.
6. Sign out, sign in as Supplier using a fresh code. Submit a new price. It persists but remains outside averages pending admin approval.
7. Sign in as Admin with its fresh code. Approve the listing, then review a store and change its status with an audit explanation. Consumer lookup immediately reflects the record. A revoked store is excluded from averages and cannot submit prices.

## Development

Start `python backend/server.py` in an activated venv and `npm run dev` in another terminal. Vite proxies `/api` to port 8000. Use the Vite URL printed in the terminal. `npm run typecheck` checks TypeScript; `npm run build` also checks types. The QR decoder is loaded only when scanning begins.

## Database and seed

The app creates `data/trustmart.sqlite` on its first start, with foreign keys, uniqueness/check constraints, WAL, users, shops, components, listings, price histories, audits, sessions, and login attempts. Seeding is idempotent and does not overwrite an existing database. Set `TRUSTMART_DB` to choose another file. Six component definitions and nine fictional Lahore supplier profiles are seeded. Price histories contain sample submissions, not measured historical market averages. Timestamps are stored in UTC and displayed in PKT, currency in PKR.

SQLite is a documented development database deviation from the SRS relational **cloud** database requirement. For a small single-instance synthetic demo, use a persistent volume. PostgreSQL remains the scaling migration: replace the connection layer and SQL placeholders, migrate integer PKR prices and constraints, and rerun the same permission/pricing tests. No PostgreSQL integration is claimed here.

## Price calculation

Exact component + quality grade + warranty is one comparison group. One current listing per supplier/group is enforced by a unique key. Eligible offers must be Approved, from a Verified supplier, in stock, timestamped no more than seven days ago and not in the future. With 5+ eligible offers, remove floor(n x 0.20) from each end and average the rest. Below 5, use the untrimmed mean and label Low confidence. Empty groups return no average. Whole-rupee integers avoid binary storage of money; displayed means round to a whole PKR. All results are marked sample/fictional even with enough suppliers.

## Camera / PWA

Camera access works only on HTTPS or localhost, with permission and an available camera. LAN HTTP addresses on a phone are not secure contexts. Denial/no-camera states explain the manual ID and image-upload fallbacks. Scans are decoded locally; the client sends only QR text to the backend. QR payloads use random store tokens. URLs are parsed as text and never fetched or navigated to; unknown/tampered tokens return an error. QR identifies a record, not the physical person or part displaying it.

The manifest and service worker cache the app shell/assets for repeat visits. API data is never cached. Price queries, verification and authentication require a live server; this is not an offline-verification claim. Browser-specific install support varies; mobile camera and PWA installation remain acceptance checks.

## Persistence, backup and recovery

Run `python scripts/backup.py` while the app is running. SQLite's online backup API creates a timestamped snapshot and runs integrity_check. To restore, stop the app, preserve the current DB/WAL/SHM files, restore a backup to TRUSTMART_DB, then restart. Test restoration on a separate copy before replacing a useful database. No backup files contain real customer data by design.

## HTTPS deployment / portfolio

`Dockerfile`, `compose.yaml`, and `render.yaml` are supplied. Local Docker: `docker compose up --build`; open localhost:8000. The local compose sets non-Secure cookies for localhost. The hosted image sets Secure cookies and must sit behind HTTPS. The Render blueprint requests a paid persistent-disk plan; it is configuration only, **nothing has been purchased or deployed**. Review hosting cost before deploying. Use a separate new repository for this upgrade until the user approves changes to the original repo.

Use a persistent mounted `/data`, one instance for SQLite, port 8000, and a HTTPS reverse proxy. The image runs Waitress as a non-root user. For a real deployment, replace public demo users/secrets, encrypt and manage TOTP secrets, disable TRUSTMART_DEMO, add account recovery and monitored abuse controls, and reassess cloud storage/security requirements. This deliverable is for synthetic recruiter demonstration.

The companion `portfolio-with-trustmart` output is a sanitized copy of the existing portfolio with the TrustMart project entry and its shared case-study call-to-action updated. CareIndex source files are byte-verified unchanged. Local runtime DB and `.env.local` secrets were excluded. Start TrustMart separately and the portfolio link opens localhost:8000. For public hosting, set `NEXT_PUBLIC_TRUSTMART_URL` to your real HTTPS TrustMart URL **before building** that portfolio. No portfolio URL has been invented and no public deployment is claimed.

## Verification and boundaries

Verified: TypeScript checks, Vite production build, 20 Python unit/API tests (Flask test client, isolated relational DB), all pass. These include role permissions, privileged TOTP enforcement/replay, QR round-trip/unknown codes, all four statuses, freshness exclusions, exact comparison groups, submission approval/revocation, session logout and cross-origin rejection.

Not verified: physical camera scanning, uploaded QR browser decoding, responsive browser flows/screenshots, mobile installation, load at 100 operations/second, 99.9% uptime, TLS packet inspection, PostgreSQL, and public hosting. Local loopback browser access was blocked by this execution environment and the request to allow it was automatically rejected. Browser access to Chrome also timed out waiting for app approval. The source should be run outside that restriction for acceptance testing.

See `docs/SOURCE_RECONCILIATION.md`, `docs/ACCEPTANCE.md`, and `docs/ARCHITECTURE.md`. Original source archives are preserved under `originals/`, with hashes. The original GitHub history and working portfolio were not edited or pushed.

### Google sign-in and returning to the portfolio
Real Google OAuth is implemented but requires your own Google Cloud Web application client ID and secret. Copy `.env.example` to `.env`, supply credentials privately, and restart the backend. Register exactly `http://localhost:8000/api/auth/google/callback` for local development. For public hosting, set TRUSTMART_PUBLIC_URL to your actual HTTPS demo origin and register its `/api/auth/google/callback` URL in Google Cloud. Configure the consent screen/audience for public visitors before inviting recruiters. Google manages account verification; TrustMart does not email a Google sign-in code.

The persistent Back to portfolio link appears above the app header on every page. Set VITE_PORTFOLIO_URL to your real portfolio TrustMart page before running `npm run build`. Its local default is http://localhost:3001/projects/trustmart/. Buying a domain does not deploy the app: configure hosting, HTTPS and domain DNS as well. Keep Google client secrets only on the backend host.
