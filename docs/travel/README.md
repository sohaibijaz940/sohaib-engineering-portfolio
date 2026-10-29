# Travel Estimator — Midnight Navy

A local working travel-planning demo based on Sohaib Ijaz's original database coursework. Built October 2026. The integrated application is at `/demos/travel/`; the portfolio case study links to it. Nothing was pushed to the original GitHub repository.

## Start the integrated portfolio
Requires Node.js 24 LTS (Node's built-in SQLite is used) and npm. From the portfolio folder:

```powershell
npm install
npm run dev -- --port 3001
```

Open http://localhost:3001/demos/travel/. Production: `npm run build`, then `npm run start -- --port 3001`. Development output uses `.next-dev`, production uses `.next` so they cannot overwrite each other's caches. A local Node server with filesystem writes is required; static-only hosting is insufficient.

## What works
- Dark navy / ivory / bronze interface, animated text entrance, scrubbed hero parallax, scroll text reveal, destination hover/focus previews, room-gallery navigation, native scrolling and reduced-motion CSS/GSAP handling.
- Licensed 12-second Italian-coast film (compressed H.264, 1280 wide, no audio, under 1 MB), pause/play, poster and playback-failure fallback. Reduced-motion and browser data-saver preferences avoid automatic playback. Video pauses when the page is hidden.
- Eight domestic/international destinations, country/region filters and text search; 24 fictional accommodation listings with capacity and amenities.
- Shared TypeScript cost engine on browser and server. One to 30 nights, up to eight guests, validated room capacity, sample return flights, sample Hunza driving/bus options, room-night costs, tax allowance, daily costs, user-entered extras, visa/insurance allowances, contingency and PKR/local/USD/EUR display.
- Expandable formulas and animated totals. Download a text estimate; save private snapshots and compare up to three journeys.
- Guest sessions plus traveller registration/login, scrypt password hashes, hashed HttpOnly session cookies, parameterised SQL, role enforcement, request-size checks, same-origin JSON writes and rate limits.
- Public demo pricing editor for sample currency and room-price changes, recorded in an audit trail. Past saved estimates retain original totals; reopening uses the configured sample prices.

## Explore in 3 minutes
1. Watch/pause the opening film and scroll to destinations. Hover or keyboard-focus a card on desktop; tap to open its details on mobile.
2. Choose Hunza to compare car, bus and sample flight assumptions. For international destinations, choose flight.
3. Open the planner. Change dates/guests, test an insufficient room count, then select a suitable stay. Open the room gallery.
4. In Details, adjust daily spending, extras, contingency and the destination's currency assumption. Visa and insurance intentionally default to zero.
5. Save a journey, make a second plan, then open Saved journeys and select both Compare checkboxes. Download a breakdown from the planner.
6. Sign in via the footer, click Fill pricing editor demo, then Sign in. The public sample credentials are `operator@travel.demo` / `TravelDemo!2026`. Only fictional pricing assumptions can be edited; no real financial rates are changed.

## Persistence / privacy
SQLite lives at `data/travel.sqlite`; it is separate from all CareIndex and TrustMart databases. `TRAVEL_DB_PATH` can select an absolute persistent file. First API use creates and seeds the schema. Guest saves belong to the current cookie, expire after seven days of session validity, and do not transfer automatically to a registered account. Sign in before saving if you want account-owned plans. Registration emails are not verified and no email is sent. There is no password-reset flow yet: use fictional demo accounts and do not use a sensitive password.

Never package or publish runtime database files or `.env` credentials. Do not run multiple independent SQLite instances against an ephemeral or network filesystem. Public production deployment needs durable storage, backups, HTTPS, account recovery/verification and stronger abuse controls. The public pricing editor should be disabled/restricted for a non-demo service.

## What is sample versus live
This is a real working application, but its prices are **planning assumptions**, not live travel quotes. Baseline sample data is dated 2026-10-28. Admin edits and custom FX values change sample assumptions only. Origin choices are Lahore, Islamabad and Karachi; the curated catalogue is finite. The drawn route is schematic, not Google Maps or navigable road geometry. Hunza road distances are sample inputs. No real flight tickets, hotel reservations, visa decisions, payments, trained AI recommendations or guaranteed availability are provided. The expanded workspace adds attributed public forecast/reference FX/guide adapters; see PROVIDERS.md and WORKSPACE.md. No fake booking confirmation is issued.

Rooms, hotel names and ratings are fictional; interior stock photos illustrate a style and do not represent one real property or a verified room. Destination photos are sourced for their labelled places. All original assets and attribution links are listed in `ASSET_CREDITS.md` and in the app's credits dialog.

## Calculation rules
Nights = UTC return date minus departure date; daily allowances cover nights + 1 days. Hotel capacity must cover all travellers. Accommodation = nightly native-currency rate × rooms × nights × PKR per native unit. The sample tax allowance is 8% of accommodation. Food/local/activities = native daily allowance × days × travellers × spending factor × FX. Return airfare is a sample per-person PKR amount. Driving fuel = sample one-way km × 2 ÷ km/litre × PKR/litre; it is shared per car, not multiplied by passengers. Tolls/rental/parking are separate extras. Bus uses sample PKR per passenger-km. Visa and insurance are user-entered per-person PKR values. Contingency applies to the subtotal. Lines and the buffer round to whole PKR; doubling a plan can differ by one rupee because of rounding.

## Verify
```powershell
npm run typecheck
npm run test:travel
# Start the app before API tests:
npm run test:travel:api
npm run build
```

17 engine tests cover calculations, date boundaries, capacity, native currencies, snapshots and invalid inputs. API tests use fictional sessions/accounts and exercise permission boundaries, ownership, CSRF, sample pricing and audit snapshots. They restore temporary sample rate/nightly-price edits in finally blocks. Set `TRAVEL_TEST_URL` to change the default http://localhost:3001. Tests must target a local demo, never a real customer deployment.

Browser acceptance covered desktop and 390px phone viewports, live video playback, no horizontal overflow, room-capacity validation, gallery navigation and save/reopen journeys. Physical devices, additional browsers and OS-level reduced-motion/data-saver toggles still require manual acceptance.

## Files
- `src/components/travel/TravelApp.tsx`: UI, planner and account/editor dialogs.
- `src/app/demos/travel/travel.css`: isolated visual system.
- `src/lib/travel-data.ts`: curated catalogue and sample baseline inputs.
- `src/lib/travel-engine.ts`: shared pure calculations.
- `src/server/travel-db.ts`: separate relational database and session helpers.
- `src/app/api/travel/[...path]/route.ts`: role-scoped APIs.
- `originals/original-coursework.zip`: preserved original documentation.

For a separate deployment, set `NEXT_PUBLIC_PORTFOLIO_URL` to the actual portfolio case-study URL before building. No real domain has been assumed and no public deployment is claimed.

## Expanded workspace
See [WORKSPACE.md](WORKSPACE.md) for budget matching, itineraries, group expenses, collaboration, offers and honeymoon planning. [PROVIDERS.md](PROVIDERS.md) explains public-source caching and optional private FlightAPI credentials. Run `npm run collect:travel` against the running app to populate fresh public-source caches. No private keys are required for the rest of the demo.

## Food, sights, events and groups
See [DISCOVERY_SETUP.md](DISCOVERY_SETUP.md) for the dedicated discovery tab, full airline details, local food/sightseeing guide content, group-plan workflow and Google Places/Ticketmaster setup. Those two new integrations remain unverified until separate private keys are configured; FlightAPI search is connected.
