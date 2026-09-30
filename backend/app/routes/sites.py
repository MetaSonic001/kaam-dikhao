from __future__ import annotations

from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query

from .. import auth, db
from ..cities import CITIES, NATIONAL_LINKS
from ..services import rti as rti_svc
from ..services import satellite as sat_svc
from ..services import scoring
from ..util import bbox_around, haversine_m

router = APIRouter(prefix="/api", tags=["sites"])

PUBLIC_REPORT = "('VERIFIED','DISPUTED')"

LIST_COLS = """s.id, s.slug, s.title, s.category, s.status, s.lat, s.lng, s.locality, s.ward, s.city, s.state,
  s.origin, s.agency, s.contractor, s.sanctioned_amount, s.expected_completion, s.source_label, s.last_synced_at,
  s.created_at, s.updated_at,
  (select count(*) from reports r where r.site_id=s.id and r.status in ('VERIFIED','DISPUTED')) as evidence_count,
  (select count(*) from reports r where r.site_id=s.id and r.status='VERIFIED') as verified_count,
  (select max(coalesce(r.captured_at, r.created_at)) from reports r where r.site_id=s.id and r.status in ('VERIFIED','DISPUTED')) as last_evidence_at"""


def _filters(q, city, status, category, origin, only_evidence):
    where, params = ["s.published"], []
    if q:
        where.append("(s.title ilike %s or s.locality ilike %s or s.ward ilike %s or s.agency ilike %s or s.contractor ilike %s or s.address ilike %s)")
        params += [f"%{q}%"] * 6
    if city:
        where.append("lower(s.city)=lower(%s)")
        params.append(CITIES.get(city.lower(), {}).get("name", city))
    if status:
        where.append("s.status = any(%s)")
        params.append(status)
    if category:
        where.append("s.category = any(%s)")
        params.append(category)
    if origin:
        where.append("s.origin = any(%s)")
        params.append(origin)
    if only_evidence:
        where.append("exists(select 1 from reports r where r.site_id=s.id and r.status in ('VERIFIED','DISPUTED'))")
    return " and ".join(where), params


@router.get("/sites")
def list_sites(
    q: str | None = None, city: str | None = None, status: list[str] | None = Query(None),
    category: list[str] | None = Query(None), origin: list[str] | None = Query(None),
    has_evidence: bool = False, sort: str = "recent",
    lat: float | None = None, lng: float | None = None, radius_km: float | None = None,
    limit: int = Query(24, le=100), offset: int = 0,
):
    where, params = _filters(q, city, status, category, origin, has_evidence)
    if lat is not None and lng is not None and radius_km:
        s, w, n, e = bbox_around(lat, lng, radius_km * 1000)
        where += " and s.lat between %s and %s and s.lng between %s and %s"
        params += [s, n, w, e]
    total = db.one(f"select count(*) c from sites s where {where}", params)["c"]
    order = {"recent": "s.updated_at desc", "delayed": "(s.status='DELAYED') desc, s.expected_completion asc nulls last",
             "evidence": "evidence_count desc, s.updated_at desc", "title": "s.title asc"}.get(sort, "s.updated_at desc")
    rows = db.q(f"select {LIST_COLS} from sites s where {where} order by {order} limit %s offset %s", [*params, limit + (300 if lat is not None and radius_km else 0), offset])
    if lat is not None and lng is not None:
        for r in rows:
            r["distance_m"] = round(haversine_m(lat, lng, r["lat"], r["lng"]))
        if radius_km:
            rows = [r for r in rows if r["distance_m"] <= radius_km * 1000]
        if sort == "nearest" or radius_km:
            rows.sort(key=lambda r: r["distance_m"])
        rows = rows[:limit]
        total = len(rows) if radius_km else total
    return {"total": total, "items": rows}


