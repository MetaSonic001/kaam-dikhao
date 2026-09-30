"""Nominatim (OpenStreetMap) geocoding with a Postgres cache and polite rate limiting."""
from __future__ import annotations

import re
import threading
import time

import httpx

from .. import db
from ..config import get_settings

_lock = threading.Lock()
_last = 0.0
BASE = "https://nominatim.openstreetmap.org"


def _get(path: str, params: dict) -> dict | list:
    global _last
    with _lock:  # Nominatim usage policy: max 1 request / second
        wait = 1.1 - (time.time() - _last)
        if wait > 0:
            time.sleep(wait)
        try:
            r = httpx.get(f"{BASE}{path}", params=params, timeout=20,
                          headers={"User-Agent": get_settings().nominatim_user_agent, "Accept-Language": "en"})
            r.raise_for_status()
            return r.json()
        finally:
            _last = time.time()


def reverse(lat: float, lng: float, use_network: bool = True) -> dict:
    key = f"r:{lat:.3f}:{lng:.3f}"
    hit = db.one("select data from geocode_cache where key=%s", (key,))
    if hit:
        return _fix_ward(hit["data"])
    if not use_network:
        return {}
    try:
        j = _get("/reverse", {"lat": lat, "lon": lng, "format": "jsonv2", "zoom": 17, "addressdetails": 1})
    except Exception:  # noqa: BLE001
        return {}
    a = j.get("address", {}) if isinstance(j, dict) else {}
    data = {
        "locality": a.get("suburb") or a.get("neighbourhood") or a.get("village") or a.get("quarter"),
        "ward": a.get("city_district") or a.get("borough"),
        "city": a.get("city") or a.get("town") or a.get("municipality") or a.get("state_district"),
        "state": a.get("state"),
        "pincode": a.get("postcode"),
        "road": a.get("road"),
        "address": j.get("display_name") if isinstance(j, dict) else None,
    }
    db.run("insert into geocode_cache(key,data) values(%s,%s) on conflict (key) do nothing", (key, db.js(data)))
    return _fix_ward(data)


def _fix_ward(data: dict) -> dict:
    """Prefer the municipal ward (e.g. 'L Ward') that OSM lists in the display name over the zone."""
    for part in (data.get("address") or "").split(", "):
        if re.search(r"Ward", part, re.I):
            return {**data, "ward": part.strip()}
    return data


def search(query: str, limit: int = 6) -> list[dict]:
    key = f"s:{query.strip().lower()}"
    hit = db.one("select data from geocode_cache where key=%s", (key,))
    if hit:
        return hit["data"]["results"]
    try:
        j = _get("/search", {"q": query, "format": "jsonv2", "countrycodes": "in", "limit": limit, "addressdetails": 1})
    except Exception:  # noqa: BLE001
        return []
    out = [{"name": r.get("display_name"), "lat": float(r["lat"]), "lng": float(r["lon"]),
            "bbox": [float(x) for x in r.get("boundingbox", [])], "type": r.get("type")} for r in j]
    db.run("insert into geocode_cache(key,data) values(%s,%s) on conflict (key) do nothing", (key, db.js({"results": out})))
    return out


def backfill_sites(limit: int = 400) -> int:
    """Attach locality / ward / pincode to sites that lack them (runs in the background)."""
    rows = db.q("select id, lat, lng from sites where locality is null and ward is null order by created_at desc limit %s", (limit,))
    n = 0
    for r in rows:
        g = reverse(r["lat"], r["lng"])
        if not g:
            continue
        db.run("update sites set locality=%s, ward=%s, pincode=coalesce(pincode,%s), address=coalesce(address,%s) where id=%s",
               (g.get("locality") or "—", g.get("ward"), g.get("pincode"), g.get("address"), r["id"]))
        n += 1
    return n
