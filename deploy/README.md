# Public portfolio deployment

Live since 29 October 2026: https://sohaibijaz.dev and https://trustmart.sohaibijaz.dev.

Azure for Students, Central India, one Standard_B2ats_v2 server with 1 GiB RAM, 32 GiB Standard SSD and a static public IP. Name.com domain auto-renew is off. The student credit expires on 29 October 2027; credit exhaustion may stop service sooner. No paid subscription upgrade was authorized. Actual consumption must be checked in Azure Cost Management; the credit is not a one-year uptime guarantee.
This single-host Docker Compose deployment preserves both Node databases and the Flask database in separate named volumes. Only the HTTPS proxy publishes ports. Caddy obtains and renews certificates automatically once DNS and networking work. Do not buy a separate SSL certificate for this configuration.

## Account and server prerequisite
Activate Azure for Students using your own student verification. Review the actual subscription credit, expiry, VM/disk/IP pricing and spending limit before provisioning; $100 credit does not promise one year of continuous hosting. Do not upgrade to pay-as-you-go automatically. A small Linux server with Docker Engine and Compose is required. Build memory must be measured; 2 GB may require swap or building images separately.

## Before the first deployment
1. Use a clean checkout of the public repository on the server, never copy local runtime databases or the whole Downloads folder.
2. Copy the two .env.*.example files here to .env.portfolio and .env.trustmart. Set a new random CAREINDEX_SETUP_KEY privately; populate only the API keys intended for public demo use. Set restrictive provider quotas. Keep these files private (chmod 600). Never commit real credentials.
3. Register https://trustmart.sohaibijaz.dev/api/auth/google/callback as an authorized redirect URI in the existing Google OAuth web client. Keep the local callback too if needed. Review OAuth publication/testing audience so visitors can actually sign in.
4. In Name.com DNS, point A records for @, www and trustmart to the allocated static public IPv4. Do not add guessed addresses. Preserve mail/TXT records. Remove conflicting web A/AAAA/CNAME records only after inspecting them.
5. Permit inbound TCP 80/443, UDP 443 optionally, and restrict SSH to your admin IP. Do not expose 3000/8000 or database ports.
6. From this directory run docker compose config --quiet, then docker compose build and docker compose up -d. Check docker compose ps and certificate/service logs. Docker builds and service startup have been verified on the Azure host. For this small server, use the CI runtime procedure below rather than rebuilding Next.js on the server.

## Launch verification
Check apex and www redirect, HTTPS, project links, writing images/videos/captions, mobile layout, contact links and no localhost URLs. Test CareIndex setup privately, then recruiter access policy. Test Travel accounts, itinerary persistence and provider limits. Test TrustMart registration, Google sign-in, QR camera permission, manual ID, reports and assistant. Restart services and confirm fictional test records persist. Do not claim a completed launch until these pass on the public host.

## Operations
The databases start fresh and fictional; local customer accounts and sessions are not migrated. Named volumes survive container recreation. Never use docker compose down -v for routine updates. Take consistent SQLite backups using the supplied application backup tooling (and SQLite backup API for the other databases), store encrypted copies off-host and test restoration. Keep provider keys private and monitor student credit and disk usage. This is a portfolio demonstration, not a real clinical or payment service.

## Updating the small server

Build Next.js in GitHub Actions using **Package production portfolio runtime** (run manually for application changes). Download the artifact for the exact reviewed commit, verify its SHA-256 against GitHub artifact metadata, and extract only portfolio-runtime.tar.gz. This artifact contains application code/assets, no private environment files or runtime databases. Transfer the archive over SSH, extract into a new release directory, then build with:

```sh
docker build -t deploy-portfolio:latest -f /opt/sohaib-portfolio/runtime.Dockerfile /opt/sohaib-portfolio/runtime-RELEASE
cd /opt/sohaib-portfolio/app/deploy
docker compose up -d --no-build
```

Keep the Compose project directory/name unchanged so existing named volumes are reused. The deployed application runtime is commit b0236ec6213693aaa9e6af1dab66d29d0af3e230. It validates mutation origins against the configured public HTTPS origin, while rejecting foreign origins. Keep NEXT_PUBLIC_SITE_URL consistent at build and runtime.

## Launch checks completed

Public HTTPS and www redirect, all four demo entry routes, writing index/article, résumé download, mobile and desktop home layouts, TrustMart consumer demo sign-in and fictional Shop804 record, database-grounded Gemini response, CareIndex administrator initialization/recruiter guest session and Travel guest session were verified. SQLite state survived container recreation. Google OAuth public origin/callback were saved; an interactive Google account round-trip and a physical phone camera test remain manual checks.

FlightAPI and Google Places keys are configured privately. No extra paid flight request was spent for launch verification. Ticketmaster remains unconfigured; daily event results are unavailable until its separate key is supplied. Provider quotas and billing still apply. No sample prices are represented as live offers.

The fictional CareIndex bootstrap administrator receipt is stored privately at /app/data/deployment-admin.json inside the persistent portfolio volume. Do not publish that file or the setup key. Public recruiters use isolated guest accounts.
