# CareIndex: real-clinic go-live gates (NOT YET PASSED)

**Status: NOT APPROVED FOR REAL PATIENT DATA OR CLINICAL OPERATIONS.**

Building a UI and passing development tests is not evidence of safe medical software. Before engaging a live clinic, obtain named stakeholder sign-off, a data-processing agreement, an independent security/privacy evaluation, and documented operational procedures. Gates below require evidence, not a developer's assurance.

| Gate | Required evidence before handling real patient data | V10 status |
|---|---|---|
| Clinic workflow and legal scope | Written requirements by a licensed provider; applicable Punjab Healthcare Commission MSDS/clinic practices; review local and relevant cross-border data obligations | Open |
| Data governance and consent | Patient notices, valid lawful basis, consent where applicable, access/correction/deletion/retention policies, staff training, records classification | Open |
| Production identity | Verified patient identities and staff credentials; MFA for staff, password recovery, secure invitations, centralized revocation, strong enrollment throttling | Open |
| Authorization | Per-clinic tenant boundaries, record-level clinician access, approved role matrix, independent IDOR/privilege testing, break-glass access protocol | Open |
| Clinical record safety | Immutable or versioned corrections, complete author attribution, safe medication/allergy/history workflows, clinician validation, retention controls | Open |
| Data integrity | Migrations with rollback, appointment concurrency tests at scale, financial reconciliation, backup retention, transactional boundaries reviewed | Open |
| Payments | Supported PSP merchant account, provider sandbox and webhooks, idempotency and reconciliation, signed webhook verification, refund and dispute workflows | Open — simulation only |
| Cryptography | TLS everywhere, encrypted volumes and encrypted off-host backups, keys managed separately, regular key rotation and restricted secret access | Open |
| Security verification | Threat model and independently conducted tests using current OWASP ASVS, vulnerability assessment and remediation record | Open |
| Reliability | Monitoring, alerts, incident response, tested point-in-time recovery or agreed RPO/RTO, capacity/load testing and a patch-management process | Open |
| Deployment | Paid/stable infrastructure with verified storage, controlled domains and access, HTTPS, operational on-call ownership, production/staging separation | Open |
| Accessibility and usability | Patient and staff usability testing, WCAG evaluation, responsive/mobile checks, error prevention, timezone and localization validation | Open |
| Training and acceptance | Clinic manager/clinician acceptance, SOPs, staff training, sign-off for production launch, pilot and rollback strategy | Open |

**Recommended safe path:** Run V10 strictly on **synthetic** data in a private staging environment with a representative clinic. Perform gap analysis, implement the missing controls, commission independent assessment, complete data migration and parallel operation, and obtain documented clinic sign-off before any real patient data is entered.

The AVL/Hash/Trie exercises and request traces are educational features. Keep them separate from real clinical records and never expose patient-specific traces in a public recruiter demonstration.
