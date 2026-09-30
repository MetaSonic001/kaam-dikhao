# AI-assisted development rules

1. Read `context/` first, then the code. Update `context/progress-tracker.md` after each meaningful change.
2. Keep the stack small: Next.js + FastAPI + Supabase + Groq. Ask before adding a service, a queue, a cache or a container.
3. Prefer open data and free, open-source Python libraries. Note the licence when adding a source.
4. Never auto-publish AI output. Store it as a candidate with a label and route it to moderation.
5. Never add accusatory language, ranking of people or firms, or scoring that penalises missing public records.
6. Every new user-visible string is translated to Hindi and Marathi.
7. Prove it works: run the API, hit the endpoint, look at the page in a browser (desktop and phone width). Report what failed.
8. Do not delete user files in bulk. Move superseded code to `_legacy/` and let the owner delete it.
9. Do not commit secrets. `.env` is git-ignored; `.env.example` documents every key.
