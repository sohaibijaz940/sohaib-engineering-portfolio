# CareIndex V6.0 — Booking Engine + Engineering Walkthrough

## Implemented

- Dedicated **/demos/careindex/booking/** booking application with the existing cinematic dark/emerald look.
- Three fictional doctor profiles, fee labels, and weekday work schedules saved in SQLite.
- Half-hour appointment availability calculated from database reservations.
- Atomic `BEGIN IMMEDIATE` transaction plus partial unique SQLite index prevents duplicate **active** doctor/date/time reservations.
- Only logged-in, approved clinic staff with `appointments:write` may reserve or cancel; reads require existing approved accounts.
- On successful booking, the panel fetches actual sanitized trace stages using the request ID and existing audit API.
- Entry link on the main clinic dashboard.
- Four SQLite constraints tests (`npm run test:booking`).

## IMPORTANT limitations of THIS milestone

This is an increment, not a complete live clinic product. It currently **does not** include patient self-service registration/login, payment processing, invoices, doctor schedule administration, timezone-aware scheduling, or public deployment. Booking records are stored in the new `booked_slots` table, separate from legacy V5 `appointments`, so the V5 appointment counts and listing do not yet include V6 bookings. Reconciliation is part of the next integration milestone. The doctor profiles are fictional. No actual patient data should be entered. The booking lab is restricted to approved staff.

### Install into existing V5

1. Back up your current project folder and local `data/careindex.sqlite` before updating.
2. Stop `npm run dev`.
3. Extract the patch and copy its CONTENTS into your existing project root (containing package.json), merging folders and replacing matching files.
4. Run `npm run dev`. Login as an existing administrator, clinician, or receptionist.
5. Visit http://localhost:3000/demos/careindex/booking/ .
6. Try a future weekday and synthetic patient ID 10001. Booking the same slot again should be blocked. Check real traces in the right panel.
7. Run `npm run test:booking`, `npm run typecheck`, and `npm run build` on your Windows machine. Full Next.js typecheck/build was not verified here because npm package installation was unavailable.

### Why this architecture

SQLite's partial unique index acts as the final concurrency guard. In-memory availability checks alone cannot prevent two simultaneous requests from reserving the same time. The Algorithm & Backend Lab should explain the **actual** techniques used for each operation, not imply that AVL Tree is responsible for booking conflicts.
