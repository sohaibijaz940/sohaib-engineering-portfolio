# Public portfolio deployment — prepared, not yet deployed

Target: https://sohaibijaz.dev and https://trustmart.sohaibijaz.dev.
This single-host Docker Compose deployment preserves both Node databases and the Flask database in separate named volumes. Only the HTTPS proxy publishes ports. Caddy obtains and renews certificates automatically once DNS and networking work. Do not buy a separate SSL certificate for this configuration.

## Account and server prerequisite
Activate Azure for Students using your own student verification. Review the actual subscription credit, expiry, VM/disk/IP pricing and spending limit before provisioning; $100 credit does not promise one year of continuous hosting. Do not upgrade to pay-as-you-go automatically. A small Linux server with Docker Engine and Compose is required. Build memory must be measured; 2 GB may require swap or building images separately.

## Before the first deployment
1. Use a clean checkout of the public repository on the server, never copy local runtime databases or the whole Downloads folder.
2. Copy the two .env.*.example files here to .env.portfolio and .env.trustmart. Set a new random CAREINDEX_SETUP_KEY privately; populate only the API keys intended for public demo use. Set restrictive provider quotas. Keep these files private (chmod 600). Never commit real credentials.
3. Register https://trustmart.sohaibijaz.dev/api/auth/google/callback as an authorized redirect URI in the existing Google OAuth web client. Keep the local callback too if needed. Review OAuth publication/testing audience so visitors can actually sign in.
4. In Name.com DNS, point A records for @, www and trustmart to the allocated static public IPv4. Do not add guessed addresses. Preserve mail/TXT records. Remove conflicting web A/AAAA/CNAME records only after inspecting them.
5. Permit inbound TCP 80/443, UDP 443 optionally, and restrict SSH to your admin IP. Do not expose 3000/8000 or database ports.
6. From this directory run docker compose config --quiet, then docker compose build and docker compose up -d. Check docker compose ps and certificate/service logs. Docker is not installed in the current Windows environment, so container builds are not yet verified here.

## Launch verification
Check apex and www redirect, HTTPS, project links, writing images/videos/captions, mobile layout, contact links and no localhost URLs. Test CareIndex setup privately, then recruiter access policy. Test Travel accounts, itinerary persistence and provider limits. Test TrustMart registration, Google sign-in, QR camera permission, manual ID, reports and assistant. Restart services and confirm fictional test records persist. Do not claim a completed launch until these pass on the public host.

## Operations
The databases start fresh and fictional; local customer accounts and sessions are not migrated. Named volumes survive container recreation. Never use docker compose down -v for routine updates. Take consistent SQLite backups using the supplied application backup tooling (and SQLite backup API for the other databases), store encrypted copies off-host and test restoration. Keep provider keys private and monitor student credit and disk usage. This is a portfolio demonstration, not a real clinical or payment service.
