"""Sentinel-2 evidence for a site, straight from open COGs on AWS (Element84 Earth Search STAC).

For a site we:
  1. search the STAC catalogue for cloud-free scenes,
  2. read only a ~1.2 km window around the site (HTTP range reads, no full-tile download),
  3. render true-colour chips (10 m/pixel), and
  4. compute a simple before/after change signal (NDVI + brightness) on cloud-masked pixels.

The result is a *candidate observation*: a 10 m sensor cannot prove or disprove that work
was done. It is presented to humans as context, never as a finding.
"""
from __future__ import annotations

import io
import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta, timezone

import numpy as np
import rasterio
from PIL import Image
from pystac_client import Client
from rasterio.enums import Resampling
from rasterio.env import Env
from rasterio.warp import transform_bounds
from rasterio.windows import from_bounds

from .. import db
from ..util import bbox_around
from . import storage

log = logging.getLogger("kd.sat")
STAC = "https://earth-search.aws.element84.com/v1"
HALF_WIDTH_M = 600
OUT_PX = 240  # 10 m native => 120 px, upsampled 2x for display

_ENV = dict(GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR", CPL_VSIL_CURL_ALLOWED_EXTENSIONS=".tif,.TIF",
            GDAL_HTTP_MAX_RETRY="3", GDAL_HTTP_RETRY_DELAY="1", VSI_CACHE="TRUE")


def _search(lat: float, lng: float, start: date, end: date, max_cloud: float = 30, limit: int = 500):
    cat = Client.open(STAC)
    s = cat.search(collections=["sentinel-2-l2a"], intersects={"type": "Point", "coordinates": [lng, lat]},
                   datetime=f"{start.isoformat()}T00:00:00Z/{end.isoformat()}T23:59:59Z",
                   query={"eo:cloud_cover": {"lt": max_cloud}}, max_items=limit, limit=100)
    items = list(s.items())
    items.sort(key=lambda i: i.datetime)
    return items


def _read(item, asset: str, lat: float, lng: float, res_out: int = OUT_PX) -> tuple[np.ndarray, tuple] | None:
    href = item.assets[asset].href
    s, w, n, e = bbox_around(lat, lng, HALF_WIDTH_M)
    with Env(**_ENV), rasterio.open(href) as ds:
        b = transform_bounds("EPSG:4326", ds.crs, w, s, e, n)
        win = from_bounds(*b, transform=ds.transform)
        data = ds.read(window=win, out_shape=(ds.count, res_out, res_out), resampling=Resampling.bilinear, boundless=True, fill_value=0)
        return data, b


def _cloud_fraction(item, lat: float, lng: float) -> float:
    try:
        scl, _ = _read(item, "scl", lat, lng, 60)
        s = scl[0]
        bad = np.isin(s, [0, 1, 3, 8, 9, 10])  # nodata, saturated, cloud shadow, cloud med/high, cirrus
        return float(bad.mean())
    except Exception:  # noqa: BLE001
        return 1.0


def _true_color(item, lat, lng) -> np.ndarray | None:
    try:
        d, _ = _read(item, "visual", lat, lng)
        return np.moveaxis(d[:3], 0, -1).astype(np.uint8)
    except Exception as e:  # noqa: BLE001
        log.warning("visual read failed %s: %s", item.id, e)
        return None


def _bands(item, lat, lng):
    red, _ = _read(item, "red", lat, lng)
    nir, _ = _read(item, "nir", lat, lng)
    return red[0].astype(np.float32), nir[0].astype(np.float32)


def _png(arr: np.ndarray) -> bytes:
    b = io.BytesIO()
    Image.fromarray(arr).save(b, "JPEG", quality=86)
    return b.getvalue()


_cf_memo: dict[tuple, float] = {}


def _cf(item, lat, lng) -> float:
    key = (item.id, round(lat, 4), round(lng, 4))
    if key not in _cf_memo:
        _cf_memo[key] = _cloud_fraction(item, lat, lng)
    return _cf_memo[key]


def _pick_clear(items, lat, lng, target: date, window_days: int, want: int = 1, max_cf: float = 0.10, tries: int = 10):
    """Scenes nearest to `target` whose local window is (almost) cloud free; falls back to the clearest tried."""
    cands = [i for i in sorted(items, key=lambda i: abs((i.datetime.date() - target).days))
             if abs((i.datetime.date() - target).days) <= window_days][:tries]
    with ThreadPoolExecutor(max_workers=8) as ex:  # range reads are network bound
        list(ex.map(lambda i: _cf(i, lat, lng), cands))
    return [i for i in cands if _cf(i, lat, lng) <= max_cf][:want]


