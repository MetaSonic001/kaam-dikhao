"""Human moderation. Nothing citizen-submitted becomes public without a moderator decision."""
from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel

from .. import auth, db
from ..services import rag, rti as rti_svc

router = APIRouter(prefix="/api/mod", tags=["moderation"])


def _reindex() -> None:
    try:
        rag.reindex()
    except Exception:  # noqa: BLE001
        pass


@router.get("/queue")
def queue(user: auth.User = Depends(auth.moderator)):
    reports = db.q(
        """select r.id, r.kind, r.category, r.observation, r.note_public, r.note_original, r.media_url, r.thumb_url, r.captured_at, r.created_at,
           r.lat, r.lng, r.location_source, r.distance_to_site_m, r.exif, r.ai, r.flags, r.status, s.slug as site_slug, s.title as site_title,
           s.origin as site_origin, s.published as site_published
           from reports r join sites s on s.id=r.site_id where r.status in ('SUBMITTED','UNDER_REVIEW') order by r.created_at""")
    return {
        "reports": reports,
        "documents": db.q("select d.*, s.title as site_title, s.slug as site_slug from site_documents d left join sites s on s.id=d.site_id where d.status='UNDER_REVIEW' order by d.created_at"),
        "rtis": db.q("select * from rtis where status='UNDER_REVIEW' order by created_at"),
        "replies": db.q("select p.*, s.title as site_title, s.slug as site_slug from replies p join sites s on s.id=p.site_id where p.status='UNDER_REVIEW' order by p.created_at"),
        "takedowns": db.q("select * from takedowns where status in ('RECEIVED','ACKNOWLEDGED') order by created_at"),
    }


class Decision(BaseModel):
    action: str  # approve | reject | dispute | more_evidence
    reason: str = ""
    note_public: str | None = None


@router.post("/reports/{rid}")
def decide_report(rid: str, body: Decision, bg: BackgroundTasks, user: auth.User = Depends(auth.moderator)):
    status = {"approve": "VERIFIED", "reject": "REJECTED", "dispute": "DISPUTED", "more_evidence": "UNDER_REVIEW"}.get(body.action)
    if not status:
        raise HTTPException(400, "Unknown action")
    if body.action in ("reject", "dispute", "more_evidence") and not body.reason.strip():
        raise HTTPException(400, "A reason is required. It is shown to the submitter and kept in the audit log.")
    before = db.one("select status, site_id, note_public from reports where id=%s", (rid,))
    if not before:
        raise HTTPException(404, "Report not found")
    db.run("update reports set status=%s, moderator_id=%s, moderation_reason=%s, moderated_at=now(), note_public=coalesce(%s, note_public) where id=%s",
           (status, user.id, body.reason or None, body.note_public, rid))
    if status in ("VERIFIED", "DISPUTED"):
        db.run("update sites set published=true, updated_at=now() where id=%s", (before["site_id"],))
    auth.audit(user, f"report_{body.action}", "report", rid, {"status": before["status"]}, {"status": status}, body.reason)
    bg.add_task(_reindex)
    return {"ok": True, "status": status}


class SitePatch(BaseModel):
    status: str | None = None
    sanctioned_amount: float | None = None
    awarded_amount: float | None = None
    contractor: str | None = None
    agency: str | None = None
    work_order_date: str | None = None
    expected_completion: str | None = None
    actual_completion: str | None = None
    source_url: str | None = None
    claim_text: str | None = None
    reason: str


@router.patch("/sites/{sid}")
def patch_site(sid: str, body: SitePatch, user: auth.User = Depends(auth.moderator)):
    fields = {k: v for k, v in body.model_dump().items() if v not in (None, "") and k != "reason"}
    if not fields:
        raise HTTPException(400, "Nothing to change")
    allowed = {"IN_PROGRESS", "COMPLETED", "DELAYED", "UNDER_REVIEW", "DISPUTED", "INSUFFICIENT_EVIDENCE", "PLANNED", "TENDERED", "AWARDED"}
    if fields.get("status") and fields["status"] not in allowed:
        raise HTTPException(400, "Invalid status")
    before = db.one("select * from sites where id=%s", (sid,))
    if not before:
        raise HTTPException(404, "Not found")
    sets = ", ".join(f"{k}=%s" for k in fields)
    db.run(f"update sites set {sets}, updated_at=now() where id=%s", [*fields.values(), sid])
    auth.audit(user, "site_edit", "site", sid, {k: str(before.get(k)) for k in fields}, fields, body.reason)
    return {"ok": True}