@router.get("/map")
def map_features(
    bbox: str | None = None, city: str | None = None, status: list[str] | None = Query(None),
    category: list[str] | None = Query(None), q: str | None = None, geom: bool = False, limit: int = Query(4000, le=8000),
):
    where, params = _filters(q, city, status, category, None, False)
    if bbox:
        s, w, n, e = (float(x) for x in bbox.split(","))
        where += " and s.lat between %s and %s and s.lng between %s and %s"
        params += [s, n, w, e]
    cols = "s.id, s.slug, s.title, s.category, s.status, s.lat, s.lng, s.locality, s.city, s.origin, s.expected_completion" + (", s.geometry" if geom else "")
    rows = db.q(f"select {cols}, (select count(*) from reports r where r.site_id=s.id and r.status in ('VERIFIED','DISPUTED')) as evidence_count from sites s where {where} limit %s", [*params, limit])
    feats = []
    for r in rows:
        props = {k: v for k, v in r.items() if k not in ("geometry", "lat", "lng")}
        feats.append({"type": "Feature", "id": str(r["id"]), "properties": props,
                      "geometry": {"type": "Point", "coordinates": [r["lng"], r["lat"]]}})
        if geom and r.get("geometry"):
            feats.append({"type": "Feature", "properties": {**props, "is_line": True}, "geometry": r["geometry"]})
    return {"type": "FeatureCollection", "features": feats}


def _timeline(site: dict, reports: list[dict], sats: dict, rtis: list[dict], replies: list[dict]) -> list[dict]:
    ev = []

    def add(when, kind, title, detail=None, source=None, url=None):
        if when:
            if isinstance(when, date) and not isinstance(when, datetime):
                when = datetime(when.year, when.month, when.day, tzinfo=timezone.utc)
            ev.append({"at": when, "kind": kind, "title": title, "detail": detail, "source": source, "url": url})

    add(site.get("work_order_date"), "official", "Work order issued", site.get("agency"), site.get("source_label"), site.get("source_url"))
    add((site.get("tags") or {}).get("start_date") and _d(site["tags"]["start_date"]), "official", "Work start recorded", None, "OpenStreetMap", site.get("source_url"))
    add(site.get("expected_completion"), "milestone", "Expected completion", None, site.get("source_label"), site.get("source_url"))
    add(site.get("actual_completion"), "official", "Completion recorded", None, site.get("source_label"), site.get("source_url"))
    ck = (site.get("tags") or {}).get("check_date")
    add(ck and _d(ck), "source", "Last checked by OpenStreetMap mappers", None, "OpenStreetMap", site.get("source_url"))
    add(site.get("created_at"), "system", "Added to Kaam Dikhao tracking", f"Source: {site.get('source_label') or site.get('origin')}", None, None)
    for r in reports:
        add(r.get("captured_at") or r["created_at"], "evidence", "Citizen photo" + (" (verified)" if r["status"] == "VERIFIED" else " (disputed)"), r.get("note_public"), "Citizen submission", None)
    for f in sats.get("frames", []):
        add(f["acquired_at"], "satellite", "Sentinel-2 scene", f"Cloud cover {round(f['cloud_cover'] or 0)}% · 10 m", "Copernicus Sentinel-2", None)
    for t in rtis:
        add(t.get("filed_on"), "rti", "RTI filed", t["subject"], "RTI Registry", f"/rti/{t['id']}")
        add(t.get("response_on"), "rti", f"RTI reply received ({t['outcome'].lower()})", t["subject"], "RTI Registry", f"/rti/{t['id']}")
    for p in replies:
        add(p["created_at"], "reply", f"Right of reply — {p['org']}", p["body"][:160], "Submitted by the organisation", None)
    ev.sort(key=lambda e: e["at"])
    return ev


def _d(s: str):
    from ..services.osm import _parse_osm_date

    return _parse_osm_date(s)


