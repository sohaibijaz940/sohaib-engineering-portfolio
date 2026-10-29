# Expanded travel workspace

Open **Open travel workspace** above the film. Eight tools complement the original cinematic calculator:

1. **Budget finder** enumerates the curated destinations, room capacities and one-to-fourteen-night range. It returns the longest affordable sample option per destination, or a clearly labelled shortfall. Totals use the shared full-cost engine including contingency. Visa/insurance still require user input.
2. **Explore & nearby** offers 32 curated activity/dining-style ideas. Add them to a board, read attributed destination introductions and see current near-term weather. Nearby Wikipedia geographic article references show straight-line distances from the fixed destination centre, with source links. They are not verified attraction/business inventory or walking routes.
3. **Flights & dates** compares three sample fare scenarios with baggage/transfer allowances, seven illustrative date alternatives and private manually refreshed sample watches. Optional FlightAPI live integration needs your credentials and active quota. Google Flights opens as an external search. No live airline claim, notification scheduler or booking.
4. **Offer transparency** stores user-entered offers, known mandatory/optional charges, unknown-cost flags, source URLs and unverified perk conditions. Prices are not automatically scraped or supplier-verified.
5. **Itinerary & sharing** persists daily stops, duration/cost allowances, busy-day warnings, notes and checklists. Create a private board with named expense participants. Owner-created one-use invites last 24 hours; explicitly accept as Viewer or Editor. Only owners invite/revoke collaborators. Tokens are hashed in the database. Copy/send invitations yourself; no messages are sent.
6. **Expenses & splits** tracks actual paid amounts, payer and selected participants. Converts using an explicitly entered PKR/unit rate and stores the original amount/currency/rate note. Protects reserve and still-to-pay commitments separately. Integer settlement suggestions conserve every rupee; no payment is made. The per-day figure uses all planned days, not elapsed-day forecasting. Update commitments after paying them to avoid double-counting.
7. **Honeymoon planning** compares both partners' priorities and three transparent sample room/duration trade-offs. Leisure hours are an explicitly fixed assumption, not real flight-derived arrival schedules. Privacy, benefits and eligibility need supplier confirmation.
8. **Data & model lab** shows sources, fetch statuses/timestamps, licences and the honest untrained-model status. Reference currency conversion is applied only on request.

Guest data belongs to the current seven-day cookie. Register/sign in before creating boards you want owned by an account; automatic guest merging is not implemented. Existing account/recovery limitations in README still apply. A shared board remains owned by its creator; do not use a disposable guest session for important group plans.

## Demo route
Budget finder → set PKR 500,000 → Find plans → inspect affordable/shortfall cards. Create a private board → add an Explore stop → add a paid expense → inspect settlement. Add two user-entered offers, one with unknown charges. Fetch public guide/weather data. Try FlightAPI with no keys to see its honest setup response. Review partner priorities.

## Verification
`npm run test:travel` covers the original engine plus budget matching, date grids, settlement and reserve arithmetic. `npm run test:travel:workspace` targets a running local demo and covers private ownership, viewer/editor permissions, one-use/revoked invites, input/link validation, private offers/watches and missing provider keys. `npm run test:travel:api` covers original authentication/pricing/snapshot behaviours. Never run acceptance tests against real customer data.

## Remaining scope
This is a portfolio demonstration, not commercial platform parity. No real booking/payment, provider hotel inventory, genuine review corpus, automatic discounts, exhaustive nearby inventory, live alert scheduler, maps routing, trained ML or verified visa/safety guidance. It preserves the original coursework and cinematic presentation while demonstrating useful persisted planning flows.

## Selected flight and entered-cost budgets
Flights & dates → Search live flight prices → choose amount basis and conversion → Use this flight in my budget. The calculator now uses the selected provider fare and recalculates its total/contingency. Its source and retrieval time remain visible. Details → Replace estimates with your own whole-trip costs accepts accommodation/tax/food/local/activity PKR totals. Costs are individually marked Provider quote, Your amount, Estimate or Calculated. The total is not labelled fully live. Saving and downloading retain the source details. Quote selection checks route/date/party/owner and rejects search results older than 15 minutes; saved quote snapshots remain dated historical amounts.
