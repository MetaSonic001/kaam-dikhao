# Kaam Dikhao — *Did this actually get built?*

A public evidence layer for public works in India. It tracks works that are under construction in ten major cities (live from OpenStreetMap), shows Sentinel-2 satellite history for each site, lets citizens add geotagged photos and voice notes, and helps them ask for the records with a ready RTI draft. Every claim shows its source and review state. The platform never accuses anyone.

```
Public money → Government claim → Ground evidence → Verification → Public record → Citizen action
```

## What works today

| Area | What it does | Source |
|---|---|---|
| **Live map** | 500+ real works in Mumbai, Delhi, Bengaluru, Chennai, Kolkata, Hyderabad, Pune, Ahmedabad, Lucknow, Jaipur. Roads, flyovers, metro and rail, footpaths, buildings. Clustering, status colours, near-me. | OpenStreetMap via Overpass, refreshed every 6 h |
| **Satellite history** | Time slider 2016–2024 on the map, daily NASA view, and per-site Sentinel-2 before/after with a NDVI + brightness change indicator, cloud-masked at 10 m. | Copernicus Sentinel-2 (Element84 STAC), EOX cloudless mosaics, NASA GIBS |
| **Claim vs reality** | Per project: what the record says, what the ground shows, days after the published date, timeline, source chain. | Sites + verified reports |
| **Citizen reporting** | Photo (EXIF location and time), voice (Whisper: Hindi, Marathi, English), text. Matches to an existing site within metres, or creates a new place. AI suggests, the citizen confirms, a moderator approves. | Groq vision + STT, Pillow, OpenCV |
| **Privacy** | EXIF stripped, faces blurred, **number plates detected (three small ONNX YOLO models) and pixelated, never read**, phone / Aadhaar / plate / email redacted in text, accusatory language rewritten neutrally. | `backend/app/services/guard.py`, `media.py` |
| **Official records ETL** | Cabinet-approved programme costs from PIB / PMIndia press releases are curated with source links, matched to the OSM works they cover, and queued for moderator approval. Approving one applies it to every covered section as programme context, never as a per-section amount. | `backend/app/etl/official.py`, `backend/app/data/official_records.json` |
| **RTI** | Neutral Section 6(1) draft from the records that are missing for a project, in English / Hindi / Marathi. Share replies to a public registry (AI summary, statutory timeline check). | `services/rti.py` |
| **Ask AI** | RAG over sites, verified reports, RTIs and the methodology, with citations. Multilingual embeddings, no vector DB. | fastembed + Groq |
| **Report cards** | Counts by ward, locality, agency, contractor, city. No rankings. | SQL aggregates |
| **Moderation** | Queue with GPS, distance, AI candidates, flags, original vs public text, audit log, takedown inbox, right of reply. | `/admin` |
| **Trust pages** | Methodology, data sources with live sync status, legal terms, grievance officer form. | `/methodology`, `/transparency`, `/legal` |

Languages: English, हिन्दी, मराठी (UI, RTI drafts, assistant answers, long-form policy pages).

## Run it (no Docker, no Redis)

Requirements: Node 20+ (or Bun), Python 3.11+.

```bash
bun install            # or npm install; also copies the MapLibre worker into /public
bun run setup          # creates backend/.venv and installs Python dependencies
cp .env.example .env   # fill in Supabase, Clerk and Groq keys
bun run dev            # API on :8000 and web on :3000
```

On first start the API creates its tables in Supabase, creates the storage bucket, and pulls live data for Mumbai first, then the other cities one by one. Open <http://localhost:3000>.

* Sign-in is Clerk (email, phone or Google). Add your Clerk keys to `.env`; the API verifies Clerk session tokens against the instance JWKS. For quick local testing you can set `NEXT_PUBLIC_DEV_USER=you@example.com` to skip sign-in (ignored when `APP_ENV=production`).
* Emails in `ADMIN_EMAILS` become admins and see `/admin`.
* Manual sync: `/admin` → *Data operations* → *Sync all cities now*.

## Layout

