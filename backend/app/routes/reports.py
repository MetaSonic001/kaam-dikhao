"""Citizen reporting: photo/voice/text -> analysis -> user confirms the match -> moderation queue."""
from __future__ import annotations

import math
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field
from rapidfuzz import fuzz

from .. import auth, db
from ..cities import CITIES, city_for_point
from ..services import geocode, guard, llm, media, storage
from ..util import bbox_around, dist_to_polyline_m, haversine_m, slugify

router = APIRouter(prefix="/api/reports", tags=["reports"])

CATEGORIES = ["road", "drainage", "footpath", "park", "bridge", "water", "building", "streetlight", "waste", "transit", "other"]
OBSERVATIONS = ["progress", "completed", "issue", "not_started", "other"]
MAX_PHOTO = 12 * 1024 * 1024


def _site_distance(site: dict, lat: float, lng: float) -> float:
    geom = site.get("geometry")
    if geom and geom.get("type") == "MultiLineString":
        return min(dist_to_polyline_m(lat, lng, ln) for ln in geom["coordinates"])
    if geom and geom.get("type") == "LineString":
        return dist_to_polyline_m(lat, lng, geom["coordinates"])
    return haversine_m(lat, lng, site["lat"], site["lng"])


def candidates(lat: float, lng: float, category: str | None, text: str, radius_m: float = 350) -> list[dict]:
    s, w, n, e = bbox_around(lat, lng, radius_m + 600)  # widen: long roads are far from their centroid
    rows = db.q("select id, slug, title, category, status, lat, lng, geometry, origin, locality, city from sites where published and lat between %s and %s and lng between %s and %s", (s, n, w, e))
    out = []
    for r in rows:
        d = _site_distance(r, lat, lng)
        if d > radius_m:
            continue
        dist_score = math.exp(-d / 120)
        cat = 1.0 if category and r["category"] == category else 0.0
        name = fuzz.partial_ratio(r["title"].lower(), text.lower()) / 100 if text and len(text) > 4 else 0.0
        score = 0.55 * dist_score + 0.2 * cat + 0.25 * (name if name > 0.75 else 0)
        reasons = [f"{round(d)} m from the mapped location"]
        if cat:
            reasons.append("same type of work")
        if name > 0.75:
            reasons.append("name mentioned in your note")
        out.append({"id": str(r["id"]), "slug": r["slug"], "title": r["title"], "category": r["category"], "status": r["status"],
                    "origin": r["origin"], "locality": r["locality"], "distance_m": round(d), "match_pct": round(min(score, 0.99) * 100), "reasons": reasons})
    out.sort(key=lambda c: -c["match_pct"])
    return out[:5]


def _resize_for_vision(jpeg: bytes) -> bytes:
    import io

    from PIL import Image

    im = Image.open(io.BytesIO(jpeg))
    im.thumbnail((768, 768))
    b = io.BytesIO()
    im.save(b, "JPEG", quality=78)
    return b.getvalue()


VISION_SYS = (
    "You look at one citizen photo of public infrastructure in India and return CANDIDATE observations for a human moderator. "
    f"JSON keys: category (one of {CATEGORIES}), observation (one of {OBSERVATIONS}: progress=work visibly ongoing, "
    "completed=looks finished, issue=visible defect or hazard, not_started=no visible work), visible (list of up to 5 short neutral "
    "factual phrases about what is visible, e.g. 'water pooled on carriageway'), issues (list from: pothole, cracks, standing_water, "
    "uneven_surface, exposed_reinforcement, open_manhole, missing_cover, debris, unfinished_surface, broken_footpath, none), "
    "is_infrastructure (boolean), people_or_plates_visible (boolean), quality (one of good, ok, poor), confidence (0..1). "
    "Do not identify people. Do not judge who is responsible."
)


