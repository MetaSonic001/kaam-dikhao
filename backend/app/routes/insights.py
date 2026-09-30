"""Public aggregates: stats, cities, report cards, civic watch, sync status, unified search."""
from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request

from .. import auth, db
from ..cities import CITIES, NATIONAL_LINKS
from ..services import geocode, osm, rag
from ..util import slugify

router = APIRouter(prefix="/api", tags=["insights"])


def _city_name(city: str | None) -> str | None:
    return CITIES[city.lower()]["name"] if city and city.lower() in CITIES else city


@router.get("/cities")
def cities():
    counts = {r["city"]: r for r in db.q(
        """select city, count(*) sites, count(*) filter (where status='DELAYED') delayed,
           count(*) filter (where status='COMPLETED') completed, max(last_synced_at) last_synced
           from sites where published group by city""")}
    out = []
    for slug, c in CITIES.items():
        n = counts.get(c["name"], {})
        out.append({"slug": slug, "name": c["name"], "state": c["state"], "center": c["center"], "zoom": c["zoom"], "bbox": c["bbox"],
                    "body": c["body"], "sites": n.get("sites", 0), "delayed": n.get("delayed", 0), "completed": n.get("completed", 0),
                    "last_synced": n.get("last_synced"), "grievance": c["grievance"], "tender": c["tender"]})
    return out


@router.get("/stats")
def stats(city: str | None = None):
    name = _city_name(city)
    w, p = ("s.published" + (" and lower(s.city)=lower(%s)" if name else "")), ([name] if name else [])
    by_status = {r["status"]: r["n"] for r in db.q(f"select status, count(*) n from sites s where {w} group by status", p)}
    by_cat = {r["category"]: r["n"] for r in db.q(f"select category, count(*) n from sites s where {w} group by category", p)}
    rep = db.one(f"""select count(*) filter (where r.status='VERIFIED') verified, count(*) filter (where r.status='DISPUTED') disputed,
                     count(*) filter (where r.status in ('SUBMITTED','UNDER_REVIEW')) pending, count(*) filter (where r.status='REJECTED') rejected
                     from reports r join sites s on s.id=r.site_id where {w}""", p)
    covered = db.one(f"select count(*) c from sites s where {w} and exists(select 1 from reports r where r.site_id=s.id and r.status in ('VERIFIED','DISPUTED'))", p)["c"]
    rti = db.one("select count(*) c from rtis where status='PUBLISHED'" + (" and lower(city)=lower(%s)" if name else ""), p)["c"]
    total = sum(by_status.values())
    sanctioned = db.one(f"select coalesce(sum(sanctioned_amount),0) v, count(sanctioned_amount) n from sites s where {w}", p)
    last = db.one(f"select max(last_synced_at) t from sites s where {w}", p)["t"]
    return {"sites": total, "by_status": by_status, "by_category": by_cat, "reports": rep, "sites_with_evidence": covered,
            "evidence_coverage_pct": round(100 * covered / total) if total else 0, "rtis": rti,
            "sanctioned_total": float(sanctioned["v"]), "sites_with_amount": sanctioned["n"], "cities_live": db.one("select count(distinct city) c from sites where published")["c"],
            "last_synced_at": last}


@router.get("/report-cards")
def report_cards(kind: str = "wards", city: str | None = None):
    name = _city_name(city)
    cw, cp = ("and lower(s.city)=lower(%s)" if name else ""), ([name] if name else [])
    if kind in ("wards", "localities"):
        col = "s.ward" if kind == "wards" else "s.locality"
    elif kind == "agencies":
        col = "s.agency"
    elif kind == "contractors":
        col = "s.contractor"
    elif kind == "cities":
        col = "s.city"
    else:
        raise HTTPException(400, "Unknown report card kind")
    rows = db.q(
        f"""select {col} as name, min(s.city) as city, count(*) projects,
            count(*) filter (where s.status='COMPLETED') completed,
            count(*) filter (where s.status in ('IN_PROGRESS','DELAYED','AWARDED')) ongoing,
            count(*) filter (where s.status='DELAYED') delayed,
            count(*) filter (where s.status='UNDER_REVIEW' or s.status='DISPUTED') under_review,
            coalesce(sum(s.sanctioned_amount),0) sanctioned,
            count(*) filter (where exists(select 1 from reports r where r.site_id=s.id and r.status in ('VERIFIED','DISPUTED'))) with_evidence,
            (select count(*) from reports r join sites s2 on s2.id=r.site_id where r.status='VERIFIED' and {col.replace('s.','s2.')}={col}) verified_reports
            from sites s where s.published and {col} is not null {cw} group by {col} order by count(*) desc limit 100""", cp)
    for r in rows:
        r["slug"] = slugify(r["name"])
        r["evidence_coverage_pct"] = round(100 * r["with_evidence"] / r["projects"]) if r["projects"] else 0
        r["delayed_pct"] = round(100 * r["delayed"] / r["projects"]) if r["projects"] else 0
    note = {"contractors": "Contractors appear only where an official record naming them has been attached and reviewed. Absence from this list says nothing about anyone.",
            "agencies": "Agency names come from the source record (for example the OpenStreetMap operator tag or an attached document)."}.get(kind)
    return {"kind": kind, "rows": rows, "note": note,
            "method": "Counts of tracked projects by recorded status, and how many have reviewed ground evidence. No ranking or rating is computed: a delayed status reflects a published date that has passed, not a finding about anyone."}


