# Legal and compliance notes (India)

Working notes, not legal advice. A media/RTI lawyer must review the model before public launch.

| Law | What it means for the product | Where it is implemented |
|---|---|---|
| **IT Act 2000, s.79 + IT (Intermediary Guidelines) Rules 2021** | Safe harbour depends on due diligence: published terms, a named Grievance Officer, acknowledge complaints within 24 h and resolve within 15 days, act on takedown requests, no editorial control over third-party content beyond moderation. | `/legal` (terms, guidelines, grievance form), `takedowns` table with instant `ack_at`, `/admin` complaints tab, `GRIEVANCE_EMAIL` |
| **Digital Personal Data Protection Act 2023 + Rules 2025** (phased to 14 May 2027) | Notice and consent, purpose limitation, minimisation, right to access/correct/erase, no data on children. | Consent checkbox on every submission, EXIF stripped, faces blurred, PII redacted, names/emails never public, original text private, erase-on-request via the Grievance Officer |
| **BNS s.356 (defamation)** and civil defamation | Naming a person or firm as corrupt or fraudulent without a legal finding is risky. | `guard.py` rewrites accusatory text to neutral observation and flags it; UI uses *reported, appears, under review, disputed*; every public claim has a source and a review state; right of reply beside evidence; nothing auto-published |
| **RTI Act 2005** | Citizens can ask public authorities for records; 30-day reply, first appeal 30 days, second appeal 90 days. RTI portals are government systems. | `rti.py` drafts neutral s.6(1) applications; the citizen files on the official portal; statutory-period check on registry entries; we never pose as the portal |
| **Copyright Act 1957** | Contributors keep copyright; the platform needs a licence to display. | Terms (licence grant), source links for official documents, attribution for OSM / Copernicus / EOX |
| **Data licences** | OSM is ODbL (attribute, share-alike for derived databases). Sentinel-2 is free and open (Copernicus). EOX cloudless mosaics are CC BY-NC-SA 4.0. NASA GIBS is open. | Attribution in map footers and `/transparency`. Check EOX terms before any commercial use. |
| **Official Secrets / sensitive sites** | Do not publish photos of restricted defence or security installations. | Moderator checklist; report as `flags` |

## Language rules for the UI and AI
- Say: reported, appears delayed, evidence suggests, under review, disputed, community-mapped.
- Never say: corrupt, fraud, scam, stolen, bribe, "government lied", unless quoting an authoritative legal finding.
- A delayed status means a published date passed. It never says why or who.
- A citizen report is not a verified fact. Verified means credible after review, not a finding.
- The health score is a composite of public evidence, never an audit or legal finding, and needs at least three verified observations.

## Moderation minimums
Check location plausibility, capture time, duplicates, faces/plates/private property, accusatory wording, whether the photo shows a restricted site. Record a reason for every reject, dispute or "ask for more". Escalate legal-risk items; do not publish them.
