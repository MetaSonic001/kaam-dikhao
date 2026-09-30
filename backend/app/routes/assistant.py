"""Ask Kaam Dikhao: retrieval-augmented answers with citations. Never invents data."""
from __future__ import annotations

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

from .. import auth, db
from ..cities import CITIES
from ..services import llm, rag

router = APIRouter(prefix="/api", tags=["assistant"])


class Ask(BaseModel):
    question: str = Field(min_length=2, max_length=600)
    lang: str = "en"
    city: str | None = None


def _facts(city: str | None) -> str:
    name = CITIES[city]["name"] if city in CITIES else None
    w, p = ("published" + (" and lower(city)=lower(%s)" if name else "")), ([name] if name else [])
    by = db.q(f"select status, count(*) n from sites where {w} group by status", p)
    cats = db.q(f"select category, count(*) n from sites where {w} group by category order by n desc", p)
    ev = db.one("select count(*) v from reports r join sites s on s.id=r.site_id where r.status='VERIFIED'" + (" and lower(s.city)=lower(%s)" if name else ""), p)
    return (f"LIVE DATABASE FACTS (scope: {name or 'all tracked cities'}): projects by status: {{{', '.join(f'{r['status']}: {r['n']}' for r in by)}}}. "
            f"By type: {{{', '.join(f'{r['category']}: {r['n']}' for r in cats)}}}. Verified citizen observations: {ev['v']}.")


@router.post("/assistant", dependencies=[Depends(auth.limit("ask", 30, 3600))])
def ask(body: Ask):
    hits = rag.search(body.question, k=8)
    sites = []
    ctx = []
    for i, h in enumerate(hits, 1):
        ctx.append(f"[{i}] ({h['type']}) {h['title']} — {h['text'][:700]} (link: {h['url']})")
        if h["type"] == "site":
            sites.append(h["id"])
    facts = _facts(body.city)
    if not llm.enabled():
        return {"answer": "The AI assistant is not configured on this server. Here are the closest records I found.",
                "citations": [{"n": i + 1, "title": h["title"], "url": h["url"]} for i, h in enumerate(hits)], "sites": []}
    lang_name = {"hi": "Hindi", "mr": "Marathi"}.get(body.lang, "the same language as the question")
    answer = llm.chat(
        "You answer questions about public works in Indian cities using ONLY the numbered context and the live facts below. "
        "Cite sources inline as [1], [2]. If the context does not contain the answer, say what is missing and suggest filing an RTI "
        "(Kaam Dikhao can draft it) or submitting a photo. Keep answers short (max 150 words), plain, and neutral. "
        "Never call anyone corrupt or guilty. Amounts in Indian format (lakh/crore). Never show internal codes such as IN_PROGRESS; say under construction, completed, appears delayed, under review. "
        f"Answer in {lang_name}.",
        f"QUESTION: {body.question}\n\n{facts}\n\nCONTEXT:\n" + ("\n".join(ctx) or "(no matching records)"), max_tokens=700)
    if not answer:
        raise HTTPException(503, "The assistant is busy. Please try again in a moment.")
    site_cards = []
    if sites:
        site_cards = db.q("select slug, title, category, status, locality, city from sites where id::text = any(%s) limit 4", (sites[:4],))
    return {"answer": answer, "citations": [{"n": i + 1, "title": h["title"], "url": h["url"], "type": h["type"]} for i, h in enumerate(hits)], "sites": site_cards}


@router.post("/transcribe", dependencies=[Depends(auth.limit("stt", 30, 3600))])
async def transcribe(audio: UploadFile = File(...), lang: str = Form("en")):
    data = await audio.read()
    if len(data) > 15 * 1024 * 1024:
        raise HTTPException(413, "Recording too long.")
    res = llm.transcribe(data, audio.filename or "voice.webm", lang if lang in ("hi", "mr", "en") else None)
    if not res:
        raise HTTPException(503, "Speech recognition is unavailable right now.")
    return res
