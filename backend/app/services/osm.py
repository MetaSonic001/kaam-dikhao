"""Live public-works discovery from OpenStreetMap (Overpass API).

OpenStreetMap volunteers tag roads, rail lines, bridges and public buildings that are
under construction. That is the only openly licensed, continuously updated, India-wide
"work in progress" layer, so it is the backbone of the tracker. It carries no sanctioned
amounts: money, contractors and dates come from official documents attached later.
"""
from __future__ import annotations

import logging
import re
import time
from datetime import date, datetime

import httpx

from .. import db
from ..cities import CITIES
from ..config import get_settings
from ..util import haversine_m, slugify

log = logging.getLogger("kd.osm")

OVERPASS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
]


def _query(bbox: tuple[float, float, float, float]) -> str:
    b = f"({bbox[0]},{bbox[1]},{bbox[2]},{bbox[3]})"
    return f"""[out:json][timeout:150];
(
  way["highway"="construction"]["name"]{b};
  way["highway"="proposed"]["name"]{b};
  way["railway"="construction"]["name"]{b};
  way["railway"="construction"]["operator"]{b};
  way["bridge"]["construction"]["name"]{b};
  way["building"="construction"]["name"]["operator"]{b};
  way["landuse"="construction"]["name"]["operator"]{b};
  way["amenity"]["construction"]["name"]{b};
);
out tags geom;"""


def _post(query: str, timeout: float = 180) -> dict:
    last: Exception | None = None
    ua = {"User-Agent": get_settings().nominatim_user_agent}
    for url in OVERPASS:
        try:
            r = httpx.post(url, data={"data": query}, headers=ua, timeout=timeout)
            if r.status_code == 200:
                return r.json()
            last = RuntimeError(f"{url} -> {r.status_code}")
        except Exception as e:  # noqa: BLE001
            last = e
    raise RuntimeError(f"Overpass unavailable: {last}")


def _category(tags: dict) -> str:
    if tags.get("railway"):
        return "transit"
    if tags.get("bridge") or tags.get("man_made") == "bridge":
        return "bridge"
    if tags.get("highway"):
        c = tags.get("construction", "")
        if c in {"footway", "cycleway", "path", "pedestrian", "steps"}:
            return "footpath"
        return "road"
    if tags.get("waterway"):
        return "drainage"
    if tags.get("leisure") == "park":
        return "park"
    return "building"


def _parse_osm_date(v: str | None) -> date | None:
    if not v:
        return None
    m = re.match(r"^(\d{4})(?:-(\d{2}))?(?:-(\d{2}))?$", v.strip())
    if not m:
        return None
    y, mo, d = int(m.group(1)), int(m.group(2) or 12), int(m.group(3) or 28)
    try:
        return date(y, mo, min(d, 28) if mo == 2 else d)
    except ValueError:
        return None


def _centroid(lines: list[list[list[float]]]) -> tuple[float, float]:
    pts = [p for ln in lines for p in ln]
    return sum(p[1] for p in pts) / len(pts), sum(p[0] for p in pts) / len(pts)


def _group(elements: list[dict]) -> list[dict]:
    """Merge OSM ways of the same named work (a road is split into many ways)."""
    items = []
    for el in elements:
        geom = [[n["lon"], n["lat"]] for n in el.get("geometry", [])]
        if len(geom) < 2:
            continue
        tags = el.get("tags", {})
        name = (tags.get("name") or tags.get("ref") or tags.get("operator") or "").strip()
        if not name:
            continue
        items.append({"id": el["id"], "tags": tags, "line": geom, "cat": _category(tags), "name": name,
                      "key": re.sub(r"\s+", " ", name.lower())})
    groups: list[dict] = []
    for it in items:
        lat, lng = _centroid([it["line"]])
        home = None
        for g in groups:
            if g["key"] == it["key"] and g["cat"] == it["cat"] and haversine_m(lat, lng, *g["c"]) < 2500:
                home = g
                break
        if home is None:
            home = {"key": it["key"], "cat": it["cat"], "c": (lat, lng), "items": []}
            groups.append(home)
        home["items"].append(it)
        home["c"] = _centroid([i["line"] for i in home["items"]])
    return groups


def _title(name: str, cat: str, tags: dict) -> str:
    kind = tags.get("construction") or ""
    label = {"transit": "Rail / metro works", "bridge": "Bridge works", "road": "Road works",
             "footpath": "Footpath works", "building": "Building works", "drainage": "Drainage works",
             "park": "Park works"}.get(cat, "Works")
    return f"{name}" if label.lower().split()[0] in name.lower() else f"{name} — {label.lower()}"


def _unique_slug(base: str) -> str:
    slug, n = base, 2
    while db.one("select 1 from sites where slug=%s", (slug,)):
        slug = f"{base}-{n}"
        n += 1
    return slug


