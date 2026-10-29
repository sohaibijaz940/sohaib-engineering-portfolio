# CareIndex V8 — Billing, Invoicing & Simulated Checkout

A **real SQLite-backed billing workflow** attached to the existing V7 appointments, with synthetic-only financial events. **No real payment gateway and no real charges.**

## Install into your existing V7 Windows folder

1. Stop the running `npm run dev` process.
2. **Back up `data/` (the SQLite database), `.env.local`, and the project folder.** Do not share `.env.local` publicly.
3. Extract `CareIndex_V8_Billing_Patch_for_V7.zip` somewhere outside the project. Copy the **contents** of its top folder into the existing `sohaib_engineering_portfolio_v2` folder where `package.json` resides; merge/replace matching source files. **Do not delete** `src`, `node_modules`, `.env.local`, or `data/`.
4. No dependency changes were made. Run `npm run typecheck` and `npm run test:billing`, then `npm run dev`.
5. Open the patient portal at `http://localhost:3000/demos/careindex/patient/` and the staff workspace at `http://localhost:3000/demos/careindex/`.
6. On first database access the local app **adds** `invoices` and `billing_events` tables and creates one `OPEN` or `VOID` invoice for every existing V6/V7 doctor booking missing an invoice. Existing users, sessions, bookings and records are preserved. Invoice migration is idempotent.

## Patient journey

1. Sign into a fictional patient account in an incognito window.
2. Book a fictional doctor consultation. It creates one invoice **inside the same database transaction** as the booked slot.
3. Open **Billing & receipts** from the patient sidebar. See invoice number, immutable invoice ID, consultation fee snapshot, booking time and invoice status.
4. Choose **Simulate payment** on an `OPEN` invoice. There is **no card form** and no external charge. A unique `PAYMENT_DEMO` ledger event is written. Repeated requests cannot create a second event.
5. Choose **View receipt** to open a protected, printable receipt. Use your browser's **Print / Save as PDF**. It is unmistakably labeled fictional/demo-only.
6. Cancel a scheduled appointment: unpaid invoices become `VOID`; already-simulated-paid invoices become `REFUND_DUE`.
7. As administrator, open **Billing & invoices** in the staff workspace and select **Simulate refund** on `REFUND_DUE`. This records one synthetic refund event and marks the invoice `REFUNDED_DEMO`.
8. Open the patient **Engineering Lab** to inspect the sanitized real billing trace from the last checkout and use the Previous / Next controls.

## Architectural properties

- SQLite is the authoritative state. Patient ownership checks are done **server-side**, joining patient accounts to the booked patient ID.
- Billing amounts are read **only from database doctor fees**, never user-supplied amount fields.
- Invoice issuance is committed atomically with appointment booking; cancellation and rescheduling update billing atomically.
- A unique `booking_id` on invoices enforces one invoice per booking. A unique `(invoice_id,kind)` on payment ledger entries enforces a single synthetic payment and refund event.
- Financial state transitions use `BEGIN IMMEDIATE` and server-side role / CSRF checks.
- Changing a paid invoice to a doctor with a different fee is rejected rather than silently altering amounts.
- Public traces do **not** include card details, tokens or invoice/customer PII. Staff's existing broader audit stream still needs privacy hardening before a public release.
- Original V5 `appointments` (legacy appointment table with no doctor/fee association) do **not** create invoices. Only V6/V7 `booked_slots` with attached doctor fees are invoiced. This limitation should be resolved when all appointment workflows are unified.

## Tests and known limitations

- `npm run test:billing`: 9 V8 integration test groups run against SQLite and server request handlers, covering migration, invoice creation, ownership, CSRF, idempotent checkout, paid/unpaid cancellations, refunds and fee changes.
- `npm run test:portal`, `npm run test:booking`, `npm run test:server`: previous suites should also be re-run on your PC.
- `npm run typecheck && npm run build`: **not executed successfully in the authoring environment due to absent Next.js dependencies / platform compiler; verify on your Windows machine**.
- V8 **does not integrate an actual payment provider** and does not accept bank or card information. The UI displays **"Paid · simulation"**, never actual financial settlement.
- No production-grade security, backup, tax, invoice compliance, legal certification or real patient data support. Do not deploy the code unchanged for an actual clinic.
- Refunds are **simulated state transitions**, not transfers to a payer. Invoice line items are single consultation fees; taxes, discounts, coupons, partial refunds, payouts and multi-clinic features are not included.
- The live public recruiter experience and payment-provider sandbox integration are future milestones.