```
app/, components/, lib/     Next.js 16 frontend (public pages are server-rendered, no login needed)
backend/app/                FastAPI: routes/, services/, schema.sql, knowledge/*.md (RAG corpus)
scripts/dev.mjs             one-command runner
context/                    product, architecture, legal and workflow notes
```

Key backend services: `osm.py` (live works + completion detection), `satellite.py` (STAC + rasterio), `media.py` (EXIF + face blur), `guard.py` (PII + neutral language), `scoring.py` (explainable health score), `rag.py` (fastembed + numpy cosine in Postgres), `rti.py`, `llm.py` (Groq).

## Deploy: web on Vercel, API on Render (free)

**API on Render.** `render.yaml` is a Blueprint: *New > Blueprint*, pick the repo, then fill the secret variables it lists (`DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `GROQ_API_KEY`, the two Clerk keys, `ADMIN_EMAILS`, `GRIEVANCE_EMAIL`, `CORS_ORIGINS`, `APP_URL`). `CRON_SECRET` is generated for you; copy it for the step below. It builds `backend/Dockerfile` (plate-detection models baked in).

The free plan has 512 MB of RAM and sleeps after 15 minutes idle, so two settings are preset:
* `EMBEDDINGS=false`: Ask AI uses Postgres full-text search instead of the 400 MB embedding model. Answers still cite records; retrieval is keyword-based (weaker for Hindi/Marathi questions). On a 1 GB+ plan set `EMBEDDINGS=true` and build with `BAKE_EMBEDDINGS=true`.
* `KD_SERVERLESS=true`: no in-process scheduler. `.github/workflows/sync.yml` calls `/api/cron/sync` every 6 hours (wakes the API, syncs the stalest city, backfills wards, re-indexes). Add repo secrets `API_URL` (your `https://...onrender.com`) and `CRON_SECRET`.

First request after a sleep takes about a minute; a free uptime pinger (for example UptimeRobot on `/api/health` every 10 minutes) keeps it awake.

**Web on Vercel.** Import the repo as a normal Next.js project and set `NEXT_PUBLIC_API_URL=https://<your-render-service>.onrender.com`, the Clerk keys, `NEXT_PUBLIC_GRIEVANCE_EMAIL`, `NEXT_PUBLIC_APP_URL`. Do not set `NEXT_PUBLIC_DEV_USER`. In Clerk, add your production domain.

## Design rules that matter

1. Nothing citizen-submitted is public until a human moderator approves it.
2. AI output is always a labelled *candidate*. It never publishes and never decides responsibility.
3. No invented data. If a number is not in a source, the UI says *Not published* and offers to ask for it.
4. A health score needs at least three verified observations. Missing public records are never counted against a project.
5. Right of reply for departments and contractors sits beside the evidence, and nothing is silently removed.

See `context/legal-compliance.md` for how this maps to the IT Act, IT Rules 2021, the DPDP Act 2023, the RTI Act and defamation law. **Get a media/RTI lawyer to review the model before a public launch.**

## Limits, honestly

* OpenStreetMap has no sanctioned amounts or contractors. Money and contractor fields fill only when a document is attached and a moderator approves it. Tender portals (GeM, CPPP, state) have no open API and are linked, not scraped.
* Ward names come from OSM geocoding and can be municipal zones rather than official wards in some cities.
* 10 m Sentinel-2 cannot judge road quality. The change indicator is context for humans.
* Government tender and project portals are not scraped: `mahatenders.gov.in` disallows all crawlers in robots.txt, GeM and CPPP sit behind captchas and terms, OMMS and the data.gov.in API were unreachable or returning 503 during the build, and pib.gov.in blocks automated fetches. Open, bulk, project-level Indian datasets with amounts and contractors essentially do not exist; the OCDS registry has two stale, award-less Indian datasets (Assam 2022, Himachal 2020). The legal route to concrete numbers is documents and RTI replies added by people, plus curated press-release facts.
* Face blur uses a classical detector and plate blur uses small models that were only checked on a synthetic plate image (real Indian plate photos could not be downloaded here). Moderators still check every photo, so test with your own photos.
