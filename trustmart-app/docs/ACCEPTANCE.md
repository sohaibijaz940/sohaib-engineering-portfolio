# Acceptance and verification

Automated checks completed: TypeScript strict check; Vite production build; 20 backend unit/API tests passed. API tests use an isolated SQLite file and Flask's in-process test client, not browser automation. The decoder library is a separate on-demand build chunk.

Manual acceptance still required:

- Windows Chrome/Edge desktop, 390px and 360px mobile widths, iOS Safari and Android Chrome: no horizontal overflow, readable forms, modal focus and Escape, bottom navigation, comparison.
- Real camera on HTTPS/localhost: allow camera, decode a generated Shop804 QR, stop camera on close, switch to manual lookup, deny permission, no-camera device, unknown/tampered/revoked codes.
- Upload: readable downloaded QR PNG succeeds; non-QR image and >10MB image show an error. Device camera frames and image files never upload to the server.
- Registration: consumer signup/login; supplier enrollment with authenticator; Pending supplier cannot submit until approved; invalid credentials and repeated failures.
- Supplier submits an offer; admin approves it; consumer sees updated count/mean; admin revokes shop; lookup warning and exclusions update.
- Install PWA where supported; revisit offline; shell opens but API information is unavailable. No stale verified status is presented as a new API response.
- Persistent storage survives app restart; online backup restores on a separate DB copy.
- HTTPS deployment and secure cookies; test storage persistence after redeploy before sharing with recruiters.

Execution limits: local browser requests to the Python server timed out; shell loopback connection was denied and escalated access was automatically rejected. Chrome app access approval timed out. Consequently no browser, real camera, or mobile screenshots are represented as verified. Figma canvas was inspected through its desktop UI and five screen frames were visibly present. No public host was configured or deployed.

A standalone TrustMart-visual-preview.html is a visual fallback for the public home/auth shell only. It is not the full backend app and should not be used for a live functional demonstration. Run the supplied startup script for that.
