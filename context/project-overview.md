# Project overview

**Kaam Dikhao** ("show the work") is a public evidence layer for public works in India. It connects what an official or open record says was built to what people can see on the ground, then makes the next step easy: report it, ask for the records, or check the source. Official portals stay the source of record.

Core loop: **Public money → Government claim → Ground evidence → Verification → Public record → Citizen action.**

## Users
- Citizens: explore the map, check a project, add a photo or voice note, draft an RTI. No login to explore.
- Journalists and NGOs: report cards, civic-watch patterns, sources on every number.
- Moderators: review queue, takedowns, replies, audit log.
- Departments and contractors: right of reply beside the evidence.

## Modules (one shared pipeline: claim + evidence → review → public)
1. **Kaam Tracker**: live works, map, satellite history, claim vs reality, project page.
2. **Report cards**: counts by ward, locality, agency, contractor, city. No rankings.
3. **RTI Registry**: neutral RTI drafts and a crowd-built archive of requests and replies.
4. **Ask AI**: retrieval-augmented answers with citations, in English, Hindi, Marathi.

## In scope now
Ten cities (Mumbai, Delhi, Bengaluru, Chennai, Kolkata, Hyderabad, Pune, Ahmedabad, Lucknow, Jaipur), live OpenStreetMap works, Sentinel-2 evidence, photo/voice/document intake, moderation, right of reply, RTI drafting and registry, trust pages, EN/HI/MR.

## Out of scope (deliberately)
- Scraping GeM, CPPP or state tender portals (no open API, captchas, terms). They are linked.
- Auto-filing RTIs or grievances. We draft, the citizen files.
- Ranking or rating contractors, wards or officials.
- Any accusation. AI never publishes.
- WhatsApp bot, push notifications, Redis, Docker, R2, queue services. Removed to keep the stack small.

## Success looks like
A citizen in any supported city can find the road works near them in seconds, see how the place looked in earlier years, add evidence in a minute, and ask for the records with one click, without ever being told who is to blame.
