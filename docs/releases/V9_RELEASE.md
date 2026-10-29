# CareIndex V9 — Interactive Algorithm & Backend Engineering Lab

An additive upgrade for the existing V8 clinic + patient + billing application. **Fictional / synthetic data only. Not medical software.**

## Installation (Windows / VS Code)

1. Stop `npm run dev`. Back up the project folder, **`data/` and `.env.local`** before merging any patch.
2. Extract **CareIndex_V9_Engineering_Lab_Patch_for_V8.zip** outside the project directory.
3. Open the extracted patch folder. Copy **its contents**, not the top-level folder.
4. Paste into the root of your existing `sohaib_engineering_portfolio_v2` project (where `package.json` is located). Merge folders / replace matching **source** files.
5. Keep your existing `node_modules/`, `.env.local`, and `data/` intact. **No database migration or dependency installation is required** for the patch.
6. In your VS Code terminal run:
   ```powershell
   npm run typecheck
   npm run test:learning
   npm run test:engineering
   npm run dev
   ```
7. Open **http://localhost:3000/demos/careindex/engineering/**. You will also find an entry from the clinic's **Backend Explorer**, in the staff sidebar, and the patient portal's **Engineering Lab** tab.

## What is implemented

| Module | Execution source | What is actually shown |
|---|---|---|
| AVL Tree | **Original `PatientAVLIndex` engine** (practice mode) | Insert sequences, height-balancing, *genuinely classified* LL/RR/LR/RL rotations, search paths, node comparisons, pseudocode, replay with editable synthetic IDs |
| Hash Table | **Executable teaching implementation** | Deterministic modular hash, bucket selection, separate chaining collision handling, search trace |
| Trie | **Executable teaching implementation** | Build a prefix tree from fictional names, trace character-by-character lookup, matching suggestions |
| Time Interval Conflicts | **Executable teaching implementation** | Stepwise overlap detection with half-open intervals and atomicity explanation. The real V6/V7 slot booking is enforced by a separate SQLite uniqueness constraint; do not confuse the interval simulation with that code. |
| SQLite Query Plans | **Real SQLite `EXPLAIN QUERY PLAN`** | Fixed parameterized statements for patient ID, scheduled doctor slot, and account ownership; the database's selected search/index plan |
| Request Replay | **Real, persisted server audit steps** | Only the currently signed-in account's recent request stages, outcomes and recorded relative timing. Server-side ownership checks. |
| RBAC | **Real server `can(role,perm)`** | Actual permission decisions for the signed-in account; patient self-service also has record ownership checks. |

### Real execution vs practice mode

The sidebar and teaching cards explicitly mark **code-connected**, **live database**, **real events**, **live API**, or **practice model**. Hash, Trie, and interval demonstrations are genuine executable educational algorithms, **not a claim that CareIndex's current production booking route uses them**. The AVL practice module calls the same AVL engine used in CareIndex's server-side ID index demonstration; it uses synthetic IDs, not actual patient data.

The **Request Replay** API is read-only, requires a valid approved user session, selects audit entries with `WHERE user_id=?`, returns no actor/email columns, and masks emails and opaque long hex IDs in recorded stage text. It does not return medical records, passwords or tokens. The **Query Planner** endpoint only accepts three predefined parameterized read-only statements—there is no free-form SQL execution.

## How to demonstrate to a recruiter

1. Sign into CareIndex as your fictitious clinic administrator or patient account and register a synthetic patient, book a slot, or simulate checkout.
2. Enter the Engineering Lab, choose **Request Replay**, click **Refresh**, and step through one of your own recorded operations.
3. Choose **SQLite Query Plans → Doctor booking uniqueness** and inspect the actual index chosen by SQLite.
4. Choose **AVL Tree**, enter `30, 10, 20` and search `20`. The engine identifies the **LR rotation**, and you can step through the insertion/search sequence.
5. Choose **Hash Table**, enter `7, 14, 21, 3` and search `21` to see collisions in bucket 0.
6. Try **Trie Prefix Search** (`al`) and **Slot Conflicts** (`09:30`–`10:00`).
7. Check the **Permissions** view under different roles; a patient account has different staff permissions than an administrator.

## Verification status

- `npm run typecheck`: **passed** (project-wide).
- Changed V9 files: **ESLint passed**.
- `npm run test:learning`: **6 passed**.
- `npm run test:engineering`: **6 passed** (auth checks, data isolation, parameterized plans, permission results).
- Existing test suites: server 9, booking 4, portal 7, billing 9, migration 1, AVL 5, CareIndex logic 7 — **42 passed**.
- Total: **54 passing automated test cases**.
- V9 component server-rendered successfully in Node/React (HTML smoke test).
- **Not verified:** full Next.js production build and actual interactive browser layout on Windows; authoring environment has only Windows Next.js SWC and cannot run its Linux compiler. Run `npm run build` locally.

## Security and production limitations

- Educational, local-only, synthetic clinic app. **Do not import real medical information**.
- Existing V8 admin Backend Explorer still has broader audit visibility and actor email display. The new V9 read-only route improves privacy for its own trace output but **does not remediate every V8 privacy issue**.
- A full publicly deployed version still needs auth hardening, infrastructure, backup and recovery, deployment-specific legal/security review, accessibility testing and reliable monitoring.
- Checkout and refund remain **simulated**. No payments are transferred.
- No new database schema or destructive migration in V9. Existing data is preserved by design, but back up local files before merging upgrades.
