# Cinematic portfolio - review record

Active source: D:/Downloads/sohaib_engineering_portfolio_v2
Local preview: http://localhost:3001/

## What changed

- New ink/ivory/electric-lime design, oversized typography and an original 12-second silent project film.
- GSAP scroll reveals, parallax, a desktop pinned horizontal project rail with direct navigation and snapping, plus a vertical mobile/reduced-motion layout.
- Four actual application screenshots with lightweight animated interface compositions and working launch/case-study links. The previews do not load entire applications or make provider requests.
- Nine real certificate documents, readable enlarged previews, Training/Recognition filters and verified issuer destinations for GenAI and Python.
- Updated one-page public resume. Source-grounded case studies and notes replace outdated prototype/roadmap claims.
- Removed unused legacy concept-card and glowing-cursor components, archived old release notes and the previous resume/layout.
- Removed 424,577,731 bytes of obsolete generated files. C-drive source/private settings are retained as a recovery copy; ongoing work belongs on D.

## Verification

- Production build and TypeScript checks passed; final build emitted no lint warnings.
- 94 existing project tests passed: Travel 36, Word Search 5, AVL 5, CareIndex 7, TrustMart backend 41.
- All 41 checked local page/document/media routes responded successfully.
- Browser checks covered desktop horizontal navigation, preview controls, certificate lightbox/filtering, mobile menu and section navigation, no mobile horizontal overflow, hero playback and offscreen pause, and production rendering.
- Certificate issuer pages were opened. GenAI matched credential db94a4fd8cfe3bd4 and Top Performer. Udemy matched Sohaib and the Python course. May 2026 is shown because the scan and live issuer page differ by one calendar day.
- Resume was rendered and visually inspected; it is one page with working hyperlink annotations.

## Before public launch

1. Choose hosting and the public domain. Domain registration alone does not host the application.
2. Host the Next.js application on a Node 24-compatible service with persistent SQLite storage, or deliberately migrate the database. Docker setup uses the standalone build.
3. Host TrustMart as its separate Flask service with HTTPS and persistent storage. Set NEXT_PUBLIC_TRUSTMART_URL to its public URL and rebuild the portfolio. Do not use localhost for a public demo address.
4. Configure the public site URL, Google OAuth callback/origin settings and private provider keys on the server. Never publish local environment files or databases.
5. Review FlightAPI/Places/Gemini/event-provider quotas, billing and coverage. No extra provider purchases or accounts were made during this redesign.
6. Perform final acceptance on physical mobile devices, including TrustMart camera permission/scan flows and reduced-motion preferences. Existing missing provider fields (such as some restaurant photos) remain explicit service limitations.
7. Keep CareIndex synthetic-only and preserve its account/role restrictions. No clinical deployment, payments or real patient data are implied.

Nothing was publicly deployed or pushed to the original GitHub repositories.
