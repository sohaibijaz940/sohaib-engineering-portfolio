# Architecture

React/TypeScript PWA -> same-origin /api -> Flask application -> SQLite persistent relational file.

- backend/db.py: schema, short-lived transactional connections, foreign keys/WAL, idempotent synthetic seed.
- backend/pricing.py: deterministic pure calculation over a single comparable group.
- backend/server.py: authentication, role checks, validation, pricing/lookup, supplier/admin mutations, static serving.
- src/main.tsx: customer screens, auth/enrollment, supplier/admin portals, QR and comparison dialogs.
- src/style.css: Midnight Violet tokens, responsive layouts, reduced-motion behavior.
- public/sw.js: shell-only caching; APIs explicitly bypass the cache.

Users have roles. Shops optionally link one supplier user. Listings link a shop and component with one current offer for each grade/warranty group. Price histories record submissions. Audit rows record state changes, actor, note and timestamp. Sessions store only a hash of the random cookie token with an eight-hour expiry. Failed logins are logged and limited over a ten-minute window. Privileged TOTP counters prevent replay.

All SQL receives bound values. Mutations require JSON and reject cross-origin Origin headers. Strict SameSite cookies and origin checks provide a baseline CSRF boundary for this same-origin demo. Production requires HTTPS, a trusted reverse proxy, proper secrets management, account recovery and stronger deployment-level abuse controls. No claim of a completed production security audit.

Mutations are committed before response. Price updates set approved=0, so an older approved price is replaced and excluded until reviewed; this prevents an unreviewed update from silently affecting the mean. Histories retain previous submitted prices. Shop revocation immediately excludes its offers and blocks future submissions. Admin approval does not override shop-status/freshness rules.

QR tokens are random public identifiers, not bearer credentials for privileged actions. Decoding happens in the browser. Payloads resolve only via a database match; no scanned URL is requested, preventing a scanner from becoming a network fetch proxy. A copied QR can still be displayed by someone else: the UI explains that limitation.

Figma file: https://www.figma.com/design/Vb82Xb6uEXHgVXZSB366oR/Untitled
Five editable reference screens were created in the installed Figma app. The application shares their palette, typography direction and workflows; no pixel-perfect browser verification is claimed. Figma agent generation exhausted that team's daily AI credits after creation; no plan upgrade was performed.
