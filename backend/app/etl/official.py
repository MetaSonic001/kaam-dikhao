"""ETL: curated official programme records -> candidate documents for moderator review.

Government portals (GeM, CPPP, state e-procurement, OMMS) forbid or block automated access (robots.txt,
captchas, terms), so their data is never scraped. Instead, official facts published as open press
releases (PIB / PMIndia Cabinet decisions) are curated in data/official_records.json with the source
link, matched to the OpenStreetMap works they cover, and queued as UNDER_REVIEW documents. A moderator
checks each against its source before any figure is shown.
"""
from __future__ import annotations

import json
import logging
from pathlib import Path

from .. import db

log = logging.getLogger("kd.etl.official")
FILE = Path(__file__).resolve().parents[1] / "data" / "official_records.json"


def load() -> list[dict]:
    return json.loads(FILE.read_text(encoding="utf-8"))["records"]


def run() -> dict:
    queued = matched = 0
    records = load()
    for rec in records:
        m = rec["match"]
        pats = [f"%{t}%" for t in m["title_any"]]
        sites = db.q(
            "select id, title, jsonb_array_length(coalesce(tags->'osm_ids','[]'::jsonb)) as n from sites where published and city=%s and category=%s and title ilike any(%s) order by n desc",
            (m["city"], m["category"], pats),
        )
        if not sites:
            continue
        matched += len(sites)
        primary = sites[0]  # one review item per programme, applied to every covered section on approval
        if db.one("select 1 from site_documents where source_url=%s and extracted->>'reference_number'=%s", (rec["source_url"], rec["id"])):
            continue
        fields = {
            "programme_name": rec["programme"], "programme_amount": rec["amount_inr"], "department": rec.get("agency"),
            "reference_number": rec["id"], "site_ids": [str(x["id"]) for x in sites],
            "_note": "Programme-level figure from a Government of India press release. Not a per-corridor amount.",
        }
        db.run(
            "insert into site_documents(site_id, kind, title, source_url, extracted, status) values(%s,'budget',%s,%s,%s,'UNDER_REVIEW')",
            (primary["id"], rec["source_label"], rec["source_url"], db.js(fields)),
        )
        queued += 1
    log.info("official ETL: %s records, %s sites matched, %s documents queued", len(records), matched, queued)
    return {"records": len(records), "sites_matched": matched, "documents_queued": queued}
