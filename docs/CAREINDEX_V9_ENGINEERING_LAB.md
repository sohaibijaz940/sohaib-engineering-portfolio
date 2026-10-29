# CareIndex V9 Technical Design — Engineering Learning Lab

## Principles
1. **Truthful provenance**: label measured/recorded server activity separately from runnable educational examples.
2. **Data minimization**: use synthetic integers and fictional names in interactive visualizers. Never render raw patient records or credentials in lessons.
3. **Restricted introspection**: `/api/careindex/engineering` uses the real session and returns only user-owned audit rows, hardcoded query plans, or permission evaluations. No arbitrary SQL, cross-account traces or broad account export.
4. **Testability**: pure learning algorithms in `src/lib/careindex-learning.ts` can be executed independently from Next.js. Their tests include real rotation cases, collision chains, Trie matching, interval boundaries and invalid input.
5. **Product integration**: links appear in staff Backend Explorer, staff sidebar, patient Engineering Lab tab, and patient sidebar. Original AVL visualizer remains unchanged.

## Execution modes
- `practice`: AVL (`PatientAVLIndex` from `careindex-index.ts`), hash-table chaining, Trie prefix matching, and interval overlaps. Steps derive from actual algorithm output, not screenshots or canned animations.
- `real-traces`: GET `?mode=traces`, 24 most recent events for current `user_id`; selected replay is from stored audit stage details/timing. Patient and staff see only their own events in this view.
- `real-plan`: GET `?mode=plan&query=doctor_slot|patient_id|linked_account`; runs SQLite `EXPLAIN QUERY PLAN` only for fixed safe statements with parameter arguments.
- `real-rbac`: GET `?mode=permissions`; invokes actual server `can()` logic. Patient record ownership is enforced by separate portal/billing/booking endpoint checks.

## Caveats for algorithm comparison
- AVL `O(log n)` applies **after** a balanced index has been built. Existing server AVL inspection reconstructs its tree from IDs per request, so the total request cost includes reading and inserting all keys.
- Hash-table modular hashing in the lesson illustrates chaining; production JS hash maps may use different algorithms and have different complexity in adversarial conditions.
- Trie prefix traversal is `O(L)` for prefix length `L`, **not** including collecting output suggestions. CareIndex currently uses database queries for its name search, not a Trie.
- Interval simulation supports arbitrary half-open time ranges, while current booking uses fixed half-hour slots and a database unique partial index. These are related scheduling concepts, not identical implementations.
- SQLite planner detail is an observed plan description, **not a claim that the app can visualize SQLite's private B-tree page contents**.

## Tests
`npm run test:learning && npm run test:engineering && npm run typecheck`
