# Food, sights, events and group plans

## Available now
- Flight cards preserve the provider's full marketing and operating airline names, airline codes, flight numbers, airport labels, stops, duration and connection segments. Filter returned airlines, direct/one-stop connections, lowest supplied quote or shortest supplied duration. An absent airline is not proof it has no service; provider search coverage may be incomplete. No fake Emirates/Qatar quote is inserted.
- Food, sights & events is a dedicated workspace tab. The group-plan button opens private itinerary/participant/sharing tools. Add references to a chosen board/day and split recorded expenses in the existing ledger.
- Wikivoyage Eat/Drink/See/Do excerpts for supported destinations are fetched through the public MediaWiki API with source, author-history and CC BY-SA 4.0 links. The runtime database caches them for seven days. The provenance report records collection status/counts only. These are guide contributors' words; confirm menus, dietary claims, opening hours, prices and current rules independently.

## Google Maps venue reviews and photos: key required
The integration is prepared but authenticated data has **not** been tested without a key. It never fabricates ratings, reviews, venue photos or dish recommendations.

1. In your Google Cloud project, enable billing and **Places API (New)**. A Google OAuth login secret, Gemini key or FlightAPI key cannot substitute for a Maps Places key.
2. Create a separate server API key restricted to Places API (New). Configure appropriate server-IP restrictions for your deployment; browser-referrer restrictions do not fit a server-side request. Review current SKU prices before enabling access.
3. Set low provider quotas. Budget alerts alone do not stop charges. This app additionally limits searches to 10/day, details to 25/day and photo requests to 20/day across this local database, but these local guards are not a billing guarantee across deployments.
4. Put the key only in the private portfolio-root `.env.local`:

```dotenv
GOOGLE_PLACES_API_KEY=your_private_key
```

5. Restart the app. Open **Food, sights & events**, choose Restaurants / Cafés / Sightseeing and explicitly click Find venues. Details and photos each load only on request; nothing is automatically prefetched from Google.

Search returns at most 12 provider venues, with name/address, aggregate rating/review count, price level and source links. Sorting applies only to returned results, not every venue in a city. Details request provider-selected review excerpts, hours, phone, website and supplied group/reservation/vegetarian attributes. Unknown attributes remain unknown. Only a limited review selection is returned; no claim is made that these are verified customer reviews or a representative review sample.

The API does not reliably supply full restaurant menus or a verified best dish to order. Open the venue website/menu and local guide. Do not treat a dish mentioned in a review or a city-level food guide as confirmed at a particular restaurant.

Photo requests use fresh photo resources from place details and return a public provider image URI. Author attributions and original review/photo links are displayed when supplied. Google Maps content is visually separated and attributed. No Google ratings, reviews, photo names or photo bytes are persisted to SQLite/localStorage or included in the source ZIP. Place IDs/reference links may be saved to a private board; the board stores a generic visit label and unconfirmed cost, not copied Google review/photo content. The app's no-store API headers apply to responses.

Before public use, review the factual privacy/provider terms page at `/demos/travel/policies/` and your own provider obligations. Public hosting is still deferred.

Official documentation checked 29 October 2026:
- https://developers.google.com/maps/documentation/places/web-service/usage-and-billing
- https://developers.google.com/maps/documentation/places/web-service/place-photos
- https://developers.google.com/maps/documentation/places/web-service/policies

## Ticketmaster events: key required
The adapter is prepared but authenticated event retrieval has **not** been tested without a key.

1. Register through https://developer.ticketmaster.com/ and create a Discovery API application in your own account. Review its terms yourself.
2. Store its API/consumer key (not a secret pasted into chat) in `.env.local`:

```dotenv
TICKETMASTER_API_KEY=your_private_key
```

3. Restart the app and click **Find events for these dates**. It searches a 50 km radius around the fixed catalogue centre for the selected trip date range, then offers a day filter.

Coverage is provider-specific and is especially not guaranteed for Pakistan, every island or every daily local activity. No returned events does not mean no events exist. Event status, date/time/timezone, venue, supplied promotional image, available price ranges and source/ticket links are shown. Fees, availability and schedule changes require source confirmation. A saved event reference is not a ticket/reservation. The initial two-hour duration and zero/unconfirmed budget amount are placeholders to replace with confirmed details. Cancelled events cannot be added using the event card. No ticket purchase occurs.

Keys are used in server-only native HTTPS calls, not framework fetch logs or browser URLs. Raw provider errors/payloads are not echoed to the browser. The local safeguard allows 30 event searches/day across this app's database.

Official API documentation: https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/

## Group workflow
Create a board with participant names → collect venue/event/source references for a day → add your own confirmed reservations, timings and costs → invite a chosen collaborator as Viewer/Editor → record actual expenses and inspect settlement suggestions. No invitation messages or payments are sent automatically. Venue group-friendly flags are provider information, not confirmed capacity for your party.

## Checks
`npm run test:travel` includes airline-reference, place attribution/null handling, safe-link, event-status and geohash fixture tests. Provider fixtures are deliberately fictional, not demo reviews. The missing-key API paths are checked without sending paid requests. Real Google/Ticketmaster authentication and actual photo rendering remain pending configuration.

Flight quote display retains the cheapest twelve returned options plus the cheapest options introducing additional returned airline names, up to 36. This avoids hiding every higher-priced carrier just because budget carriers occupy the first twelve places. It still does not claim complete airline coverage. The airline filter and stop/duration filters apply to those retained provider results.

Event searches convert the selected destination-local start/end dates to UTC using the destination's IANA time zone, including seasonal offsets. Returned event time zones remain visible. This avoids treating local midnight as UTC midnight for cities such as Dubai or Rome.
