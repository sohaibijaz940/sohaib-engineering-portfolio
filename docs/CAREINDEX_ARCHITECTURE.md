# CareIndex V4 — product demo architecture

## What it actually is

An **interactive, browser-only, synthetic clinic operations portfolio demo**. It is **not** an EHR product appropriate for real patient data and has no authentication, server persistence, audit-proof logging, legal compliance certification or clinical decision support. The project began as a C++ Patient Record AVL Tree exercise and grew into a separate TypeScript application.

## Technology

- Next.js route: `/demos/careindex/` with a scoped cinematic dark CSS design.
- `src/components/CareIndexApp.tsx`: dashboard, directory, patient details, appointments, visit history, AVL lab and data-import screens.
- `src/lib/careindex-index.ts`: independent, validated AVL integer-key index with search comparison traces, insert/delete, cached heights and rotations; no UI limit of 31 entries.
- `src/lib/careindex-data.ts`: deterministic **fictional** demo generator; CSV parsing and optional official Synthea sample importer; storage helpers.
- Browser `localStorage` persists changes on the **same device/browser**. Clearing browser data removes them. Server-side access, collaboration and clinic-scale concurrency do not exist.

## Real product interactions

1. Browse 420 pre-generated fictional profiles; search by name or ID; view a profile.
2. Register, edit, archive, restore or permanently remove a synthetic profile.
3. Schedule a simulated appointment, complete/cancel it, and review it in the schedule and patient timeline.
4. Add a simulated visit note, view conditions and medications supplied by demo data.
5. Search an exact numeric active patient ID using the **AVL tree**; inspect its real comparison path, size, height, current rebuild-rotation count and BST/balance invariants.
6. Import official Synthea-generated CSV exports (patients.csv + optional encounters.csv/conditions.csv/medications.csv). Limit: at most 1,000 synthetic patients; optional supplemental rows capped to keep the browser responsive. Import replaces the prior local data; it is not a cloud upload.
7. Export **synthetic** data JSON and reset the sandbox. Data is never sent to a backend.

## How the index is used

The array of active profiles is stored in React state and persisted in the browser. An AVL tree is rebuilt from the **active numeric patient IDs** when that state changes. Direct exact-ID searches run through the actual AVL tree and expose the traversal/comparison trace. Name and condition searches use ordinary filtering—these are intentionally not described as AVL-accelerated searches. In a real system PostgreSQL or another database would maintain the authoritative B-tree/hash indexes. This AVL is a purposeful educational implementation, not a recommendation to replace a database index.

## Dataset provenance

- The included 420 patients are generated **locally with deterministic pseudorandom data** by CareIndex; **they are not Synthea records**. They do not contain real people's health information.
- The importer reads **user-provided official Synthea CSV exports** from the browser's file picker; archives are not included because downloads were inaccessible in this environment.
- Official samples: https://synthetichealth.github.io/downloads.html
- Citation: Walonoski et al., "Synthea: An approach, method, and software mechanism for generating synthetic patients and the synthetic electronic health care record", JAMIA 25(3), 2018, https://doi.org/10.1093/jamia/ocx079
- **Never upload or enter actual patient data into this public demo.**

## Testing

`npm run typecheck`

`npm run test:careindex` (7 test groups: 420 fictional patients, 1,000 ordered IDs, 4,200 mixed AVL mutations, CSV quoting/multiline, multi-file Synthea linking, importer rejection and patient registration)

`npm run test:avl` (original AVL Lab test suite)

`npm run build` (requires Next.js native SWC compiler downloaded to your development computer; cannot run here because registry access is blocked)

## What a real clinic would require

- Discovery with clinic staff: appointment rules, multi-doctor scheduling, custom fields, workflows, reporting, data retention policies.
- Secure backend and relational storage (transactional persistence, migrations, concurrency, backups, disaster recovery).
- Identity verification, least-privilege staff roles, session controls, audit events, log integrity, secure secrets and key management.
- Strong input validation, security testing, encryption as appropriate, TLS, consent/legal review, imports and data migration.
- Interoperability requirements (e.g., FHIR where applicable), accessibility, mobile QA, error handling and monitoring.
- Proper medical/clinical review; this UI is **not for diagnosis or treatment**.

A real clinic's requirements are not solved by downloading a patient CSV and deploying this browser-only version.
