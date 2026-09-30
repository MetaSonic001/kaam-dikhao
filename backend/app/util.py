"""Small shared helpers: geometry, slugs, JSON-safe rows."""
from __future__ import annotations

import math
import re
import unicodedata
from datetime import date, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

EARTH_R = 6_371_000.0


def haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = p2 - p1
    dl = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * EARTH_R * math.asin(math.sqrt(a))


def bbox_around(lat: float, lng: float, radius_m: float) -> tuple[float, float, float, float]:
    dlat = radius_m / 111_320.0
    dlng = radius_m / (111_320.0 * max(math.cos(math.radians(lat)), 0.01))
    return lat - dlat, lng - dlng, lat + dlat, lng + dlng


def dist_to_polyline_m(lat: float, lng: float, coords: list[list[float]]) -> float:
    """Min distance from a point to a GeoJSON-ordered [lng, lat] polyline, in metres."""
    if not coords:
        return float("inf")
    kx = 111_320.0 * math.cos(math.radians(lat))
    ky = 110_540.0

    def xy(c: list[float]) -> tuple[float, float]:
        return (c[0] - lng) * kx, (c[1] - lat) * ky

    best = float("inf")
    pts = [xy(c) for c in coords]
    if len(pts) == 1:
        return math.hypot(*pts[0])
    for (ax, ay), (bx, by) in zip(pts, pts[1:]):
        dx, dy = bx - ax, by - ay
        seg = dx * dx + dy * dy
        t = 0.0 if seg == 0 else max(0.0, min(1.0, -(ax * dx + ay * dy) / seg))
        best = min(best, math.hypot(ax + t * dx, ay + t * dy))
    return best


def slugify(text: str, max_len: int = 60) -> str:
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch) or ord(ch) > 0x900)
    text = re.sub(r"[^\wऀ-ॿ]+", "-", text.lower(), flags=re.UNICODE).strip("-")
    return (text or "site")[:max_len].strip("-")


def jsonable(v: Any) -> Any:
    if isinstance(v, dict):
        return {k: jsonable(x) for k, x in v.items()}
    if isinstance(v, (list, tuple)):
        return [jsonable(x) for x in v]
    if isinstance(v, (datetime, date)):
        return v.isoformat()
    if isinstance(v, Decimal):
        return float(v)
    if isinstance(v, UUID):
        return str(v)
    return v