def refresh_site(site_id: str, before: date | None = None, force: bool = False) -> dict:
    site = db.one("select id, lat, lng, created_at from sites where id=%s", (site_id,))
    if not site:
        raise ValueError("site not found")
    if not force:
        fresh = db.one("select 1 from satellite_observations where site_id=%s and created_at > now() - interval '7 days' limit 1", (site_id,))
        if fresh:
            return {"cached": True, **observations(site_id)}
    lat, lng = site["lat"], site["lng"]
    today = date.today()
    items = _search(lat, lng, today - timedelta(days=3 * 365), today)
    if not items:
        return {"cached": False, **observations(site_id), "note": "No cloud-free Sentinel-2 scenes found."}

    after = _pick_clear([i for i in items if i.datetime.date() >= today - timedelta(days=150)][::-1] or items[::-1], lat, lng, today, 150)
    before_target = before or (today - timedelta(days=365))
    bef = _pick_clear(items, lat, lng, before_target, 200, tries=14)
    frames = []
    # up to 6 evenly spaced frames across the last ~3 years for the timeline strip
    targets = [today - timedelta(days=d) for d in (1000, 800, 600, 400, 200, 30)]
    for t in targets:
        c = _pick_clear(items, lat, lng, t, 100)
        if c and all(c[0].id != f.id for f in frames):
            frames.append(c[0])
    for x in [*(bef or []), *(after or [])]:
        if all(x.id != f.id for f in frames):
            frames.append(x)
    frames.sort(key=lambda i: i.datetime)

    db.run("delete from satellite_observations where site_id=%s", (site_id,))
    imgs: dict[str, np.ndarray] = {}
    with ThreadPoolExecutor(max_workers=6) as ex:
        arrays = list(ex.map(lambda i: _true_color(i, lat, lng), frames))
    for it, arr in zip(frames, arrays):
        if arr is None:
            continue
        imgs[it.id] = arr
        url = storage.upload(f"satellite/{site_id}/{it.id}.jpg", _png(arr), "image/jpeg")
        db.run("insert into satellite_observations(site_id,kind,scene_id,acquired_at,cloud_cover,image_url,metrics) values(%s,'frame',%s,%s,%s,%s,%s)",
               (site_id, it.id, it.datetime, it.properties.get("eo:cloud_cover"), url,
                db.js({"platform": it.properties.get("platform"), "gsd_m": 10, "source": "Sentinel-2 L2A (Copernicus / ESA), via Element84 Earth Search"})))

    change = None
    if bef and after and bef[0].id != after[0].id and bef[0].id in imgs and after[0].id in imgs:
        try:
            r0, n0 = _bands(bef[0], lat, lng)
            r1, n1 = _bands(after[0], lat, lng)
            ndvi0 = (n0 - r0) / np.maximum(n0 + r0, 1)
            ndvi1 = (n1 - r1) / np.maximum(n1 + r1, 1)
            dn = ndvi1 - ndvi0
            bright = np.abs(imgs[after[0].id].astype(np.float32).mean(-1) - imgs[bef[0].id].astype(np.float32).mean(-1)) / 255
            changed = (np.abs(dn) > 0.2) | (bright > 0.18)
            frac = float(changed.mean())
            level = "low" if frac < 0.08 else "moderate" if frac < 0.22 else "high"
            heat = np.zeros((*dn.shape, 3), dtype=np.uint8)
            heat[..., 0] = np.clip(changed * 249, 0, 255)
            heat[..., 1] = np.clip(changed * 115, 0, 255)
            base = (imgs[after[0].id] * 0.55).astype(np.uint8)
            overlay = np.where(changed[..., None], (base * 0.4 + heat * 0.6).astype(np.uint8), base)
            url = storage.upload(f"satellite/{site_id}/change-{bef[0].id}-{after[0].id}.jpg", _png(overlay), "image/jpeg")
            change = {"before_scene": bef[0].id, "after_scene": after[0].id,
                      "before_date": bef[0].datetime.date().isoformat(), "after_date": after[0].datetime.date().isoformat(),
                      "changed_pixel_share": round(frac, 3), "level": level,
                      "mean_ndvi_before": round(float(ndvi0.mean()), 3), "mean_ndvi_after": round(float(ndvi1.mean()), 3),
                      "window_m": HALF_WIDTH_M * 2, "gsd_m": 10}
            db.run("insert into satellite_observations(site_id,kind,scene_id,acquired_at,image_url,metrics) values(%s,'change',%s,%s,%s,%s)",
                   (site_id, after[0].id, after[0].datetime, url, db.js(change)))
        except Exception as e:  # noqa: BLE001
            log.warning("change calc failed: %s", e)
    return {"cached": False, **observations(site_id), "change_computed": change is not None}


def observations(site_id: str) -> dict:
    rows = db.q("select kind, scene_id, acquired_at, cloud_cover, image_url, metrics from satellite_observations where site_id=%s order by acquired_at", (site_id,))
    frames = [r for r in rows if r["kind"] == "frame"]
    change = next((r for r in rows if r["kind"] == "change"), None)
    return {"frames": frames, "change": change,
            "label": "Candidate observation — human review required.",
            "source": "Sentinel-2 L2A, Copernicus programme (ESA), 10 m resolution",
            "updated_at": max((r["acquired_at"] for r in rows), default=None)}
