# CareIndex — 5-minute recruiter walkthrough

Start at `/demos/careindex/tour/` after the administrator setup. The guided tour describes each role and offers one-click guest sessions if explicitly enabled for a synthetic-data host.

**Minute 1 — Customer:** enter Patient journey, explore doctor availability, reserve a half-hour consultation, view the confirmation and invoice. Try to reserve the same slot again from a different patient session: the database unique index rejects the conflict.

**Minute 2 — Financial lifecycle:** open Billing & Receipts in the patient portal. Simulate payment, inspect the generated printable invoice/receipt. Payment is a demo ledger state change, not a real processor charge.

**Minute 3 — Clinic team:** open the Staff journey. Browse the unified appointment register; the customer booking appears in the same persistent SQLite database. Note that view/edit controls are determined by roles enforced by the API.

**Minute 4 — Doctor:** enter the Doctor journey. Access the assigned doctor queue, check in an appointment, complete the consultation and add a fictional visit note. Replay the real sanitized API stages. If the assigned doctor differs from the patient's chosen doctor, use staff booking for the assigned doctor or have an admin adjust the assignment.

**Minute 5 — Engineering:** enter the Learning Lab. Type IDs `30, 10, 20` for AVL LR rotation, explore hash collisions and Trie autocomplete, inspect a real SQLite EXPLAIN plan, and replay your own backend request events.

## Honest project explanation

> I started with a C++ AVL Tree coursework project and expanded it into a full-stack React/Next.js clinic-management demonstration. It implements session login, server-side roles, SQLite-backed appointments, invoices, check-in and simulated billing. The Engineering Lab distinguishes actual server traces from executable algorithm exercises. Database indexing and transaction guarantees remain authoritative; the custom AVL is for illustrating data-structure decisions. All records are fictional, and this application is a software portfolio demo rather than a deployed clinical product.

## Roles in the demo

| Role | Key permitted action | Deliberate limit |
|---|---|---|
| PATIENT | Book, cancel, reschedule, access only own invoices | No other patients' records |
| RECEPTIONIST | Register fictional patient, book/check in appointments | Cannot complete consultations or manage staff |
| CLINICIAN | Assigned doctor queue, check-in and complete consultation | Cannot access another doctor's queue or manage staff |
| VIEWER | Read-only clinic operations, engineering lab | No mutations |
| ADMIN | Team, doctor assignments, schedules, synthetic billing refunds | Never offered by public guest launcher |

## Suggested portfolio media

- Hero: guided tour dark emerald page.
- One screenshot each: patient booking, doctor check-in queue, invoice and Engineering Lab.
- Architecture chart: browser → Next.js routes → RBAC → transactional SQLite → separate teaching AVL engine.
- Evidence: tests summary, API examples, schema and explicit limitations.

**Publishing note:** Public GitHub link in the initial portfolio project still points to the original C++ AVL coursework. Publish this source to a separate repository and update the portfolio link after final Windows QA.