@router.get("/civic-watch")
def civic_watch(city: str | None = None):
    name = _city_name(city)
    cw, cp = (" and lower(city)=lower(%s)" if name else ""), ([name] if name else [])
    out = []

    def add(key, title, detail, n, params):
        if n:
            out.append({"key": key, "title": title, "detail": detail, "count": n, "params": params})

    n = db.one(f"select count(*) c from sites where published and status='DELAYED'{cw}", cp)["c"]
    add("overdue", f"{n} projects appear to have passed their published completion date",
        "The date comes from the source record (for example the OpenStreetMap opening_date tag). It does not say why.", n, {"status": "DELAYED"})
    n = db.one(f"select count(*) c from sites s where published and status in ('IN_PROGRESS','DELAYED'){cw.replace('city','s.city')} and not exists(select 1 from reports r where r.site_id=s.id and r.status in ('VERIFIED','DISPUTED'))", cp)["c"]
    add("no-evidence", f"{n} ongoing works have no reviewed ground evidence yet",
        "A photo from you would be the first. It takes about a minute.", n, {"has_evidence": "false", "status": "IN_PROGRESS"})
    n = db.one(f"select count(*) c from sites where published and status='COMPLETED' and tags->>'completion_basis'='osm_tag_removed'{cw}", cp)["c"]
    add("recently-completed", f"{n} works recently stopped being mapped as under construction",
        "Mappers marked them finished. Nobody has checked yet. Was it really completed?", n, {"status": "COMPLETED"})
    mature = db.one("select count(*) c from sites where created_at < now() - interval '7 days'")["c"] > 0
    n = db.one(f"select count(*) c from sites where published and category in ('road','footpath','bridge','transit') and created_at > now() - interval '7 days'{cw}", cp)["c"] if mature else 0
    add("new", f"{n} new public works were added in the last 7 days", "Discovered from live OpenStreetMap data.", n, {})
    n = db.one("select count(*) c from reports where status='DISPUTED'")["c"]
    add("disputed", f"{n} observations are disputed", "Both the citizen evidence and the reply stay visible.", n, {"status": "DISPUTED"})
    n = db.one("select count(*) c from rtis where status='PUBLISHED' and outcome in ('NO_RESPONSE','PARTIAL','REJECTED')")["c"]
    add("rti", f"{n} RTI requests were answered only partially, refused, or not answered", "Each links to the original request.", n, {})
    return {"items": out}