@router.post("/documents/{did}")
def decide_doc(did: str, body: Decision, user: auth.User = Depends(auth.moderator)):
    doc = db.one("select * from site_documents where id=%s", (did,))
    if not doc:
        raise HTTPException(404, "Not found")
    if body.action == "approve":
        db.run("update site_documents set status='PUBLISHED' where id=%s", (did,))
        ex = doc["extracted"] or {}
        if doc["site_id"] and ex:
            sets, vals = [], []
            for col, key in (("sanctioned_amount", "amount"), ("contractor", "contractor"), ("agency", "department"),
                             ("work_order_date", "work_order_date"), ("expected_completion", "completion_date")):
                if ex.get(key) not in (None, ""):
                    sets.append(f"{col}=%s")
                    vals.append(ex[key])
            if ex.get("programme_amount"):  # a programme total is context, never a per-section amount
                prog = {"name": ex.get("programme_name"), "amount_inr": ex["programme_amount"], "source_url": doc.get("source_url"), "source_label": doc.get("title")}
                sets.append("tags = tags || %s")
                vals.append(db.js({"programme": prog}))
                sets.append("claim_text = %s")
                vals.append(f"Part of an officially approved programme: {ex.get('programme_name')}. The approved cost covers the whole programme, not this section alone.")
            if doc.get("source_url"):
                sets += ["source_url=%s", "source_label=%s"]
                vals += [doc["source_url"], doc.get("title") or "Official record (document attached)"]
            if sets:
                for target in (ex.get("site_ids") or [doc["site_id"]]):
                    db.run(f"update sites set {', '.join(sets)}, updated_at=now() where id=%s", [*vals, target])
    else:
        db.run("update site_documents set status='REJECTED' where id=%s", (did,))
    auth.audit(user, f"document_{body.action}", "document", did, reason=body.reason)
    return {"ok": True}


@router.post("/rtis/{rid}")
def decide_rti(rid: str, body: Decision, bg: BackgroundTasks, user: auth.User = Depends(auth.moderator)):
    st = "PUBLISHED" if body.action == "approve" else "REJECTED"
    db.run("update rtis set status=%s where id=%s", (st, rid))
    auth.audit(user, f"rti_{body.action}", "rti", rid, reason=body.reason)
    bg.add_task(_reindex)
    return {"ok": True}


@router.post("/replies/{rid}")
def decide_reply(rid: str, body: Decision, user: auth.User = Depends(auth.moderator)):
    st = "PUBLISHED" if body.action == "approve" else "REJECTED"
    db.run("update replies set status=%s where id=%s", (st, rid))
    auth.audit(user, f"reply_{body.action}", "reply", rid, reason=body.reason)
    return {"ok": True}


class TakedownDecision(BaseModel):
    status: str  # ACKNOWLEDGED | ACTIONED | REJECTED
    resolution: str = ""


@router.post("/takedowns/{tid}")
def decide_takedown(tid: str, body: TakedownDecision, user: auth.User = Depends(auth.moderator)):
    if body.status not in ("ACKNOWLEDGED", "ACTIONED", "REJECTED"):
        raise HTTPException(400, "Invalid status")
    now = datetime.now(timezone.utc)
    if body.status == "ACKNOWLEDGED":
        db.run("update takedowns set status='ACKNOWLEDGED', ack_at=coalesce(ack_at, %s) where id=%s", (now, tid))
    else:
        db.run("update takedowns set status=%s, resolution=%s, resolved_at=%s, ack_at=coalesce(ack_at,%s) where id=%s", (body.status, body.resolution, now, now, tid))
    auth.audit(user, f"takedown_{body.status.lower()}", "takedown", tid, reason=body.resolution)
    return {"ok": True}


@router.get("/audit")
def audit_log(limit: int = 100, user: auth.User = Depends(auth.moderator)):
    return db.q("select * from audit_log order by at desc limit %s", (min(limit, 300),))
