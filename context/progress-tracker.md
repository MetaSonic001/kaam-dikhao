# Progress tracker

## Current phase
**v1.0: live, end-to-end, no mock data.** Rebuilt from a mock-driven prototype into a Next.js + FastAPI + Supabase product.

## Done (verified by running it)
- [x] Live works: OpenStreetMap Overpass for 10 cities, grouped by name, completion detection, 6-hourly scheduler (499 works synced on first run).
- [x] Explore map (clustering, status colours, routes, evidence ring, near-me, list panel), satellite mode with 2016–2024 slider and NASA daily layer.
- [x] Project page: claim vs reality, health score (explainable, needs ≥3 verified observations), evidence gallery + provenance modal, Sentinel-2 before/after slider with change indicator (7 frames over ~3 years for a test site), timeline, source chain, documents, RTI links, right of reply, follow, share.
- [x] Citizen report wizard: photo/voice/text → EXIF location and time → face blur + EXIF strip → vision candidates → neutral rewrite → match to nearby site or new place → consent → moderation queue. Tested end to end in the browser and via API.
- [x] Moderation console, audit log, takedown inbox, right-of-reply queue, documents and RTI review, data-ops panel with manual sync.
- [x] RTI: neutral draft (missing records preselected, EN/HI/MR), share-a-reply with AI summary and statutory-period check, public registry (empty until citizens contribute).
- [x] Ask AI with citations (fastembed multilingual embeddings in Postgres, Groq), voice input.
- [x] Report cards (counts, no ranking), Civic Watch, Transparency with source and sync status, Methodology, Legal + grievance form, About.
- [x] Command palette (Ctrl+K), EN/HI/MR, mobile bottom nav with FAB, SEO (metadata, sitemap, robots, JSON-LD), PWA manifest.
- [x] Removed Docker/Redis/R2/WhatsApp/Upstash/Gemini/Bhuvan/Drizzle/mock layer. Old code parked in `_legacy/` (untracked, safe to delete).
- [x] Row Level Security enabled on every table with no policies (verified: the publishable key gets nothing from the REST API; the FastAPI connection still works).
- [x] Number-plate blur (3 small ONNX detectors, pixelate only, never read). Verified on a synthetic plate; test with real photos.
- [x] Clerk auth replaces Supabase Auth (proxy.ts, /sign-in, /sign-up, JWT verification in the API). Supabase is now Postgres + Storage only.
- [x] Official-records ETL: 8 Cabinet-approved metro programmes from PIB/PMIndia queued for moderator review (4 matched OSM works so far).
- [x] `tsc`, `eslint` and `next build` pass.

## Known gaps / next
- [ ] Sign in once with a real Clerk account and confirm the API accepts the token (`/api/me`). Add your production domain in Clerk before launch.
- [ ] Official Open Government Data connector (data.gov.in was down during the build). City-level Smart Cities Mission aggregates are the first candidate.
- [ ] Notifications for followed projects (dashboard shows follows only).
- [ ] Dark theme toggle (tokens exist).
- [ ] Automated tests (pytest for guard/scoring/matching; Playwright for the report flow).
- [x] Deploy config: API on Render free (`render.yaml`, `backend/Dockerfile`, `EMBEDDINGS=false`, GitHub Actions cron), web on Vercel. Not yet deployed: run the steps in README.
- [ ] Lawyer review of terms, grievance process and moderation policy.

## Decisions
- One place model: `sites` covers government works and citizen-reported places; a citizen place stays hidden until a report on it is verified.
- Money/contractor fields fill only from reviewed documents (OSM has none).
- Health score ignores record completeness (shown, never scored).
- Ward = municipal zone/ward from Nominatim; may be a zone in some cities.