@router.get("/sync-status")
def sync_status():
    runs = db.q("""select distinct on (source, scope) source, scope, started_at, finished_at, ok, items, detail from sync_runs order by source, scope, started_at desc""")
    sat = db.one("select count(*) c, max(created_at) t from satellite_observations")
    sources = [
        {"key": "osm", "name": "OpenStreetMap (Overpass API)", "coverage": "Works mapped as under construction, per city", "update": "Every 6 hours",
         "license": "ODbL 1.0", "method": "Overpass query per city bounding box; ways merged by name; completions detected when the construction tag is removed",
         "url": "https://www.openstreetmap.org/copyright", "runs": [r for r in runs if r["source"] == "osm-overpass"]},
        {"key": "sentinel", "name": "Copernicus Sentinel-2 L2A (via Element84 Earth Search)", "coverage": "India, 10 m, ~5 day revisit", "update": "On demand, cached 7 days",
         "license": "Free, full and open (Copernicus)", "method": "STAC search, HTTP range reads of Cloud-Optimised GeoTIFFs, cloud masking with the scene classification layer",
         "url": "https://earth-search.aws.element84.com/v1", "runs": [], "extra": {"observations": sat["c"], "last": sat["t"]}},
        {"key": "eox", "name": "Sentinel-2 cloudless mosaics (EOX)", "coverage": "India, yearly 2016-2024, 10 m", "update": "Yearly",
         "license": "CC BY-NC-SA 4.0 (attribution: EOX IT Services GmbH, contains modified Copernicus Sentinel data)", "method": "Map tiles for the historical time slider",
         "url": "https://s2maps.eu", "runs": []},
        {"key": "nominatim", "name": "Nominatim (OpenStreetMap geocoding)", "coverage": "Localities, wards, pincodes", "update": "Cached in Postgres",
         "license": "ODbL 1.0", "method": "Reverse geocoding at ~100 m resolution, 1 request/second", "url": "https://nominatim.org", "runs": []},
        {"key": "citizens", "name": "Citizen submissions", "coverage": "Photos, voice notes, documents, RTI replies", "update": "Continuous",
         "license": "Contributor keeps copyright; grants Kaam Dikhao a licence to publish", "method": "Geotag + timestamp read, EXIF stripped, faces blurred, moderator review", "url": "/methodology", "runs": []},
        {"key": "official", "name": "Official records (tenders, work orders, RTI replies)", "coverage": "Attached per project", "update": "As submitted",
         "license": "Public documents; source link kept", "method": "PDF text extraction, AI candidate fields, moderator check against the source", "url": "/methodology", "runs": []},
    ]
    return {"sources": sources, "official_portals": NATIONAL_LINKS}


@router.get("/search")
def search(q: str):
    q = q.strip()
    if len(q) < 2:
        return {"sites": [], "places": [], "rtis": [], "areas": []}
    like = f"%{q}%"
    sites = db.q("select slug, title, category, status, locality, city from sites where published and (title ilike %s or locality ilike %s or ward ilike %s or agency ilike %s or contractor ilike %s) order by (title ilike %s) desc, updated_at desc limit 8",
                 (like, like, like, like, like, f"{q}%"))
    areas = db.q("select locality as name, city, count(*) n from sites where published and locality ilike %s group by locality, city order by n desc limit 5", (like,))
    rtis = db.q("select id, subject, authority, outcome from rtis where status='PUBLISHED' and (subject ilike %s or authority ilike %s) limit 5", (like, like))
    places = geocode.search(q, 4) if len(q) >= 3 else []
    return {"sites": sites, "areas": areas, "rtis": rtis, "places": places}


@router.get("/cron/sync")
def cron_sync(request: Request):
    """Vercel Cron: sync the city whose data is stalest (one per call keeps it inside the function time limit)."""
    from ..config import get_settings

    secret = get_settings().cron_secret
    if not secret or request.headers.get("authorization") != f"Bearer {secret}":
        raise HTTPException(401, "Unauthorized")
    keys = ", ".join(f"('{k}')" for k in CITIES)  # keys come from our own constant, not user input
    row = db.one(f"""select c.key from (values {keys}) as c(key)
                     left join (select scope, max(started_at) t from sync_runs where source='osm-overpass' group by scope) r on r.scope = c.key
                     order by r.t nulls first limit 1""")
    result = osm.sync_city(row["key"])
    from ..etl import official

    official.run()
    geocode.backfill_sites(40)  # localities and wards, 1 request/second, bounded to fit the request time
    rag.reindex()
    return {"synced": result}


@router.post("/admin/etl/official")
def run_official_etl(user: auth.User = Depends(auth.admin)):
    from ..etl import official

    return official.run()


@router.post("/admin/sync")
def trigger_sync(bg: BackgroundTasks, city: str | None = None, user: auth.User = Depends(auth.admin)):
    targets = [city] if city else list(CITIES)
    if city and city not in CITIES:
        raise HTTPException(404, "Unknown city")

    def job():
        for c in targets:
            try:
                osm.sync_city(c)
            except Exception:  # noqa: BLE001
                pass
        geocode.backfill_sites()
        rag.reindex()

    bg.add_task(job)
    return {"started": targets}
