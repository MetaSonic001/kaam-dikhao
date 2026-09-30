"""Media storage on Supabase Storage, with a local-disk fallback so dev never blocks."""
from __future__ import annotations

import logging
from pathlib import Path

import httpx

from ..config import ROOT, get_settings

log = logging.getLogger("kd.storage")
LOCAL_DIR = ROOT / "backend" / "data" / "media"
_ready: bool | None = None


def _headers(extra: dict | None = None) -> dict:
    s = get_settings()
    h = {"apikey": s.supabase_secret_key}
    if s.supabase_secret_key.startswith("ey"):  # legacy JWT-style key
        h["Authorization"] = f"Bearer {s.supabase_secret_key}"
    return {**h, **(extra or {})}


def ensure_bucket() -> bool:
    global _ready
    if _ready is not None:
        return _ready
    s = get_settings()
    if not (s.supabase_url and s.supabase_secret_key):
        _ready = False
        return False
    try:
        r = httpx.post(f"{s.supabase_url}/storage/v1/bucket", headers=_headers(),
                       json={"id": s.storage_bucket, "name": s.storage_bucket, "public": True,
                             "file_size_limit": 12 * 1024 * 1024}, timeout=20)
        _ready = r.status_code in (200, 201) or "already exists" in r.text.lower() or r.status_code == 409
        if not _ready:
            log.warning("storage bucket setup failed: %s %s", r.status_code, r.text[:200])
    except Exception as e:  # noqa: BLE001
        log.warning("storage unavailable: %s", e)
        _ready = False
    return bool(_ready)


def public_url(path: str) -> str:
    s = get_settings()
    if ensure_bucket():
        return f"{s.supabase_url}/storage/v1/object/public/{s.storage_bucket}/{path}"
    return f"/media/{path}"


def upload(path: str, data: bytes, content_type: str) -> str:
    """Returns a URL. Falls back to local disk (served at /media) if Supabase is unreachable."""
    s = get_settings()
    if ensure_bucket():
        try:
            r = httpx.post(
                f"{s.supabase_url}/storage/v1/object/{s.storage_bucket}/{path}",
                headers=_headers({"Content-Type": content_type, "x-upsert": "true"}),
                content=data, timeout=60,
            )
            if r.status_code in (200, 201):
                return public_url(path)
            log.warning("storage upload failed %s %s", r.status_code, r.text[:200])
        except Exception as e:  # noqa: BLE001
            log.warning("storage upload error: %s", e)
    dest = LOCAL_DIR / path
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
    return f"/media/{path}"


def delete(url: str) -> None:
    s = get_settings()
    marker = f"/object/public/{s.storage_bucket}/"
    if marker in url and ensure_bucket():
        path = url.split(marker, 1)[1]
        try:
            httpx.request("DELETE", f"{s.supabase_url}/storage/v1/object/{s.storage_bucket}",
                          headers=_headers(), json={"prefixes": [path]}, timeout=20)
        except Exception:  # noqa: BLE001
            pass
    elif url.startswith("/media/"):
        p = LOCAL_DIR / url.removeprefix("/media/")
        if Path(p).exists():
            Path(p).unlink()