@router.post("/analyze", dependencies=[Depends(auth.limit("analyze", 30, 3600))])
async def analyze(
    photos: list[UploadFile] = File(default=[]), audio: UploadFile | None = File(default=None),
    note: str = Form(""), lang: str = Form("en"), lat: float | None = Form(None), lng: float | None = Form(None),
    category: str | None = Form(None), user: auth.User = Depends(auth.current_user),
):
    if not photos and not audio and not note.strip():
        raise HTTPException(400, "Add a photo, a voice note or a short description.")
    if len(photos) > 4:
        raise HTTPException(400, "Please add at most 4 photos per report.")
    items, flags = [], []
    for f in photos:
        raw = await f.read()
        if len(raw) > MAX_PHOTO:
            raise HTTPException(413, "Photos must be under 12 MB.")
        try:
            p = media.process_photo(raw)
        except Exception:  # noqa: BLE001
            raise HTTPException(400, f"{f.filename} could not be read as an image.")
        if db.one("select 1 from reports where media_sha256=%s", (p["sha256"],)):
            raise HTTPException(409, "This photo has already been submitted.")
        path = f"pending/{user.id}/{p['sha256'][:24]}"
        p["media_url"] = storage.upload(f"{path}.jpg", p.pop("public_jpeg"), "image/jpeg")
        p["thumb_url"] = storage.upload(f"{path}-t.jpg", p.pop("thumb_jpeg"), "image/jpeg")
        items.append(p)

    # --- location: EXIF GPS first, then the device's location, then manual pin
    loc, src = None, None
    ex_loc = next(((i["exif"]["lat"], i["exif"]["lng"]) for i in items if i["exif"].get("lat") is not None), None)
    if ex_loc:
        loc, src = ex_loc, "exif"
        if lat is not None and lng is not None and haversine_m(*ex_loc, lat, lng) > 500:
            flags.append("photo_gps_differs_from_device")
    elif lat is not None and lng is not None:
        loc, src = (lat, lng), "device"
    captured = next((i["exif"]["captured_at"] for i in items if i["exif"].get("captured_at")), None)
    if captured:
        age = datetime.now(timezone.utc) - datetime.fromisoformat(captured)
        if age > timedelta(days=30):
            flags.append("photo_older_than_30_days")
        if age < timedelta(minutes=-10):
            flags.append("photo_timestamp_in_future")
    elif items:
        flags.append("no_capture_time")
    if items and any(i["sharpness"] < 40 for i in items):
        flags.append("photo_blurry")
    if loc and not city_for_point(*loc):
        flags.append("outside_supported_cities")

    # --- voice note -> text (Whisper)
    transcript = None
    if audio:
        data = await audio.read()
        if len(data) > 15 * 1024 * 1024:
            raise HTTPException(413, "Voice notes must be under 15 MB.")
        transcript = llm.transcribe(data, audio.filename or "voice.webm", lang if lang in ("hi", "mr", "en") else None)

    # --- vision (candidate only)
    ai = None
    if items:
        with_jpeg = None
        try:
            import httpx

            r = httpx.get(items[0]["media_url"], timeout=20) if items[0]["media_url"].startswith("http") else None
            with_jpeg = r.content if r is not None and r.status_code == 200 else None
        except Exception:  # noqa: BLE001
            pass
        if with_jpeg is None and items[0]["media_url"].startswith("/media/"):
            from ..services.storage import LOCAL_DIR

            with_jpeg = (LOCAL_DIR / items[0]["media_url"].removeprefix("/media/")).read_bytes()
        if with_jpeg:
            ai = llm.vision_json([(_resize_for_vision(with_jpeg), "image/jpeg")], VISION_SYS, "Analyse this photo.")
    full_text = " ".join(x for x in [note.strip(), (transcript or {}).get("text", "")] if x)
    cat_guess = category if category in CATEGORIES else (ai or {}).get("category") if (ai or {}).get("category") in CATEGORIES else None

    place = geocode.reverse(*loc) if loc else {}
    cands = candidates(loc[0], loc[1], cat_guess, full_text) if loc else []
    public_note, note_flags = guard.neutralize(full_text, lang) if full_text else ("", [])
    flags += note_flags
    if ai and ai.get("people_or_plates_visible"):
        flags.append("people_or_plates_visible")
    if any(i["plates_blurred"] < 0 for i in items):
        flags.append("plate_detector_unavailable")

    label = {"road": "Road", "drainage": "Drain", "footpath": "Footpath", "park": "Park", "bridge": "Bridge", "water": "Water supply",
             "building": "Building", "streetlight": "Streetlight", "waste": "Waste", "transit": "Transit", "other": "Site"}.get(cat_guess or "other", "Site")
    suggested = {"title": f"{label} — {place.get('road') or place.get('locality') or 'reported location'}", "category": cat_guess or "other"}

    draft = {"photos": [{k: i[k] for k in ("sha256", "exif", "media_url", "thumb_url", "faces_blurred", "plates_blurred", "sharpness", "width", "height")} for i in items],
             "location": {"lat": loc[0], "lng": loc[1], "source": src} if loc else None, "captured_at": captured,
             "note_original": full_text, "note_public": public_note, "transcript": transcript, "ai": ai, "flags": flags, "place": place, "lang": lang}
    did = db.one("insert into report_drafts(user_id, data) values(%s,%s) returning id", (user.id, db.js(draft)))["id"]
    return {"draft_id": str(did), "location": draft["location"], "place": place, "captured_at": captured, "photos": draft["photos"],
            "transcript": transcript, "ai": ai, "ai_label": "AI-generated observations — please check before submitting.",
            "note_public": public_note, "flags": flags, "candidates": cands, "suggested_new": suggested,
            "privacy": {"faces_blurred": sum(i["faces_blurred"] for i in items), "plates_blurred": sum(max(i["plates_blurred"], 0) for i in items), "plate_check_ran": all(i["plates_blurred"] >= 0 for i in items), "exif_removed": True}}


class CreateReport(BaseModel):
    draft_id: str
    site_id: str | None = None
    new_site: dict | None = None
    observation: str = "other"
    category: str | None = None
    note: str = Field(default="", max_length=1500)
    consent: bool = False
    lat: float | None = None
    lng: float | None = None