@router.get("/sites/{slug}")
def site_detail(slug: str, user: auth.User | None = Depends(auth.optional_user)):
    site = db.one("select * from sites where slug=%s or id::text=%s", (slug, slug))
    if site and not site["published"] and not (user and (user.is_mod or str(site["created_by"]) == user.id)):
        site = None
    if not site:
        raise HTTPException(404, "We couldn't find this project.")
    sid = site["id"]
    reports = db.q(f"select id, kind, category, observation, note_public, media_url, thumb_url, captured_at, lat, lng, location_source, distance_to_site_m, exif, ai, status, moderation_reason, moderated_at, created_at from reports where site_id=%s and status in {PUBLIC_REPORT} order by coalesce(captured_at, created_at) desc", (sid,))
    pending = db.one("select count(*) c from reports where site_id=%s and status in ('SUBMITTED','UNDER_REVIEW')", (sid,))["c"]
    mine = []
    if user:
        mine = db.q("select id, kind, observation, note_public, thumb_url, status, created_at from reports where site_id=%s and user_id=%s and status in ('SUBMITTED','UNDER_REVIEW','REJECTED') order by created_at desc", (sid, user.id))
    docs = db.q("select id, kind, title, file_url, source_url, created_at from site_documents where site_id=%s and status='PUBLISHED' order by created_at", (sid,))
    rtis = db.q("select id, reference, subject, authority, outcome, filed_on, response_on from rtis where site_id=%s and status='PUBLISHED' order by filed_on", (sid,))
    replies = db.q("select id, org, author_name, designation, body, doc_url, stance, created_at from replies where site_id=%s and status='PUBLISHED' order by created_at", (sid,))
    sats = sat_svc.observations(str(sid))
    following = bool(user and db.one("select 1 from follows where user_id=%s and site_id=%s", (user.id, sid)))
    city_key = next((k for k, c in CITIES.items() if c["name"] == site["city"]), None)
    nearby = db.q("select id, slug, title, category, status, lat, lng from sites where id<>%s and lat between %s and %s and lng between %s and %s limit 40",
                  (sid, site["lat"] - 0.01, site["lat"] + 0.01, site["lng"] - 0.012, site["lng"] + 0.012))
    for n in nearby:
        n["distance_m"] = round(haversine_m(site["lat"], site["lng"], n["lat"], n["lng"]))
    nearby = sorted(nearby, key=lambda n: n["distance_m"])[:6]
    site_out = {k: v for k, v in site.items() if k != "created_by"}
    return {
        "site": site_out,
        "health": scoring.health(site, reports),
        "timeline_state": scoring.timeline_state(site),
        "reports": reports, "pending_reports": pending, "my_reports": mine,
        "documents": docs, "rtis": rtis, "replies": replies, "satellite": sats,
        "events": _timeline(site, reports, sats, rtis, replies),
        "missing_records": rti_svc.missing_records(site),
        "official_links": {
            "grievance": CITIES.get(city_key, {}).get("grievance") if city_key else NATIONAL_LINKS["cpgrams"],
            "tender": CITIES.get(city_key, {}).get("tender") if city_key else NATIONAL_LINKS["cppp"],
            "rti": NATIONAL_LINKS["rti"], "cpgrams": NATIONAL_LINKS["cpgrams"], "gem": NATIONAL_LINKS["gem"],
            "body": CITIES.get(city_key, {}).get("body") if city_key else None,
        },
        "nearby": nearby, "following": following,
        "freshness": {"last_synced_at": site.get("last_synced_at"), "origin": site["origin"]},
    }


@router.post("/sites/{site_id}/follow")
def follow(site_id: str, user: auth.User = Depends(auth.current_user)):
    db.run("insert into follows(user_id, site_id) values(%s,%s) on conflict do nothing", (user.id, site_id))
    return {"following": True}


@router.delete("/sites/{site_id}/follow")
def unfollow(site_id: str, user: auth.User = Depends(auth.current_user)):
    db.run("delete from follows where user_id=%s and site_id=%s", (user.id, site_id))
    return {"following": False}
