# Provider setup and data provenance

The app runs without provider keys. It does not turn sample prices into live offers.

## Live flight prices — FlightAPI (optional key required)

The former Amadeus Self-Service setup instructions were outdated and have been removed. No old Amadeus key or Gemini key is used by the replacement.

1. Create your own account at https://api.flightapi.io/register . Review the provider terms yourself. Do not purchase a subscription just to test this integration.
2. Confirm trial access and its quota in your dashboard. The public homepage advertises 20 free calls; its getting-started page describes a different free allowance. We cannot promise a recurring free tier or unlimited demo use. Round-trip requests cost two credits according to the endpoint documentation.
3. Add this to the existing private `.env.local` in the portfolio root (preserve your other settings):

```dotenv
FLIGHTAPI_KEY=your_private_key
```

Never put it in a `NEXT_PUBLIC_` variable, source file, `.env.example`, browser URL, screenshot or chat. Restart the development server after changing configuration. Open Travel workspace → Flights & dates → **Search live flight prices**. Choose future dates. Supported origins: LHE, ISB and KHI. The finite destination catalogue maps to NAP, IST, GIL, MLE, DXB, CDG, DPS and FCO; these are airport mappings, not a promise that every route is available. All travellers are treated as adults, economy cabin, USD quotes.

The server calls FlightAPI's documented round-trip endpoint. The vendor requires the key in its request path; native server HTTPS is used so Next fetch diagnostics do not record that credential-bearing URL. Raw provider errors, URLs and credentials are never returned to the browser. Normalized results show supplied timestamps, amounts and itinerary segments. No sample data is substituted when live search fails.

Retrieved quotes are cached for five minutes, labelled with fetch time. Default protection allows only five upstream searches per rolling 24-hour demo window across this app instance; cache hits do not consume that local limit. This is a quota safeguard, not the provider's allowance. Failed upstream calls count too. Session-level search limits and same-origin checks also apply. The private database stores normalized quotes, not API keys or raw provider payloads. Cache keys include a hash of the active credential so changing accounts cannot reuse a previous account's cached search.

A provider quote still requires confirmation of group-total basis, baggage, refund/change rules, transfer costs and seller/payment charges. Use **Use this flight in my budget** to replace only the flight line. No booking, payment or background fare monitoring is enabled. No seller booking link is fabricated from relative provider paths. Check prices on the seller's site before purchase.

**Verification status:** an authenticated Lahore–Dubai round-trip search returned a real provider quote on 29 October 2026 (PKT). Parser and permission tests separately use explicitly fictional fixtures. Without a valid key the UI reports `not_configured`; invalid account/quota/network/schema responses remain explicit. Do not claim successful live data from a passing fixture test.

Official references checked 28 October 2026:
- https://www.flightapi.io/
- https://www.flightapi.io/documentation/getting-started/
- https://www.flightapi.io/documentation/round-trip-api/

Hotel inventory, real restaurant availability, review ingestion, routable maps and automated fare alerts remain unconnected. The 24 room listings remain fictional.

## Public-source adapters (no keys)
- ExchangeRate-API open endpoint: https://www.exchangerate-api.com/docs/free . Selected reference currencies are cached for 24 hours, with required attribution. No raw full-rate dataset is bundled or redistributed. Applying a reference to a new plan is explicit; it does not rewrite saved snapshots. Bank/card rates and spreads differ.
- Open-Meteo: https://open-meteo.com/en/terms . Seven-day forecasts, one-hour cache, attribution to Open-Meteo under CC BY 4.0. This local educational demo uses non-commercial access. Review eligibility or subscribe before commercial/promotional deployment. A November/December trip has no forecast unless those dates are in the actual returned horizon.
- Wikivoyage MediaWiki API: https://en.wikivoyage.org/wiki/Wikivoyage:Copyleft . Intro excerpts retain CC BY-SA 4.0 with source, contributor-history and licence links in the UI. This content licence applies to the excerpts, not automatically the application code. Guide text is a reference, not verified opening hours, fees or official visa advice.

