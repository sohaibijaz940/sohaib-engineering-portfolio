# Source reconciliation and modernization

## Materials inspected

- Original SRS: TrustMart_SRS_Part1_2_4_5_6_7.pdf, 29 pages. All page text extracted and read, including scope (p9), operating constraints (p13), UC-1/2/3 (p15-17), decision table (p18), NFRs (p19-20), other requirements (p21), schema and pattern descriptions (p22-29).
- Original MIT archive: TrustMart (1).aia. Six screen block files and screen declarations inspected. BarcodeScanner compares its result against literal Shop804 and displays Ali Electronics. TinyDB holds local accounts/profile data; Google login explicitly says demo mode. Price UI uses hardcoded whole-phone values such as IPHONE 13 / PKR 150,000 and S21 / PKR 120,000. Shop directories and status lists are hardcoded. Those prices are not promoted into component market data.
- Uploaded React ZIP: inspected application/components/pages excluding dependency packages. Routed Home, About, Registration, Contact; registration is a frontend simulation, contact uses JSONPlaceholder. No genuine component-price backend or camera implementation was found in these pages.
- GitHub read-only: https://github.com/sohaibijaz940/trustmart-project, tree main inspected at eb5f8e7e0e775c6a220147e4e73fb0aaf69628f1. Home JSX inspected and reconciled with uploaded React source. No writes, commits or pushes made to that repository.

## Authority and conflict resolution

The SRS is authoritative for domain and use cases. Original MIT and React files establish provenance and demonstrate earlier interfaces, but their mock logins, hardcoded values, and status guarantees are not treated as real-world data. Group 804 and the original Sohaib Ijaz concept are credited; the original SRS also credits Talha Hamid and Moeez Ahmad for coursework contributions.

The SRS describes smartphones/components; the MIT prototype's whole-phone price records differ. The modernization uses clearly fictional component-specific seed offers instead. The SRS decision table includes Warning even though its supplier-table example lists only three states; all four states are implemented. The SRS says authenticated price/verification queries; the app enforces that on APIs and provides a public explanatory home screen.

## Traceability

| Requirement | Implementation | Evidence / boundary |
|---|---|---|
| UC-1 role-aware authentication | users/sessions, bcrypt, HttpOnly session cookie, server role checks, registration | API tests; admin signup forbidden |
| Supplier/admin 2FA | TOTP and code replay tracking | Enforcement/replay tests; public demo endpoint is intentionally demo-only |
| UC-2 component query, average, timestamp | catalog/detail APIs, comparable offer filtering, pricing module | 5 pricing tests + API group tests |
| UC-3 ShopID/name/QR and compliance record | directory name filtering, exact ID/token lookup, report modal | Lookup/status tests; camera browser acceptance pending |
| Verified/Warning/Revoked/Pending | shop constraint + admin audit | All four seeded and tested |
| Python or Java backend | Python Flask | SRS language constraint followed |
| Relational cloud DB | relational SQLite dev DB with documented persistent hosting volume | Development substitution; cloud PostgreSQL not implemented |
| bcrypt/Argon2 passwords | bcrypt with salt | No plaintext stored in DB |
| HTTPS/TLS | secure-cookie setting, HTTPS deployment documentation | Localhost development HTTP exception; production TLS not deployed/tested |
| PKR, English, PKT | display format and UTC storage | App formatting; browser QA pending |
| Backup/recovery | SQLite online backup and integrity check script | Recovery procedure documented; full recovery SLA not measured |
| 95% queries <3s; 100 operations/s | indexed uniqueness, local relational reads | Not load-tested; no performance compliance claim |
| 99.9% uptime | deployment guidance | Not measured |
| Privacy/legal compliance | synthetic demo only, restricted roles | No legal compliance certification claimed |

## Modernization beyond the MVP

Dark-purple responsive UI and reduced-motion animations; comparison shortlist; detailed fictional shop profiles; component/model/quality/warranty/stock metadata; approval queue; persistent submission histories and human audit explanations; random QR identifiers; image/manual fallbacks; PWA shell caching; Docker/hosting configuration; explicit sample-confidence labels. These are additions, not original coursework claims.

No payments, order checkout, manufacturer authorization, serial validation, or guarantees of component authenticity. Verification is a sample compliance record, not a guarantee that an individual component is genuine.

## Preserved originals

All three uploaded files are copied byte-for-byte into originals/. SHA256 values are in originals/SHA256.json. GitHub history and original portfolio files remain untouched.
