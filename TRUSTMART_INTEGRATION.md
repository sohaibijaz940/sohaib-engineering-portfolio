# TrustMart is integrated

The portfolio project entry and its case-study call-to-action now point to the separate TrustMart app. CareIndex source and its runtime database were preserved. The nested app is excluded from the portfolio TypeScript compilation because it has its own Vite/React build.

1. Open a terminal in trustmart-app and follow README.md, or run scripts/start-demo.ps1 there.
2. Open a second terminal in the portfolio root and run npm run dev.
3. Open the portfolio and choose TrustMart -> Explore demo. The local target is http://localhost:8000.

The TrustMart backend must be running for its demo link to work. Public hosting is still pending. Set NEXT_PUBLIC_TRUSTMART_URL to the real hosted HTTPS URL before building a public portfolio.

The files replaced during integration were backed up under work/trustmart-backup-*/. No GitHub push was made.