@router.post("", dependencies=[Depends(auth.limit("create-report", 15, 3600))])
def create(body: CreateReport, user: auth.User = Depends(auth.current_user)):
    if not body.consent:
        raise HTTPException(400, "Please confirm the consent statement to submit.")
    d = db.one("select data from report_drafts where id=%s and user_id=%s", (body.draft_id, user.id))
    if not d:
        raise HTTPException(404, "This draft has expired. Please start again.")
    data = d["data"]
    loc = data.get("location") or ({"lat": body.lat, "lng": body.lng, "source": "manual"} if body.lat is not None and body.lng is not None else None)
    if not loc:
        raise HTTPException(400, "We need a location. Allow location access or drop a pin on the map.")
    obs = body.observation if body.observation in OBSERVATIONS else "other"
    note_orig = body.note.strip() or data.get("note_original") or ""
    public_note, note_flags = guard.neutralize(note_orig, data.get("lang", "en")) if note_orig else ("", [])
    flags = sorted({*data.get("flags", []), *note_flags})

    if body.site_id:
        site = db.one("select id, slug, geometry, lat, lng, published from sites where id=%s", (body.site_id,))
        if not site:
            raise HTTPException(404, "That project no longer exists.")
        site_id = site["id"]
        dist = _site_distance(site, loc["lat"], loc["lng"])
    else:
        ns = body.new_site or {}
        title = (ns.get("title") or "").strip()[:120]
        if len(title) < 3:
            raise HTTPException(400, "Give the new location a short name.")
        title = guard.redact_pii(title)
        cat = ns.get("category") if ns.get("category") in CATEGORIES else "other"
        place = data.get("place") or geocode.reverse(loc["lat"], loc["lng"])
        city_key = city_for_point(loc["lat"], loc["lng"])
        base = f"{city_key or 'india'}-{slugify(title)}"
        slug, n = base, 2
        while db.one("select 1 from sites where slug=%s", (slug,)):
            slug = f"{base}-{n}"
            n += 1
        site_id = db.one(
            """insert into sites(slug,title,category,lat,lng,city,state,locality,ward,pincode,address,origin,status,claim_text,created_by,published,source_label)
               values(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'citizen','INSUFFICIENT_EVIDENCE',%s,%s,false,'Citizen-reported place') returning id""",
            (slug, title, cat, loc["lat"], loc["lng"], (CITIES[city_key]["name"] if city_key else place.get("city")), (CITIES[city_key]["state"] if city_key else place.get("state")),
             place.get("locality"), place.get("ward"), place.get("pincode"), place.get("address"),
             "No official record is linked to this place yet. It was reported by a citizen and is awaiting review.", user.id),
        )["id"]
        dist = 0.0

    ids = []
    photos = data.get("photos") or []
    for i, p in enumerate(photos or [None]):
        rid = db.one(
            """insert into reports(site_id,user_id,kind,category,observation,note_public,note_original,lang,media_url,thumb_url,media_sha256,captured_at,lat,lng,
               location_source,distance_to_site_m,exif,ai,flags,status)
               values(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'SUBMITTED') returning id""",
            (site_id, user.id, "photo" if p else ("voice" if data.get("transcript") else "text"), body.category or (data.get("ai") or {}).get("category"), obs,
             public_note if i == 0 else None, note_orig if i == 0 else None, data.get("lang"), p and p["media_url"], p and p["thumb_url"], p and p["sha256"],
             data.get("captured_at"), loc["lat"], loc["lng"], loc.get("source"), round(dist, 1), db.js((p or {}).get("exif", {})),
             db.js(data.get("ai") or {}), db.js(flags)),
        )["id"]
        ids.append(str(rid))
    db.run("delete from report_drafts where id=%s", (body.draft_id,))
    auth.audit(user, "report_submitted", "report", ids[0], after={"site_id": str(site_id), "flags": flags})
    site_row = db.one("select slug from sites where id=%s", (site_id,))
    return {"ids": ids, "site_slug": site_row["slug"], "status": "SUBMITTED",
            "message": "Received. A human moderator reviews every report before it is published.",
            "steps": ["Received", "Automated checks", "Under review", "Published or returned"]}


@router.get("/mine")
def mine(user: auth.User = Depends(auth.current_user)):
    return db.q(
        """select r.id, r.kind, r.observation, r.note_public, r.thumb_url, r.status, r.moderation_reason, r.created_at, r.moderated_at,
           s.slug as site_slug, s.title as site_title from reports r join sites s on s.id=r.site_id where r.user_id=%s order by r.created_at desc limit 100""", (user.id,))


@router.get("/recent")
def recent(limit: int = 8, city: str | None = None):
    params: list = []
    where = "r.status='VERIFIED' and s.published"
    if city:
        where += " and lower(s.city)=lower(%s)"
        params.append(CITIES.get(city.lower(), {}).get("name", city))
    return db.q(
        f"""select r.id, r.observation, r.note_public, r.thumb_url, r.captured_at, r.created_at, s.slug as site_slug, s.title as site_title, s.locality, s.city
            from reports r join sites s on s.id=r.site_id where {where} order by coalesce(r.captured_at, r.created_at) desc limit %s""", [*params, min(limit, 30)])
