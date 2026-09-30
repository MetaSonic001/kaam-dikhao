"""Satellite evidence, official documents, RTIs, rights of reply and takedown requests."""
from __future__ import annotations

from datetime import date, datetime

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

from .. import auth, db
from ..cities import CITIES
from ..config import get_settings
from ..services import docs, guard, rti as rti_svc, satellite, storage

router = APIRouter(prefix="/api", tags=["records"])


# ---------------------------------------------------------------- satellite
@router.get("/sites/{site_id}/satellite")
def get_satellite(site_id: str):
    return satellite.observations(site_id)


@router.post("/sites/{site_id}/satellite/refresh", dependencies=[Depends(auth.limit("sat", 20, 3600))])
def refresh_satellite(site_id: str, force: bool = False, before: date | None = None):
    try:
        return satellite.refresh_site(site_id, before, force)
    except ValueError:
        raise HTTPException(404, "Project not found")
    except Exception as e:  # noqa: BLE001
        raise HTTPException(502, f"Satellite catalogue is temporarily unavailable ({type(e).__name__}). Please try again.")


# ---------------------------------------------------------------- documents
@router.post("/sites/{site_id}/documents", dependencies=[Depends(auth.limit("doc", 10, 3600))])
async def upload_document(site_id: str, kind: str = Form("other"), title: str = Form(""), source_url: str = Form(""),
                          file: UploadFile | None = File(default=None), user: auth.User = Depends(auth.current_user)):
    if not db.one("select 1 from sites where id=%s", (site_id,)):
        raise HTTPException(404, "Project not found")
    if not file and not source_url:
        raise HTTPException(400, "Attach the document or link to the official record.")
    file_url, text, fields = None, "", {}
    if file:
        data = await file.read()
        if len(data) > 15 * 1024 * 1024:
            raise HTTPException(413, "Documents must be under 15 MB.")
        text = docs.extract_text(data, file.filename or "", file.content_type)
        ext = (file.filename or "doc").rsplit(".", 1)[-1][:5].lower()
        file_url = storage.upload(f"docs/{site_id}/{datetime.utcnow():%Y%m%d%H%M%S}.{ext}", data, file.content_type or "application/octet-stream")
        fields = docs.extract_fields(text, kind)
    row = db.one(
        "insert into site_documents(site_id,user_id,kind,title,file_url,source_url,extracted,text_excerpt) values(%s,%s,%s,%s,%s,%s,%s,%s) returning id",
        (site_id, user.id, kind, title[:160] or None, file_url, source_url or None, db.js(fields), guard.redact_pii(text[:4000]) or None))
    return {"id": str(row["id"]), "extracted": fields, "status": "UNDER_REVIEW",
            "message": "Thanks. A moderator will check this against the source before any figure is shown as an official record."}


# ---------------------------------------------------------------- RTI
def _rti_row(r: dict) -> dict:
    days = None
    if r.get("filed_on") and r.get("response_on"):
        days = (r["response_on"] - r["filed_on"]).days
    return {**r, "days_taken": days, "within_30_days": (days is not None and days <= 30)}


@router.get("/rti")
def list_rtis(q: str | None = None, outcome: str | None = None, city: str | None = None, limit: int = 30, offset: int = 0):
    where, params = ["status='PUBLISHED'"], []
    if q:
        where.append("(subject ilike %s or authority ilike %s or question_text ilike %s)")
        params += [f"%{q}%"] * 3
    if outcome:
        where.append("outcome=%s")
        params.append(outcome)
    if city:
        where.append("lower(city)=lower(%s)")
        params.append(CITIES.get(city.lower(), {}).get("name", city))
    w = " and ".join(where)
    total = db.one(f"select count(*) c from rtis where {w}", params)["c"]
    rows = db.q(f"select id, reference, subject, authority, outcome, filed_on, response_on, summary_ai, city, site_id from rtis where {w} order by coalesce(response_on, filed_on) desc nulls last limit %s offset %s", [*params, min(limit, 100), offset])
    return {"total": total, "items": [_rti_row(r) for r in rows]}


@router.get("/rti/{rid}")
def rti_detail(rid: str):
    r = db.one("select * from rtis where id=%s and status='PUBLISHED'", (rid,))
    if not r:
        raise HTTPException(404, "We couldn't find this RTI.")
    r.pop("user_id", None)
    site = db.one("select slug, title from sites where id=%s", (r["site_id"],)) if r["site_id"] else None
    return {**_rti_row(r), "site": site,
            "outcome_analysis": {"response_received": r["response_on"] is not None or r["outcome"] not in ("PENDING", "NO_RESPONSE"),
                                 "statutory_days": 30}}


class DraftIn(BaseModel):
    site_id: str | None = None
    authority: str | None = None
    keys: list[str] = []
    applicant: dict | None = None
    location_hint: str | None = None
    lang: str = "en"


