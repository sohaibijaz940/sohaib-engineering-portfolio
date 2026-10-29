# CareIndex — Final integrated release notes

**Scope:** completed local *software engineering portfolio demo* using fictional information. The project is deliberately not described as a clinically certified health-information system, a real payment service, or a publicly deployed application.

## What changed from V10

1. **Connected doctor workflow:** added a dedicated clinician workspace with a cinematic UI, scoped appointment lists, check-in state, and consultation completion. Completion stores one linked visit note in SQLite. Receptionist can check in but cannot complete a clinical visit. Clinicians see only the doctor queue assigned to their account, with backend checks on both reads and writes.
2. **Doctor assignments:** administrators can assign approved clinician accounts to active synthetic doctor profiles; stored in a new `doctor_assignments` table.
3. **Visit and booking integrity:** `booked_slots.checked_in_at` and `consultation_records` are migrated non-destructively. Completion requires check-in and can occur only once. Generic staff appointment updates cannot bypass the booked-slot billing and clinician workflow.
4. **Recruiter tour:** `/demos/careindex/tour/` is the main starting point. It introduces Patient, Doctor, Receptionist, and Engineering Lab journeys with clear descriptions of actual behavior.
5. **Optional one-click role demos:** isolated guest account sessions, explicitly opt-in **only** for synthetic-data mode. No public administrator session; demo sign-in has a bounded per-hour quota (not equivalent to infrastructural rate limiting).
6. **Navigation and case study:** accessible links across the patient, staff, and doctor workspaces; portfolio project card now describes the full-stack app honestly, with the original C++ GitHub repository separately identified.
7. **Testing:** new API integration tests validate RBAC, guest mode gate, clinician scoping, check-in, consultation, and uniqueness of linked visit records; new React SSR smoke tests validate page composition.

## Acceptance checklist for your Windows PC

- [ ] Run `npm run typecheck` and `npm run test:final`; both must succeed.
- [ ] Run `npm run build` to validate real Next.js production compilation (not validated here due unavailable Linux SWC).
- [ ] Visit `/demos/careindex/tour/` at laptop and mobile widths; check for visual overflow.
- [ ] Sign in as admin; preserve your existing SQLite patients, bookings, sessions and invoices after upgrading.
- [ ] Create an approved CLINICIAN staff account; assign it to doctor via Doctor Workspace.
- [ ] Patient creates a booking; staff and assigned doctor see the same reservation.
- [ ] Receptionist checks the booking in; clinician completes once with a fictional note.
- [ ] Patient record visit history shows the new visit; check-in and completion appear in engineering audit trace.
- [ ] Verify another clinician cannot access a different doctor via manually changed API requests.
- [ ] Patient pays with simulated checkout, prints invoice and verifies state after refresh.
- [ ] Demo guest mode works **only** when explicitly enabled with both flags; disable it again for private local use.
- [ ] Verify the Engineering Lab labels algorithms as executable exercises versus observed real query-plan/trace behavior.
- [ ] Test keyboard navigation, forms, empty/error states, and responsiveness in Edge/Chrome.
- [ ] Back up the synthetic database and perform a restore verification drill.

## Known remaining constraints

- **No real payments:** simulated payment and refund entries only; no payment gateway account or webhook has been connected.
- **No public deployment:** require a persistent server, TLS proxy, DNS, rate limiting and a synthetic-data reset policy.
- **No genuine patient records:** no clinical acceptance or external security/privacy audit is claimed.
- **No automated browser test on the target Windows device:** code-level and API-level tests have run; full browser QA and production Next.js build must be executed after installation.
- **Shared guest staff data:** multiple demo visitors using staff roles see the same *fictional* clinic dataset; patient guest profiles are separate. A public host needs periodic data reset and abuse safeguards.
- **Educational AVL:** the server constructs a teaching index on request; SQLite continues to own actual persistent record indexing and transaction enforcement.

## Files added/changed

- `src/app/api/careindex/doctor/route.ts`
- `src/app/api/careindex/demo/route.ts`
- `src/components/CareIndexDoctorWorkspace.tsx`, `src/components/CareIndexDemoTour.tsx`
- `src/app/demos/careindex/doctor/*`, `src/app/demos/careindex/tour/*`
- `src/server/careindex-db.ts`, `src/app/api/careindex/[resource]/route.ts`
- `src/components/CareIndexFullstack.tsx`, `src/components/CareIndexPatientPortal.tsx`
- `src/data/projects.ts`, `src/components/ProjectCaseStudy.tsx`, `src/components/PortfolioHome.tsx`
- `tests/careindex-final.test.mjs`, `tests/careindex-final-render.test.cjs`
- `README.md`, `compose.yaml`, `.env.example`, `package.json`
