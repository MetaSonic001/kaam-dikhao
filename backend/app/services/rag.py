"""Small, dependency-light RAG: multilingual embeddings (fastembed / ONNX) stored in Postgres,
cosine search in numpy. No vector DB, no Redis, no GPU."""
from __future__ import annotations

import logging
import threading
from pathlib import Path

import numpy as np

from .. import db
from ..config import DATA_DIR, get_settings

log = logging.getLogger("kd.rag")
MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
_model = None
_lock = threading.Lock()
_cache: dict = {"n": -1, "mat": None, "rows": []}


def _embedder():
    global _model
    with _lock:
        if _model is None:
            from fastembed import TextEmbedding

            _model = TextEmbedding(MODEL, cache_dir=str(DATA_DIR / "models"))
        return _model


def embed(texts: list[str]) -> np.ndarray:
    vecs = np.array(list(_embedder().embed(texts)), dtype=np.float32)
    return vecs / np.maximum(np.linalg.norm(vecs, axis=1, keepdims=True), 1e-9)


def upsert(source_type: str, source_id: str, title: str, url: str, body: str) -> None:
    v = embed([f"{title}\n{body}"[:1500]])[0].tolist() if get_settings().embeddings else None
    db.run(
        """insert into doc_chunks(source_type,source_id,title,url,body,embedding) values(%s,%s,%s,%s,%s,%s)
           on conflict (source_type, source_id) do update set title=excluded.title, url=excluded.url,
           body=excluded.body, embedding=excluded.embedding, updated_at=now()""",
        (source_type, source_id, title, url, body, v),
    )


def _site_text(s: dict) -> str:
    bits = [f"{s['title']} ({s['category']}) in {s.get('locality') or ''} {s.get('ward') or ''} {s['city'] or ''}, {s['state'] or ''}.",
            f"Status: {s['status']}.", s.get("claim_text") or ""]
    if s.get("agency"):
        bits.append(f"Agency: {s['agency']}.")
    if s.get("contractor"):
        bits.append(f"Contractor (per official record): {s['contractor']}.")
    if s.get("sanctioned_amount"):
        bits.append(f"Sanctioned amount: Rs {float(s['sanctioned_amount']):,.0f}.")
    if s.get("expected_completion"):
        bits.append(f"Expected completion: {s['expected_completion']}.")
    return " ".join(b for b in bits if b)


def reindex(full: bool = False) -> int:
    """Index sites, published reports, RTIs and the knowledge base. Incremental: only new/changed rows are embedded."""
    n = 0
    existing = {(r["source_type"], r["source_id"]): r["updated_at"] for r in db.q("select source_type, source_id, updated_at from doc_chunks")}
    for s in db.q("select * from sites where published"):
        sid = str(s["id"])
        ts = existing.get(("site", sid))
        if not full and ts and ts >= s["updated_at"]:
            continue
        upsert("site", sid, s["title"], f"/projects/{s['slug']}", _site_text(s))
        n += 1
    for r in db.q("select r.id, r.note_public, r.observation, r.captured_at, s.slug, s.title from reports r join sites s on s.id=r.site_id where r.status='VERIFIED' and r.note_public is not null"):
        if not full and ("report", str(r["id"])) in existing:
            continue
        upsert("report", str(r["id"]), f"Verified observation at {r['title']}", f"/projects/{r['slug']}", f"{r['observation'] or 'observation'} on {r['captured_at']}: {r['note_public']}")
        n += 1
    for r in db.q("select id, subject, authority, outcome, summary_ai, question_text from rtis where status='PUBLISHED'"):
        if not full and ("rti", str(r["id"])) in existing:
            continue
        upsert("rti", str(r["id"]), r["subject"], f"/rti/{r['id']}", f"RTI to {r['authority']}. Outcome: {r['outcome']}. {r['summary_ai'] or ''} Questions: {r['question_text'][:600]}")
        n += 1
    kb = Path(__file__).resolve().parents[1] / "knowledge"
    for f in sorted(kb.glob("*.md")) if kb.exists() else []:
        text = f.read_text(encoding="utf-8")
        for i, part in enumerate(p for p in text.split("\n## ") if p.strip()):
            if not full and ("kb", f"{f.stem}:{i}") in existing:
                continue
            head = part.split("\n", 1)[0].strip("# ")
            upsert("kb", f"{f.stem}:{i}", head or f.stem, f"/{'methodology' if f.stem == 'methodology' else 'legal'}", part[:1800])
            n += 1
    return n


def _load():
    total = db.one("select count(*) c, coalesce(max(extract(epoch from updated_at)),0) m from doc_chunks")
    key = (total["c"], float(total["m"]))
    if _cache["n"] != key:
        rows = db.q("select source_type, source_id, title, url, body, embedding from doc_chunks where embedding is not null")
        _cache["rows"] = rows
        _cache["mat"] = np.array([r["embedding"] for r in rows], dtype=np.float32) if rows else None
        _cache["n"] = key
    return _cache["rows"], _cache["mat"]


def _fts(query: str, k: int, kinds: set[str] | None) -> list[dict]:
    """Keyword retrieval in Postgres (works for English and Devanagari). Used when EMBEDDINGS=false."""
    rows = db.q(
        """select source_type, source_id, title, url, body, ts_rank(to_tsvector('simple', title || ' ' || body), q) as rank
           from doc_chunks, websearch_to_tsquery('simple', %s) q
           where to_tsvector('simple', title || ' ' || body) @@ q order by rank desc limit %s""",
        (query, k * 2),
    )
    if not rows:  # OR-match on the individual words instead of requiring all of them
        words = [w.strip("?.,!'\"") for w in query.split() if len(w) > 2][:8]
        words = [w for w in words if w.replace("'", "").isalnum()]
        if words:
            rows = db.q(
                """select source_type, source_id, title, url, body, 0.1::real as rank from doc_chunks
                   where to_tsvector('simple', title || ' ' || body) @@ to_tsquery('simple', %s) limit %s""",
                (" | ".join(words), k * 2),
            )
    return [{"type": r["source_type"], "id": r["source_id"], "title": r["title"], "url": r["url"], "text": r["body"], "score": round(float(r["rank"]), 3)}
            for r in rows if not kinds or r["source_type"] in kinds][:k]


def search(query: str, k: int = 8, kinds: set[str] | None = None) -> list[dict]:
    if not get_settings().embeddings:
        return _fts(query, k, kinds)
    rows, mat = _load()
    if mat is None:
        return []
    qv = embed([query])[0]
    sims = mat @ qv
    order = np.argsort(-sims)
    out = []
    for i in order:
        r = rows[int(i)]
        if kinds and r["source_type"] not in kinds:
            continue
        if sims[i] < 0.18:
            break
        out.append({"type": r["source_type"], "id": r["source_id"], "title": r["title"], "url": r["url"],
                    "text": r["body"], "score": round(float(sims[i]), 3)})
        if len(out) >= k:
            break
    return out
