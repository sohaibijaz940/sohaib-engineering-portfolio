# Sohaib Ijaz — Engineering Portfolio V2

A technical-first, responsive portfolio for a BS Computer Science student interested in machine learning and full-stack software development. The site has a distinctive editorial engineering design, theme switching, project filtering, technical case studies, a proposed-system walkthrough, engineering notes, and a contact email composer.

The visual direction draws **general information-architecture inspiration** from Abdul Rahman Azam's project-driven portfolio and Faizan Tariq's case studies, technical sections and interactive explanations. It does not copy either website's layout, source, content, or artwork.

## Run on Windows (PowerShell)

**Important: the ZIP places `package.json` at the top level.** Extract its contents into a fresh folder (for example, `Downloads\sohaib-portfolio-v2`) and open that folder in VS Code. Do not run commands from a parent folder.

```powershell
cd "$HOME\Downloads\sohaib-portfolio-v2"
dir package.json
npm install
npm run dev
```

Browse to **http://localhost:3000**. Use `Ctrl+0` in the browser if your zoom is not at 100%.

If PowerShell says `package.json` does not exist, use `Get-ChildItem -Recurse -Filter package.json` and open the folder containing it.

## Commands

```bash
npm run dev       # local development
npm run build     # production build / static export to out/
npm run typecheck # TypeScript check
npm run test:avl  # AVL engine unit + stress tests
npm run lint      # ESLint / Next lint
python qa/verify_source.py # content and route audit
```

Stack: Next.js 15 + React 19 + TypeScript + Tailwind CSS + GSAP ScrollTrigger + Lucide icons. Uses `output: 'export'` in `next.config.ts`, which is appropriate for static hosting, including Cloudflare Pages. **No backend/database/AI inference is included** in this website milestone.

## Pages and features

- `/demos/avl-tree/` — fully interactive browser AVL Tree Lab; insert, delete, search, four rotation presets and trace playback. See [`docs/AVL_TREE_LAB.md`](docs/AVL_TREE_LAB.md) for full behavior, controls, and tests.

- `/` technical-first homepage: compact engineering introduction, immediate projects, Parkistan, interactive proposed workflow, tools, academic journey, About, notes, contact.
- `/projects/{slug}/` four verified source-based case studies (TrustMart, Travel Estimator, AVL Tree, Word Search).
- `/notes/` two short original engineering notes, with detailed routes.
- Dark/light toggle (saved in `localStorage`; defaults to OS theme).
- Category filters and search on real existing repositories.
- Keyboard-friendly links and buttons, semantic headings, skip link, reduced-motion support.
- Contact form opens an email draft via `mailto:`—it does **not** transmit data to a website backend.
- Public résumé under `public/Sohaib_Ijaz_Public_Resume.pdf` omits the personal phone number and labels Parkistan as an ongoing project.

## What is implemented vs planned

The four case studies describe **existing source** and distinguish proposed improvements. They do not assert that unfinished backends, training runs, live demos, or deployed production systems exist. Parkistan is explicitly called **Ongoing Project** and is currently at the **documentation / architectural planning stage**. Its citizen/warden/admin flow, macro GPS geofencing, payment simulation, YOLOv11, PaddleOCR, MongoDB GeoJSON, and controlled pilot are **proposed** system elements; no live AI results or performance metrics are claimed.

Milestone 3 now adds a live AVL Tree Lab at `/demos/avl-tree/` with step playback and algorithm tests. Other demos remain in the roadmap: Word Search, TrustMart, a trained/evaluated travel ML application, then verified Parkistan functionality as it is built. No external repositories were modified.

## Where to edit content

- `src/data/projects.ts` — verified project metadata, case studies, and GitHub links.
- `src/data/notes.ts` — technical articles and their sections.
- `src/components/PortfolioHome.tsx` — homepage content, Parkistan proposed flow, technology tabs, contact form.
- `src/components/ProjectCaseStudy.tsx` — case study page structure.
- `src/components/SiteChrome.tsx` — navigation and theme control.
- `src/app/globals.css` — colors, type, layout, and responsive styles.
- `src/app/layout.tsx` — social/SEO metadata.

## Static deployment (when you approve publishing)

Set `NEXT_PUBLIC_SITE_URL` to your actual future URL before production building for correct sitemap/social metadata. Run `npm run build` and deploy the generated `out/` directory to a static host. No domain, GitHub repository, or public deployment has been created by this package.

## Testing limitations

Source TS/TSX parsing, static layout inspection at desktop/mobile widths, content checks, and a public résumé rendering check were completed in the authoring environment. Access to the npm registry is blocked there, so dependencies could not be installed and a real Next.js build or GSAP/React runtime interaction test **has not been completed**. Run `npm install`, `npm run typecheck`, and `npm run build` locally, and test the theme/filter/form controls in the real browser before publishing.
