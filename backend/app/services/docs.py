"""Text extraction from PDFs / images and structured field extraction for official records."""
from __future__ import annotations

import io

from pypdf import PdfReader

from . import guard, llm


def extract_text(data: bytes, filename: str, content_type: str | None) -> str:
    name = (filename or "").lower()
    if name.endswith(".pdf") or content_type == "application/pdf":
        try:
            r = PdfReader(io.BytesIO(data))
            return "\n".join((p.extract_text() or "") for p in r.pages[:25]).strip()
        except Exception:  # noqa: BLE001
            return ""
    if content_type and content_type.startswith("image/") and llm.enabled():
        from PIL import Image

        im = Image.open(io.BytesIO(data)).convert("RGB")
        im.thumbnail((1400, 1400))
        b = io.BytesIO()
        im.save(b, "JPEG", quality=85)
        res = llm.vision_json([(b.getvalue(), "image/jpeg")], "Transcribe ALL text visible in this scanned document exactly (Devanagari and English). JSON key: text.", "Transcribe.")
        return (res or {}).get("text", "") or ""
    return ""


def extract_fields(text: str, kind: str) -> dict:
    """Candidate structured fields from a tender / work order / completion certificate. Human reviewed before use."""
    if not text.strip():
        return {}
    res = llm.chat_json(
        "Extract fields from this Indian government work document ONLY if they are explicitly written in it; otherwise null. "
        "JSON keys: project_title, department, contractor, amount (number in rupees, no commas; convert lakh/crore), "
        "work_order_date (YYYY-MM-DD), completion_date (YYYY-MM-DD), ward, location, reference_number, "
        "defect_liability_months (number), confidence (0..1). Do not guess.",
        f"Document type: {kind}\n\n{text[:9000]}", max_tokens=700,
    )
    if not res:
        return {}
    res["_note"] = "Candidate extraction. A moderator checks it against the source document before it is published."
    for k in ("contractor", "project_title", "department"):
        if isinstance(res.get(k), str):
            res[k] = guard.redact_pii(res[k])[:200]
    return res