@router.post("/rti/draft", dependencies=[Depends(auth.limit("rti-draft", 30, 3600))])
def rti_draft(body: DraftIn):
    site = db.one("select * from sites where id=%s", (body.site_id,)) if body.site_id else None
    city_body = next((c["body"] for c in CITIES.values() if site and c["name"] == site["city"]), None)
    authority = body.authority or (site and site.get("agency")) or city_body or "[Name of the public authority]"
    keys = body.keys or (rti_svc.missing_records(site) if site else [])
    return rti_svc.draft(site, authority, keys, body.applicant, body.location_hint, body.lang) | {"available_questions": rti_svc.QUESTIONS}


@router.post("/rti", dependencies=[Depends(auth.limit("rti-submit", 10, 3600))])
async def register_rti(authority: str = Form(...), subject: str = Form(...), question_text: str = Form(...), site_id: str = Form(""),
                       reference: str = Form(""), filed_on: str = Form(""), response_on: str = Form(""),
                       reply: UploadFile | None = File(default=None), user: auth.User = Depends(auth.current_user)):
    reply_text, summary, outcome = "", None, "PENDING"
    if reply:
        data = await reply.read()
        if len(data) > 15 * 1024 * 1024:
            raise HTTPException(413, "Files must be under 15 MB.")
        reply_text = docs.extract_text(data, reply.filename or "", reply.content_type)
    if reply_text:
        s = rti_svc.summarize_reply(question_text, reply_text)
        if s:
            summary = s.get("summary")
            outcome = s.get("outcome") if s.get("outcome") in ("FULL", "PARTIAL", "REJECTED", "TRANSFERRED", "NO_RESPONSE") else "PARTIAL"
    doc_url = storage.upload(f"rti/{user.id}/{datetime.utcnow():%Y%m%d%H%M%S}-{(reply.filename or 'reply').split('.')[-1][:4]}", data, reply.content_type or "application/octet-stream") if reply else None
    site = db.one("select city, state from sites where id=%s", (site_id,)) if site_id else None
    row = db.one(
        """insert into rtis(reference,site_id,user_id,authority,subject,question_text,filed_on,response_on,outcome,response_text,summary_ai,document_url,city,state)
           values(%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) returning id""",
        (reference[:60] or None, site_id or None, user.id, authority[:200], guard.redact_pii(subject)[:200], guard.redact_pii(question_text)[:4000],
         filed_on or None, response_on or None, outcome, guard.redact_pii(reply_text)[:8000] or None, summary, doc_url,
         site["city"] if site else None, site["state"] if site else None))
    return {"id": str(row["id"]), "status": "UNDER_REVIEW", "summary": summary, "outcome": outcome,
            "message": "Received. Personal details are removed and a moderator reviews it before it appears in the registry."}


# ---------------------------------------------------------------- right of reply
class ReplyIn(BaseModel):
    site_id: str
    org: str = Field(min_length=2, max_length=160)
    author_name: str = Field(default="", max_length=120)
    designation: str = Field(default="", max_length=120)
    contact_email: str = Field(min_length=5, max_length=160)
    body: str = Field(min_length=10, max_length=3000)
    stance: str = "response"
    report_id: str | None = None


@router.post("/replies", dependencies=[Depends(auth.limit("reply", 5, 3600))])
def submit_reply(body: ReplyIn):
    if not db.one("select 1 from sites where id=%s", (body.site_id,)):
        raise HTTPException(404, "Project not found")
    stance = body.stance if body.stance in ("response", "dispute", "correction", "clarification") else "response"
    row = db.one("insert into replies(site_id,report_id,org,author_name,designation,contact_email,body,stance) values(%s,%s,%s,%s,%s,%s,%s,%s) returning id",
                 (body.site_id, body.report_id, body.org, body.author_name or None, body.designation or None, body.contact_email, body.body, stance))
    return {"id": str(row["id"]), "message": "Received. We verify the sender through the contact given, then publish the reply next to the original evidence. Nothing is removed."}


# ---------------------------------------------------------------- takedown / grievance
class TakedownIn(BaseModel):
    target_url: str = Field(default="", max_length=400)
    reason: str = Field(min_length=3, max_length=80)
    details: str = Field(min_length=10, max_length=3000)
    contact_name: str = Field(default="", max_length=120)
    contact_email: str = Field(min_length=5, max_length=160)


@router.post("/takedowns", dependencies=[Depends(auth.limit("takedown", 5, 3600))])
def takedown(body: TakedownIn):
    row = db.one(
        "insert into takedowns(target_url,reason,details,contact_name,contact_email,status,ack_at) values(%s,%s,%s,%s,%s,'ACKNOWLEDGED',now()) returning id, created_at",
        (body.target_url or None, body.reason, body.details, body.contact_name or None, body.contact_email))
    return {"reference": f"KD-G-{str(row['id'])[:8].upper()}", "acknowledged_at": row["created_at"],
            "message": f"Your complaint is acknowledged. We review it and respond within 15 days. You can also write to {get_settings().grievance_email}."}
