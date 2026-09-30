# Architecture

Two processes, one database, no containers.

```
Browser ── Next.js 16 (app/, :3000) ──fetch──> FastAPI (backend/app, :8000) ──> Supabase Postgres + Storage
                │                                   │
                └── Clerk (sign-in)                  ├── OpenStreetMap Overpass  (live works)
                                                     ├── Element84 STAC + AWS COGs (Sentinel-2)
                                                     ├── Nominatim (geocoding, cached in Postgres)
                                                     └── Groq (LLM, vision, Whisper)
```

## Frontend (`app/`, `components/`, `lib/`)
- Server components fetch the API for public pages (SEO, no login). Client components handle map, wizards, admin.
- `lib/api.ts` typed fetch, `lib/types.ts` domain models (Site, Report, Health, ...), `lib/messages.ts` UI strings (en/hi/mr), `lib/content.ts` long-form trust pages per language, `lib/auth.tsx` Clerk session (requests fetch a fresh token via `setTokenProvider`), `lib/meta.ts` status colours and categories.
- Language is a `kd_lang` cookie read on the server; switching reloads the same URL.
- MapLibre v6 runs its worker as an ES module; `scripts/copy-maplibre.mjs` copies it to `/public/maplibre` on install and `lib/maplibre.ts` points the map at it.

## Backend (`backend/app`)
- `routes/`: `sites` (list, map GeoJSON, detail), `reports` (analyze + create), `records` (satellite, documents, RTI, replies, takedowns), `moderation`, `insights` (stats, report cards, civic watch, sync status, search, admin sync), `assistant`.
- `services/`: `osm`, `satellite`, `geocode`, `media`, `guard`, `llm`, `rag`, `rti`, `scoring`, `docs`, `storage`.
- `db.py` psycopg3 pool over the Supabase session pooler, plain SQL. `schema.sql` is idempotent and runs on every start.
- `auth.py` verifies the Clerk session JWT (RS256, instance JWKS), fetches the email from Clerk once, maps the Clerk user id to a deterministic uuid `profiles` row, promotes `ADMIN_EMAILS`, and has an in-memory rate limiter (single node; no Redis).
- `main.py` starts an in-process APScheduler: every city syncs every 6 hours; on boot missing cities are filled one by one.

## Data model (Postgres)
`sites` (a place where work is claimed or observed; origin = osm | official | citizen; lat/lng plus GeoJSON geometry), `reports` (citizen evidence, states SUBMITTED / UNDER_REVIEW / VERIFIED / DISPUTED / REJECTED), `satellite_observations`, `site_documents`, `rtis`, `replies` (right of reply), `takedowns`, `follows`, `profiles`, `audit_log`, `sync_runs`, `geocode_cache`, `doc_chunks` (RAG, `real[]` embeddings), `report_drafts`.

## Key flows
- **Sync**: Overpass query per city bbox → group ways by name → upsert `sites` (stable by OSM way ids) → detect works whose construction tag disappeared → mark COMPLETED as a community signal.
- **Report**: `/analyze` reads EXIF, blurs faces, strips metadata, uploads, transcribes voice, asks the vision model for candidate observations, neutralises text, finds candidate sites (distance to the polyline, category, name) → citizen confirms → `/reports` stores as SUBMITTED → moderator approves.
- **Satellite**: STAC search (3 years, cloud < 30 %) → per-scene local cloud check on the SCL band → windowed COG read → JPEG chips + NDVI/brightness change → cached 7 days in Storage.
- **Assistant**: embed question (multilingual MiniLM via fastembed) → cosine over `doc_chunks` → Groq answers only from the numbered context, cites, answers in the user's language.

## Invariants
1. Public reads never require auth. Writes require a Supabase session.
2. `reports.status in (VERIFIED, DISPUTED)` are the only public reports. Citizen-created sites stay hidden until a report on them is verified.
3. Every moderator action writes `audit_log` with a reason.
4. AI output is stored as candidate data (`reports.ai`, `site_documents.extracted`) and never overwrites facts without a moderator.
5. Original citizen text is kept private; only the neutral, redacted `note_public` is shown.
6. Secrets stay server-side. Only `NEXT_PUBLIC_*` values reach the browser.
