# Code standards

## General
- Small files, clear names, no dead code. Match the surrounding style. Comments explain *why* only.
- No invented data anywhere. If a source does not have it, show "Not published" and offer the next step.
- Public UI strings via `lib/messages.ts` (add en, hi and mr). Type `MsgKey` catches typos.
- Never write accusatory copy. See `context/legal-compliance.md`.

## Frontend (Next.js 16, React 19, Tailwind 4)
- Read `node_modules/next/dist/docs/` before using a Next API. `params` and `searchParams` are Promises. No `middleware.ts`.
- Server component by default; add `"use client"` only for state, effects, maps, forms.
- Pages that use `useSearchParams` sit inside `<Suspense>`.
- Data comes from `lib/api.ts`. Client calls pass the Supabase token. Server pages use `apiSafe` and render an empty/error state instead of crashing.
- Run `bun run typecheck`, `bun run lint`, `bun run build` before finishing.

## Backend (FastAPI, psycopg3)
- Plain parameterised SQL in `db.py` helpers. Never build SQL from user input except from fixed allow-lists.
- Sync `def` endpoints (they run in the thread pool). Blocking network calls are fine there.
- Every write endpoint that a stranger can reach has `auth.limit(...)`.
- Every state change by a human writes `auth.audit(...)`.
- External calls (Overpass, STAC, Nominatim, Groq) degrade gracefully and never block a page render.
- Schema changes go in `schema.sql` as idempotent `create ... if not exists` / `alter ... add column if not exists`.
- Test by hitting the API with `X-Dev-User: you@example.com` while `APP_ENV=development`.

## Security
- Only `NEXT_PUBLIC_*` reach the browser. The Supabase secret key and Groq key stay in the API.
- Public media is stripped of EXIF and face-blurred before upload.
- Set `APP_ENV=production` when deployed; that disables the dev header.
