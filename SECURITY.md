# Demo security and data boundaries

This repository is a student portfolio containing synthetic demonstration systems. It is not a production clinic, booking service or audited marketplace.

- Keep real credentials in private environment files; example files contain variable names and public demo fixtures only.
- Never upload genuine medical records, identity documents, financial details or production databases.
- TrustMart's sample accounts and demo authenticator endpoint are deliberately public teaching fixtures. They are not a production second-factor boundary. Restrict/remove these paths before any real deployment.
- Role and ownership checks, booking transactions, QR lookups and calculations run on the server. Interface hiding is not a substitute for those checks.
- Public hosting needs HTTPS, persistent storage, backup/restore verification, appropriate account settings, reviewed provider limits and physical-device acceptance.
- No payment processing, medical advice, product authenticity or compensation guarantee is offered.

For a suspected vulnerability, contact the owner through the contact details in the portfolio/profile. Please do not post private keys, genuine personal data or an exploit containing those data in a public issue.
