# KAAM DIKHAO — CLAUDE.md

> The single most important product principle: the platform connects
> **government claims** (₹48.75 L, road resurfacing, completion: 12 Apr)
> to **ground truth** (citizen photos, satellite, documents, GPS) to
> **verification** (a health score, a status) to **action** (file an RTI,
> file a grievance). Every UI decision should reinforce
> **Money → Work → Evidence → Verification → Accountability.**

## Application Building Context

**Read the following files in order before implementing or making any
architectural decision:**

1. `context/project-overview.md` — product definition, goals, features, scope
2. `context/architecture.md` — system structure, boundaries, storage model, invariants
3. `context/ui-context.md` — theme, colors, typography, component conventions
4. `context/code-standards.md` — implementation rules and conventions
5. `context/ai-workflow-rules.md` — development workflow, scoping rules, delivery approach
6. `context/progress-tracker.md` — current phase, completed work, open questions, next steps
7. `context/legal-compliance.md` — Indian law constraints and language rules

## Documentation Discipline

- **Update `context/progress-tracker.md` after each meaningful
  implementation change.**
- If implementation changes architecture, scope, or standards documented
  in the context files, update the relevant file before continuing.
- Do not invent product behavior not defined in the context files. Resolve
  ambiguity in the context files first.
- Keep public UI strings through i18n — no hardcoded English text.

## Non-negotiable Rules

- **Never automatically accuse anyone.** Use reported / under review /
  verified / disputed / rejected instead of "corrupt", "fraud", "scam".
- **Never auto-publish AI output.** All AI observations go to the
  moderation queue, labeled "Candidate observation — human review required."
- **Every public claim must have provenance** (source, date, location,
  evidence) within one click.
- **Never invent data.** Everything comes from live sources (OpenStreetMap,
  Sentinel-2, citizen submissions, attached official documents) via the
  FastAPI backend. If a source lacks a value, the UI says "Not published".
- **Public pages must look excellent unauthenticated.** No auth wall on
  projects, maps, leaderboards, RTIs, or evidence.

## Also read

- See @AGENTS.md

*Managed block below maintained by `next dev` (see
`node_modules/next/dist/server/lib/generate-agent-files.js`). Do not remove
from your diffs; commit it with your work.*