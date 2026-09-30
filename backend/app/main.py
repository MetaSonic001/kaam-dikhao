"""Kaam Dikhao API. Run:  uvicorn app.main:app --port 8000"""
from __future__ import annotations

import logging
import threading
import time
from contextlib import asynccontextmanager

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from . import auth, db
from .cities import CITIES
from .config import get_settings
from .routes import assistant, insights, moderation, records, reports, sites
from .etl import official
from .services import geocode, osm, rag, storage

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("kd")
scheduler = BackgroundScheduler(timezone="UTC")


def _sync(city: str) -> None:
    try:
        r = osm.sync_city(city)
        log.info("synced %s: %s", city, r)
        geocode.backfill_sites(300)
        official.run()
        rag.reindex()
    except Exception as e:  # noqa: BLE001
        log.warning("sync %s failed: %s", city, e)


def _bootstrap() -> None:
    s = get_settings()
    try:
        official.run()  # queue curated official records for review (idempotent)
        rag.reindex()  # first: the assistant works immediately
        if geocode.backfill_sites(300):
            rag.reindex()
    except Exception as e:  # noqa: BLE001
        log.warning("bootstrap indexing failed: %s", e)
    if not s.sync_on_startup:
        return
    order = [s.default_city, *[c for c in CITIES if c != s.default_city]]
    for c in order:  # bring cities up gradually and politely; only those with no data yet
        if db.one("select count(*) c from sites where origin='osm' and city=%s", (CITIES[c]["name"],))["c"] == 0:
            _sync(c)
            time.sleep(20)


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_schema()
    storage.ensure_bucket()
    threading.Thread(target=_bootstrap, daemon=True, name="bootstrap").start()
    # Refresh every city every 6 hours, staggered. In-process scheduler: no Redis, no workers.
    for i, c in enumerate(CITIES):
        scheduler.add_job(_sync, "interval", hours=6, args=[c], id=f"sync-{c}", jitter=300 * (i + 1), misfire_grace_time=3600)
    scheduler.start()
    yield
    scheduler.shutdown(wait=False)


app = FastAPI(title="Kaam Dikhao API", version="1.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=get_settings().origins, allow_methods=["*"], allow_headers=["*"], allow_credentials=False)

for r in (sites.router, reports.router, records.router, insights.router, assistant.router, moderation.router):
    app.include_router(r)

from .services.storage import LOCAL_DIR  # noqa: E402

LOCAL_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=str(LOCAL_DIR)), name="media")


@app.get("/api/health")
def health():
    row = db.one("select count(*) c from sites")
    return {"ok": True, "sites": row["c"], "llm": bool(get_settings().groq_api_key)}


@app.get("/api/me")
def me(user: auth.User = Depends(auth.current_user)):
    counts = db.one("select count(*) total, count(*) filter (where status='VERIFIED') verified from reports where user_id=%s", (user.id,))
    return {"id": user.id, "email": user.email, "role": user.role, "lang": user.lang, "submissions": counts["total"], "verified": counts["verified"],
            "following": db.q("select s.slug, s.title, s.status from follows f join sites s on s.id=f.site_id where f.user_id=%s order by f.created_at desc", (user.id,))}


class Lang(BaseModel):
    lang: str


@app.patch("/api/me")
def set_lang(body: Lang, user: auth.User = Depends(auth.current_user)):
    if body.lang in ("en", "hi", "mr"):
        db.run("update profiles set lang=%s where id=%s", (body.lang, user.id))
    return {"ok": True}


@app.exception_handler(Exception)
async def unhandled(_, exc: Exception):
    log.exception("unhandled: %s", exc)
    return JSONResponse({"detail": "Something went wrong on our side. Please try again."}, status_code=500)
