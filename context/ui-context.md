# UI context

Feel: a public data portal + investigative tool + interactive map + citizen reporting app. Credible over flashy. Information-rich but organised. Not a generic SaaS dashboard.

## Tokens (`app/globals.css`)
Warm paper background `#f7f7f4`, navy `#08243a`, orange `#f97316` (brand accent), green `#16805a`, red `#c93c3c`, amber `#b47b0a`, blue `#2563a8`, border `#dde1e3`. Tailwind v4 `@theme` exposes `bg-navy`, `text-ink`, `text-ink-2`, `border-line`, etc. A real dark theme is defined under `.dark` (not wired to a toggle yet).

Radius: buttons/inputs 8 px, cards 12 px. Shadows: hairline on cards, soft float on popovers. Type: Inter + Noto Sans Devanagari. Orange only for CTAs, active states and brand.

## Status vocabulary (`lib/meta.ts`)
Sites: PLANNED, TENDERED, AWARDED, IN_PROGRESS, COMPLETED, DELAYED ("Appears delayed"), UNDER_REVIEW, DISPUTED, INSUFFICIENT_EVIDENCE. Evidence: SUBMITTED, UNDER_REVIEW, VERIFIED, DISPUTED, REJECTED. Always icon + text, never colour alone.

## Recurring patterns
1. **Map** (`components/map/kd-map.tsx`): clustering, status colours, mapped route lines, evidence ring, satellite mode with 2016–2024 slider, legend, near-me, list alternative on mobile.
2. **Claim vs reality** card: record on the left, ground on the right, days-after-date bar, "How to read this" sentence.
3. **Evidence timeline** and **source chain**.
4. **Satellite compare slider** with candidate-observation label.

## Components (`components/`)
`ui.tsx` (Button, Badge, Input, Modal, Tabs, Toast, Skeleton, EmptyState, ErrorState), `badges.tsx`, `site-card.tsx`, `header.tsx`, `command-palette.tsx` (Ctrl+K), `mobile-nav.tsx` (center FAB), `project/*`, `report/*`, `rti/*`, `explore/*`, `projects/*`.

## Rules
- Mobile is first class: bottom nav, tables become cards, filters in a modal, map always has a list.
- Every string goes through `lib/messages.ts` (en/hi/mr). Long trust pages live in `lib/content.ts`.
- Dates and money use `lib/format.ts` (Indian numbering, locale digits, ₹ L / Cr).
- Loading uses skeletons, empty states have a next step, errors say what to do.
- WCAG 2.2 AA target: focus rings, semantic landmarks, skip link, aria on the map and sliders, reduced motion.
