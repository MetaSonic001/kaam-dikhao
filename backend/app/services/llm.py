"""Groq wrapper: text, JSON, vision and speech-to-text. Every call degrades to None on failure."""
from __future__ import annotations

import base64
import json
import logging
import re
from typing import Any

from ..config import get_settings

log = logging.getLogger("kd.llm")
_client = None

# Standing rules injected into every prompt. The platform never accuses anyone.
NEUTRALITY = (
    "You work for Kaam Dikhao, a neutral civic transparency platform in India. Never accuse any person, "
    "contractor, official or department of corruption, fraud, theft or wrongdoing. Describe only what is "
    "observable or documented, use words like 'reported', 'appears', 'possible', 'under review', and mark "
    "uncertainty. Never invent facts, amounts, dates or names that are not in the provided context."
)


def enabled() -> bool:
    return bool(get_settings().groq_api_key)


def client():
    global _client
    if _client is None:
        from groq import Groq

        _client = Groq(api_key=get_settings().groq_api_key, timeout=45, max_retries=2)
    return _client


def _extra(model: str) -> dict:
    return {"reasoning_effort": "low"} if model.startswith("openai/gpt-oss") else {}


def _strip(text: str) -> str:
    return re.sub(r"<think>.*?</think>", "", text or "", flags=re.S).strip()


def chat(system: str, user: str, *, model: str | None = None, max_tokens: int = 1200, temperature: float = 0.2) -> str | None:
    if not enabled():
        return None
    m = model or get_settings().groq_model
    try:
        r = client().chat.completions.create(
            model=m, temperature=temperature, max_tokens=max_tokens,
            messages=[{"role": "system", "content": f"{NEUTRALITY}\n\n{system}"}, {"role": "user", "content": user}],
            **_extra(m),
        )
        return _strip(r.choices[0].message.content)
    except Exception as e:  # noqa: BLE001
        log.warning("llm chat failed: %s", e)
        return None


def chat_json(system: str, user: str, *, model: str | None = None, max_tokens: int = 1500) -> dict | None:
    if not enabled():
        return None
    m = model or get_settings().groq_model
    try:
        r = client().chat.completions.create(
            model=m, temperature=0.1, max_tokens=max_tokens, response_format={"type": "json_object"},
            messages=[{"role": "system", "content": f"{NEUTRALITY}\n\nReturn ONLY a JSON object.\n{system}"},
                      {"role": "user", "content": user}],
            **_extra(m),
        )
        return _loads(r.choices[0].message.content)
    except Exception as e:  # noqa: BLE001
        log.warning("llm json failed: %s", e)
        return None


def _loads(text: str) -> dict | None:
    text = _strip(text)
    try:
        return json.loads(text)
    except Exception:  # noqa: BLE001
        m = re.search(r"\{.*\}", text, re.S)
        if m:
            try:
                return json.loads(m.group(0))
            except Exception:  # noqa: BLE001
                return None
    return None


def vision_json(images: list[tuple[bytes, str]], system: str, user: str) -> dict | None:
    """images: list of (jpeg_bytes, mime). Vision output is always a *candidate* observation."""
    if not enabled():
        return None
    content: list[dict[str, Any]] = [{"type": "text", "text": user}]
    for data, mime in images[:3]:
        content.append({"type": "image_url", "image_url": {"url": f"data:{mime};base64,{base64.b64encode(data).decode()}"}})
    try:
        r = client().chat.completions.create(
            model=get_settings().groq_vision_model, temperature=0.1, max_tokens=900,
            messages=[{"role": "system", "content": f"{NEUTRALITY}\n\nReturn ONLY a JSON object.\n{system}"},
                      {"role": "user", "content": content}],
        )
        return _loads(r.choices[0].message.content)
    except Exception as e:  # noqa: BLE001
        log.warning("vision failed: %s", e)
        return None


def transcribe(data: bytes, filename: str, language: str | None = None) -> dict | None:
    """Speech to text (Whisper). Supports Hindi, Marathi, English and most Indian languages."""
    if not enabled():
        return None
    try:
        kw: dict = {"file": (filename, data), "model": get_settings().groq_stt_model,
                    "response_format": "verbose_json", "temperature": 0.0}
        if language and language in {"en", "hi", "mr", "gu", "ta", "te", "bn", "kn", "ml", "pa", "ur"}:
            kw["language"] = language
        r = client().audio.transcriptions.create(**kw)
        return {"text": getattr(r, "text", "") or "", "language": getattr(r, "language", None)}
    except Exception as e:  # noqa: BLE001
        log.warning("transcription failed: %s", e)
        return None