Requests use fixed provider hosts and the eight catalogue coordinates/guide titles. User-supplied offer links are stored as references and never fetched by the server. API fetches time out; cached content is marked stale when refresh fails. There is no proxy circumvention, login-wall scraping or collection of private reviews.

## Collect/cache data locally
Start the app, then run:

```powershell
npm run collect:travel
```

Optional: set `TRAVEL_TEST_URL` to another local port. The script populates the private SQLite provider cache and writes `docs/travel/COLLECTION_REPORT.json` with counts, source links, licences and timestamps only. It does not package provider caches, customer records or credentials. New installations fetch their own data. Weather expires in one hour, guides in seven days, FX in 24 hours. Collection is on demand, not a scheduled job.

## ML status
No model is trained. Budget matching enumerates permitted sample plans and compares their full cost. Expense settlement is deterministic integer arithmetic. Curated stays, weather and guide text are not a dataset of actual completed-trip costs. A future model needs licensed relevant observations, a specific target and evaluation against this baseline using held-out time/group splits. No accuracy claim is made.

### Nearby geographic references
Explore also queries Wikipedia's MediaWiki GeoSearch API for up to 12 geotagged article references within 10 km of each fixed catalogue centre. It records straight-line distance and links to the original page; it does not access the visitor's location. These are articles about nearby places, not verified attractions/businesses or walking routes. No entry fee, opening time or suitability is inferred. Added references initially use a zero/unconfirmed cost and a 60-minute placeholder; set real allowances before travel. Article links lead to contributor history/licence information; no article bodies or photos are copied. API documentation: https://www.mediawiki.org/wiki/API:Geosearch .

## Applying a retrieved flight quote
Each search result receives a private session-owned selection reference. Click **Use this flight in my budget** within 15 minutes. Choose whether the returned amount is treated as the whole group or per person; this is an explicit user assumption until the seller confirms it. Choose current reference USD/PKR conversion or enter your own rate. Reference FX must be available and non-stale; manual conversion remains labelled as your assumption.

The server checks the stored result, owner, route, dates and party size, then stores an immutable budget quote with provider amount, source timestamps, basis and conversion. Browser-supplied modifications to a selected quote are rejected by estimate/save/create endpoints. The flight line replaces the original sample fare; baggage/transfers/seller fees are not invented or marked included. Contingency is recalculated from the new subtotal.

Saved budgets retain this dated quote snapshot and its conversion rate. An older snapshot is not a fresh price or reservation. Changing route, dates, travellers or transport in the calculator removes the quote and returns to the sample transport assumption; search/select again for the new trip. You may also remove it explicitly. Keep existing cookies/accounts for private quote access; quote metadata cannot be copied to another session as a verified provider quote.

The Details step allows whole-trip PKR overrides for accommodation, taxes, food, local transport and activities. A blank field means Estimate; an entered zero means Your amount of zero. The hotel tax estimate remains 8% of an entered accommodation total unless overridden separately. These are user amounts, not verified supplier quotes. Budgets show Provider quote / Your amount / Estimate / Calculated per line. Local-currency and display-currency conversions remain their stated assumptions. The combined total is a mixed-source planning budget.

Additional checks: `npm run test:travel:quotes` runs against the local app and matching local database. It creates private, clearly named fictional quote fixtures, exercises expiry, ownership, tamper rejection and saved snapshots, then removes them. It makes no paid provider request. Set TRAVEL_TEST_DB_PATH if the local server uses a custom database path. Do not run acceptance tests against customer data.

## Venue discovery and events
See [DISCOVERY_SETUP.md](DISCOVERY_SETUP.md) for Google Places (reviews/photos/venue attributes) and Ticketmaster (dated events) setup. Both integrations require separate keys; neither is authenticated or represented as live connected before configuration. The local food/sightseeing guide works without those keys.
