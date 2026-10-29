# CareIndex V7 — Integrated Patient Portal & Booking

**Local full-stack portfolio demonstration, not a real healthcare service.** Use synthetic/fake identities, doctor profiles and medical data exclusively. Nothing is publicly deployed or live-charged.

## Implemented in V7

- `/demos/careindex/patient/`: redesigned cinematic patient portal with fictional doctor directory, clinic-local (PKT) schedule availability, reservation and own appointment history.
- Genuine account signup for role `PATIENT`, independent from the existing administrator/staff signup. Creates a **new** synthetic patient profile and one-to-one ownership link in a single SQLite transaction. A patient cannot link themself to one of the existing 420 demo records.
- Existing admin/clinician/receptionist/viewer workflows and accounts preserved, with role separation enforced in backend APIs. Pending staff users still cannot access clinic data. Patient logins reaching the clinic workspace are redirected to their separate workspace.
- Patient reservations use the **existing V6** `booked_slots` table, doctor hours, `BEGIN IMMEDIATE` transaction, and partial unique index. Patient-supplied patient ID is ignored; the real identity is resolved from the session's ownership link on the server.
- A patient can cancel or atomically reschedule their own upcoming booking. Another patient cannot act on that booking, even by calling the API directly.
- Staff appointment list, stats and patient details now also include the bookings from V6/V7. Legacy V5 appointments remain readable; legacy V5 create form is still separate from the constrained doctor-slot workflow. Prefer the Booking Engine or Patient Portal for slot-based bookings.
- **Engineering Lab** inside the patient portal: after booking/rescheduling/cancelling, retrieve a sanitized, real trace from the saved audit trail; walk steps with Previous/Next controls. Traces are visible only to their originating patient account.
- Database schema migration permits `PATIENT` without deleting previous users, sessions or patient records. Linked patient records cannot be deleted or bulk-replaced in the clinic until that link is properly managed. There is no self-service account deletion yet.
- TypeScript checked, ESLint checked for modified components/routes, original tests and new V7 real-route tests passed.

## Install patch on existing V6 (Windows)

1. **Stop** `npm run dev` (Ctrl+C). Close VS Code if it is holding DB locks.
2. **Back up your existing project folder**, especially `.env.local` and `data/careindex.sqlite` (and any `-wal` / `-shm` files if they exist). For a safe SQLite snapshot, stop the server before copying.
3. Extract `CareIndex_V7_Patient_Portal_Patch_for_V6.zip`. Copy **the contents** into your existing `sohaib_engineering_portfolio_v2` folder where `package.json` is visible. Merge directories and replace matching source files. **Do not** delete `node_modules`, `.env.local`, or `data`.
4. In your VS Code terminal, run `npm run typecheck`, `npm run test:portal`, `npm run test:migration`, then `npm run dev`.
5. Open `http://localhost:3000/demos/careindex/patient/`. If you are already logged in as Administrator, sign out or use an incognito window to create a fictional *patient* demo account.
6. Choose a weekday and an available doctor slot; confirm. Switch to **My appointments**, cancel or reschedule, then open **Engineering lab** for real request steps. Back in the staff workspace, the reservation appears in **Appointments**.
7. On your Windows PC, run `npm run build` when you're ready to verify compilation for release.

### Test commands

```powershell
npm run typecheck
npm run test:portal
npm run test:migration
npm run test:server
npm run test:booking
npm run test:careindex
npm run test:avl
npm run build
```

## Known limitations and roadmap

- **No real payments, invoices, billing, patient clinical use or production deployment.** The doctor fee is informational only. Public access requires additional hardening, including rate limiting, sensitive trace review, secure deployment and incident-response planning.
- This milestone is patient **self-service booking**, not patient access to real medical notes. Patient demo accounts intentionally cannot read the seeded clinician records.
- Password recovery/email verification, multi-tenant clinic boundaries, doctor schedule administration, recurring appointment schedules, timezone rules for different locations, email/SMS confirmations, no-show controls, consent and clinical compliance work are still unimplemented.
- Backend Explorer demonstrates actual sanitized server stages, not source-level debugging or a live SQL visualizer. Advanced AVL/Trie/Heap interactive algorithm modules are future work; the original AVL demo remains available.
- Local SQLite remains the authoritative DB. Deployed, real-multiuser hosting is **not** delivered in V7.
- This environment lacks a compatible Linux Next.js SWC binary and cannot reach npm registry; the complete Next.js production build wasn't verified here. TypeScript and API tests succeeded; run the build on your Windows PC.

### Important security note

Never enter real patient records, card numbers, genuine health information, or private customer information into this prototype. Use fictitious names and `example.test` addresses. A fictional patient portal is not evidence of real clinical privacy compliance.