def sync_city(city_slug: str) -> dict:
    city = CITIES[city_slug]
    run_id = db.one(
        "insert into sync_runs(source, scope) values('osm-overpass', %s) returning id", (city_slug,)
    )["id"]
    try:
        data = _post(_query(city["bbox"]))
        groups = _group(data.get("elements", []))
        today = date.today()
        existing = db.q(
            "select id, tags, status from sites where origin='osm' and city=%s", (city["name"],)
        )
        id_to_site = {}
        for s in existing:
            for oid in (s["tags"] or {}).get("osm_ids", []):
                id_to_site[oid] = s["id"]
        seen: set = set()
        created = updated = 0
        for g in groups:
            ids = sorted(i["id"] for i in g["items"])
            base_tags = g["items"][0]["tags"]
            lines = [i["line"] for i in g["items"]]
            lat, lng = g["c"]
            merged: dict = {}
            for i in g["items"]:
                for k, v in i["tags"].items():
                    merged.setdefault(k, v)
            expected = None
            for k in ("opening_date", "end_date", "construction:end_date", "construction_end"):
                expected = expected or _parse_osm_date(merged.get(k))
            if expected and not (today.replace(year=today.year - 6) <= expected <= today.replace(year=today.year + 15)):
                expected = None  # implausible mapper date: do not present it as a deadline
            status = "DELAYED" if expected and expected < today else "IN_PROGRESS"
            checked = _parse_osm_date(merged.get("check_date"))
            name = g["items"][0]["name"]
            cat = g["cat"]
            geometry = {"type": "MultiLineString", "coordinates": lines}
            tags_out = {
                "osm_ids": ids, "check_date": checked.isoformat() if checked else None,
                "construction": merged.get("construction"), "opening_date": merged.get("opening_date"),
                "start_date": merged.get("start_date"), "phase": "construction" if not merged.get("highway") == "proposed" else "proposed",
                "operator": merged.get("operator"), "website": merged.get("website"),
            }
            if merged.get("highway") == "proposed":
                status = "PLANNED"
            site_id = next((id_to_site[i] for i in ids if i in id_to_site), None)
            desc = merged.get("description") or merged.get("note")
            if site_id:
                db.run(
                    """update sites set title=%s, category=%s, lat=%s, lng=%s, geometry=%s,
                       status=case when status in ('COMPLETED','DISPUTED','UNDER_REVIEW') and %s='IN_PROGRESS'
                                   then 'IN_PROGRESS' else %s end,
                       agency=coalesce(%s, agency), expected_completion=coalesce(%s, expected_completion),
                       description=coalesce(%s, description), tags=%s, source_url=%s,
                       last_synced_at=now(), updated_at=now() where id=%s""",
                    (_title(name, cat, merged), cat, lat, lng, db.js(geometry), status, status,
                     merged.get("operator"), expected, desc, db.js(tags_out),
                     f"https://www.openstreetmap.org/way/{ids[0]}", site_id),
                )
                seen.add(site_id)
                updated += 1
            else:
                title = _title(name, cat, merged)
                sid = db.one(
                    """insert into sites(slug,title,category,description,lat,lng,geometry,city,state,origin,origin_ref,
                       status,agency,expected_completion,source_url,source_label,claim_text,tags,last_synced_at)
                       values(%s,%s,%s,%s,%s,%s,%s,%s,%s,'osm',%s,%s,%s,%s,%s,%s,%s,%s,now())
                       on conflict (origin, origin_ref) do update set last_synced_at=now() returning id""",
                    (_unique_slug(f"{city_slug}-{slugify(title)}"), title, cat, desc, lat, lng, db.js(geometry),
                     city["name"], city["state"], f"w{ids[0]}", status, merged.get("operator"), expected,
                     f"https://www.openstreetmap.org/way/{ids[0]}", "OpenStreetMap (community-mapped)",
                     "Mapped as under construction on OpenStreetMap. No official sanction record is linked yet.",
                     db.js(tags_out)),
                )["id"]
                seen.add(sid)
                created += 1
        completed = _detect_completions(existing, seen)
        db.run("update sync_runs set finished_at=now(), ok=true, items=%s, detail=%s where id=%s",
               (len(groups), f"{created} new, {updated} refreshed, {completed} no longer under construction", run_id))
        return {"city": city_slug, "found": len(groups), "created": created, "updated": updated, "completed": completed}
    except Exception as e:  # noqa: BLE001
        log.exception("osm sync failed")
        db.run("update sync_runs set finished_at=now(), ok=false, detail=%s where id=%s", (str(e)[:400], run_id))
        raise


def _detect_completions(existing: list[dict], seen: set) -> int:
    """A previously tracked work that vanished from the construction query: check what it is now."""
    gone = [s for s in existing if s["id"] not in seen and s["status"] not in ("COMPLETED",)]
    n = 0
    for s in gone:
        ids = (s["tags"] or {}).get("osm_ids", [])
        if not ids:
            continue
        try:
            data = _post(f"[out:json][timeout:60];way(id:{','.join(map(str, ids))});out tags;", 90)
        except Exception:  # noqa: BLE001
            continue
        alive = [e for e in data.get("elements", []) if e.get("tags", {}).get("highway") in ("construction", "proposed")
                 or e.get("tags", {}).get("railway") == "construction"]
        if alive:
            continue
        tags = dict(s["tags"] or {})
        tags["completion_basis"] = "osm_tag_removed"
        tags["completion_seen_on"] = date.today().isoformat()
        db.run(
            """update sites set status='COMPLETED', tags=%s, updated_at=now(), last_synced_at=now(),
               claim_text='No longer tagged as under construction on OpenStreetMap. This is a community-mapping signal, not an official completion record.'
               where id=%s""",
            (db.js(tags), s["id"]),
        )
        db.run("insert into audit_log(actor_role,action,target_type,target_id,reason) values('system','status_change','site',%s,%s)",
               (str(s["id"]), "OSM construction tag removed"))
        n += 1
        time.sleep(1)
    return n
