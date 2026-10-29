export type Project = {
  slug: string; sequence: string; eyebrow: string; title: string; shortTitle: string;
  tagline: string; summary: string; status: string; statusDetail: string;
  year: string; disciplines: string[]; technologies: string[];
  challenge: string; approach: string; verified: string[]; next: string[];
  github: string; demoUrl?: string; accent: string; visual: "market" | "tree" | "travel" | "word";
  architecture: string[]; imageAlt: string;
};

export const projects: Project[] = [
  {
    slug: "trustmart", sequence: "01", eyebrow: "FULL-STACK ENGINEERING / PRODUCT DESIGN", title: "TrustMart.", shortTitle: "TrustMart",
    tagline: "Know the price. Know the supplier.",
    summary: "A market companion for Lahore electronics shoppers: transparent product records, comparable prices, QR supplier checks and auditable review workflows.",
    status: "Working source demo", statusDetail: "Separate React + TypeScript and Python/SQLite application based on the original 29-page SRS and MIT scanner prototype. Type checks, production builds and backend permission tests cover its core workflows. Public hosting and physical-camera acceptance testing remain release tasks. Shops and prices are fictional. The GitHub link preserves the original React coursework.",
    year: "2026", disciplines: ["Full-stack engineering", "UI/UX", "Databases"],
    technologies: ["React", "TypeScript", "Python / Flask", "SQLite", "QR camera scanner", "TOTP 2FA", "Role-based access"],
    challenge: "Buyers in physical electronics markets lack clear component prices and supplier accountability. TrustMart makes comparable prices and current verification records easier to inspect.",
    approach: "Preserved UC-1 authentication, UC-2 component pricing and UC-3 supplier validation. Added precise comparison groups, freshness filtering, trimmed means, persistent histories, supplier submissions and admin review.",
    verified: ["20 backend tests for permissions, authenticator login, QR lookup, pricing and review workflows", "TypeScript checks and optimized Vite production build", "Persistent relational database with fictional Lahore shop data, price histories and audit records", "Responsive customer, supplier and administrator interfaces"],
    next: ["Verify full browser and physical-camera journeys on Windows and mobile", "Deploy the Python application with persistent storage and HTTPS", "Set NEXT_PUBLIC_TRUSTMART_URL to the hosted demo URL"],
    github: "https://github.com/sohaibijaz940/trustmart-project", demoUrl: "/demos/trustmart/", accent: "#ad85ff", visual: "market",
    architecture: ["React / TypeScript PWA", "Flask role-scoped APIs", "SQLite / audit history", "Comparable trimmed-mean engine", "QR lookup / TOTP 2FA"],
    imageAlt: "Conceptual TrustMart illustration. Open the separate demo for the implemented interface."
  },
  {
    slug: "travel-cost-estimator", sequence: "02", eyebrow: "FULL-STACK ENGINEERING / INTERACTIVE PLANNING", title: "Travel Cost Estimator.", shortTitle: "Travel Estimator",
    tagline: "Go further. Know your budget.",
    summary: "A cinematic trip planner combining transparent budgets, live flight quotes, venue discovery and private group itineraries.",
    status: "Working local demo", statusDetail: "Next.js and TypeScript application with a separate persistent SQLite database. Includes eight destinations, licensed destination photography, a short coastal film, sample transport and accommodation calculations, traveller accounts, guest sessions and audited sample pricing edits. FlightAPI and Google Places integrations use private provider credentials and quotas. Sample costs remain labelled; source responses can omit photos or reviews. No bookings or payments. Public hosting is pending.",
    year: "2026", disciplines: ["Full-stack engineering", "Product design", "Relational databases"], technologies: ["Next.js", "TypeScript", "SQLite", "GSAP", "Responsive design"],
    challenge: "Travel planning combines dates, guests, transport, rooms, currencies and daily costs. Travellers need a clear total and a way to understand how each choice changes the budget.",
    approach: "Preserved the original MySQL coursework and its relational foundation. Added a deterministic shared calculation engine, secure session-owned plans, stored price snapshots, currency assumptions and a responsive cinematic interface. Sample costs are distinguished from live quotes.",
    verified: ["Eight curated destinations and 24 fictional accommodation listings with licensed imagery", "Transparent transport, room, daily spending, extras and contingency calculations", "Private guest and traveller sessions, saved estimate snapshots, comparisons and downloads", "Role-protected sample currency and accommodation price edits with an audit trail", "Automated calculation, validation and API permission checks"],
    next: ["Broaden provider coverage and review usage limits before public hosting", "Verify on physical mobile devices and additional browsers", "Deploy with persistent storage, HTTPS and production account controls"],
    github: "https://github.com/sohaibijaz940/dynamic-travel-cost-estimator", demoUrl: "/demos/travel/", accent: "#c9a578", visual: "travel",
    architecture: ["Cinematic Next.js interface", "Shared TypeScript calculation engine", "SQLite / private journey snapshots", "Session and role-scoped APIs", "Audited sample pricing"],
    imageAlt: "Travel Estimator planning concept; open the working demo for destination galleries and interactive estimates"
  },
  {
    slug: "patient-record-avl-tree", sequence: "03", eyebrow: "FULL-STACK ENGINEERING / ALGORITHMS", title: "CareIndex — Clinic OS.", shortTitle: "CareIndex",
    tagline: "A functional clinic platform that reveals its own engineering.",
    summary: "A cinematic full-stack clinic management demonstration: patient booking, clinician workflows, simulated billing, role-based access and an interactive algorithms lab.",
    status: "Final local demo release", statusDetail: "The downloadable CareIndex source is a separate Next.js + SQLite project built from the original C++ AVL coursework. Its public GitHub link preserves the original C++ implementation. The upgraded application has automated checks and a verified portfolio production build; public deployment is pending.",
    year: "2026", disciplines: ["Full-stack engineering", "Algorithms", "Databases"], technologies: ["Next.js", "TypeScript", "SQLite", "RBAC", "AVL trees"],
    challenge: "A clinic workflow involves distinct patient and staff roles, appointment contention, invoices, and educational algorithm demonstrations. Connecting them correctly matters more than isolated UI screens.",
    approach: "Built persistent SQLite APIs, role-based accounts, doctor slot transactions, patient ownership checks, invoice state tracking, doctor check-in and consultation history. The separate lab explains real API traces and executable algorithms without pretending a custom AVL tree replaces database indexing.",
    verified: ["Patient signup, private bookings, scheduling changes and simulated checkout", "Doctor-facing check-in and fictional consultation records with role-scoped APIs", "Transactional booking and invoice creation with duplicate-slot prevention", "Interactive AVL rotations, hash collisions, Trie lookup and real SQLite query plans", "Guided role journeys, audit replay, backup tooling and automated tests"],
    next: ["Complete the public-hosting acceptance checklist", "Deploy a persistent synthetic-only demo to a configured host", "Publish the separate upgraded CareIndex source repository with architecture documentation"],
    github: "https://github.com/sohaibijaz940/Patient-Record-AVL-Tree", demoUrl: "/demos/careindex/tour/", accent: "#badbc9", visual: "tree",
    architecture: ["Patient signup & session", "RBAC API & appointments", "SQLite booking / billing", "Doctor check-in & visits", "Engineering Learning Lab"],
    imageAlt: "Conceptual binary tree visual representing the original AVL coursework behind CareIndex"
  },
  {
    slug: "word-search", sequence: "04", eyebrow: "PROGRAMMING FOUNDATIONS / C++", title: "Word Search.", shortTitle: "Word Search",
    tagline: "A small game built on careful logic.",
    summary: "An original C++ puzzle refined into an interactive browser game with seeded puzzles, personal records and a visible search algorithm.",
    status: "Playable demo", statusDetail: "Browser edition with original boards, generated and daily puzzles, automatic resume and interactive algorithm exploration.",
    year: "2024", disciplines: ["Game logic", "C++ fundamentals"], technologies: ["TypeScript", "React", "C++ foundation", "Seeded generation"],
    challenge: "A word-search puzzle needs reliable input handling, direction-aware matching and persistent state without a graphical framework.",
    approach: "Built a 15×15 word grid with horizontal, vertical and diagonal search options that vary by difficulty, plus local high-score persistence.",
    verified: ["15×15 character grid and three difficulty modes", "Multi-directional case-insensitive word matching", "Original boards, seeded daily puzzles, automatic browser resume and personal records"],
    next: ["Additional vocabulary collections", "Shareable challenge links", "Optional verified online competitions"],
    github: "https://github.com/sohaibijaz940/wordsearchgame", demoUrl: "/demos/word-search/", accent: "#beb7ff", visual: "word",
    architecture: ["Original C++ / board files", "Seeded puzzle engine", "Pointer and keyboard selection", "Validated browser persistence", "Interactive algorithm trace"],
    imageAlt: "Illustrative word-search letter grid, not a screenshot of the console program"
  }
];
export function findProject(slug: string) { return projects.find(p => p.slug === slug); }
