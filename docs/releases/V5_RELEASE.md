# V5 CareIndex local full-stack release

**The main portfolio URL remains `/`, and CareIndex V5 is `/demos/careindex/`.**
The old V4 browser sandbox is `/demos/careindex/sandbox/`; AVL rotations are at `/demos/avl-tree/`.

## Upgrade from V4 (zip patch)

1. **Back up your main portfolio folder.** Stop the old Next.js dev server (`Ctrl+C`).
2. Extract `CareIndex_V5_Fullstack_Patch_for_V4.zip` to a temporary location.
3. Copy **everything inside the extracted patch folder** and paste it into the root of your existing `sohaib_engineering_portfolio_v2` folder, the one with `package.json`; merge folders and replace matching files. Do **not** copy into `src` or `node_modules`.
4. Verify Node is v22.13+ (`node --version`); Node 24 LTS recommended.
5. Run `npm run setup:careindex`, copy the printed private admin setup secret, then run `npm run dev` (if a dev server was running, restart it after generating `.env.local`).
6. Visit `http://localhost:3000/demos/careindex/`, create the first ADMIN account with the setup secret, then test CRUD, staff roles and backend explorer.
7. Run `npm run typecheck`, `npm run test:server`, and `npm run build` locally.

**Important deployment change:** V4 was static-exportable. V5 has actual API routes and SQLite, so it requires a persistent Node server. Don't deploy this V5 project as a static website or to an ephemeral read-only serverless host. For a public portfolio without a live server, use the older browser-only sandbox separately.

**This is a working local full-stack demonstration, not a certified clinic management system. Use only fictional or officially synthetic records.**

Detailed explanation and permissions: `docs/CAREINDEX_V5_FULLSTACK.md`.
