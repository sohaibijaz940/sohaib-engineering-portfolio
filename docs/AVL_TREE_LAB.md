# Milestone 3 — AVL Tree Lab

## What changed

The original visual-study AVL card now links to a functional demo at `/demos/avl-tree/`. The same link appears in the AVL project case study. The other case studies are unchanged and continue to identify non-deployed work honestly.

- Tree operations: insert, delete, search; unique synthetic IDs 1–999; capacity 31 nodes for readability.
- Traced execution: visited nodes, insertion/deletion, single/double LL/RR/LR/RL rotations, success and error states.
- Interactive playback: play/pause, previous/next, first/last, speed selector, highlighted visited nodes and interim unbalanced states.
- Visual information: current balance factor by node; in-order, pre-order, post-order traversals; minimum, maximum, height and node count.
- Examples: four deterministic rotation presets, seeded starter tree, random tree, clear and reset.
- No server, account, patient data, local storage or browser API used by the algorithm engine.
- Original C++ repository remains unchanged; the demo is a TypeScript adaptation of its AVL algorithms, not a WASM build of the original executable.

## Run locally (Windows PowerShell)

1. Extract ZIP to a new directory. In the directory with `package.json`, run `npm install` **once** (for a new copy).
2. Run `npm run dev` to start the website.
3. Open `http://localhost:3000/demos/avl-tree/`.
4. On the homepage, open the AVL card and select **Launch live demo**; on its case study, select **Launch live visualizer**.

For subsequent sessions in the same directory, **only `npm run dev`** is required. If you're already using the previous V2, the companion patch ZIP can be copied into its root without reinstalling npm packages; no dependencies were added.

## Test

- `npm run typecheck` — TypeScript project type check
- `npm run test:avl` — pure algorithm tests for all rotation cases, deletion, duplicates, edge cases and 5,200 deterministic mixed operations
- `npm run build` — production Next.js static export (`out/` folder)

## How to showcase it

The demo contains no real clinical data. Mention that the algorithm is a **browser reimplementation** inspired by your existing C++ course project. For technical interviews, demonstrate the LL/RR/LR/RL preset cases, step through insert/delete, and explain the balance-factor and height invariant. The C++ source is still available using the **Original C++** link.

## What was verified here

The pure algorithm test suite and TypeScript typecheck passed. Full Next.js build could not complete in this authoring container because the supplied `node_modules` are Windows-oriented and the npm registry is unreachable to fetch Next.js's Linux SWC binary. This is an environment constraint, **not a passed browser runtime test**. Run `npm run build` on your own Windows machine to verify deployment readiness, then open the demo in the actual browser before publication.
