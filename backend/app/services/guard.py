"""Legal & privacy guardrails.

* Detect and redact personal data before anything is public (DPDP Act 2023: data minimisation).
* Detect accusatory language and rewrite it into neutral, observable statements
  (defamation risk under BNS s.356; platform never accuses).
* Everything is a *flag for a human moderator*, never an automatic public verdict.
"""
from __future__ import annotations

import re

from . import llm

PHONE = re.compile(r"(?<!\d)(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}(?!\d)")
AADHAAR = re.compile(r"(?<!\d)\d{4}[\s-]?\d{4}[\s-]?\d{4}(?!\d)")
EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
PLATE = re.compile(r"\b[A-Z]{2}[\s-]?\d{1,2}[\s-]?[A-Z]{1,3}[\s-]?\d{4}\b")
PAN = re.compile(r"\b[A-Z]{5}\d{4}[A-Z]\b")

ACCUSATION = [
    "corrupt", "corruption", "fraud", "scam", "scammer", "bribe", "bribed", "bribery", "stole", "stolen",
    "theft", "thief", "loot", "looted", "embezzle", "embezzled", "kickback", "cheat", "cheated", "criminal",
    "illegal", "lied", "liar", "crook", "fake", "mafia", "black money", "siphon",
    "भ्रष्ट", "भ्रष्टाचार", "घोटाला", "घोटाळा", "चोर", "रिश्वत", "लाच", "लूट", "धोखा", "फ्रॉड", "ठग", "झूठ",
    "bhrasht", "ghotala", "chor", "rishwat", "ghotalа",
]
_ACC_RE = re.compile("|".join(re.escape(t) for t in ACCUSATION), re.I)


def detect_pii(text: str) -> list[str]:
    kinds = []
    for name, rx in (("phone", PHONE), ("aadhaar", AADHAAR), ("email", EMAIL), ("vehicle_plate", PLATE), ("pan", PAN)):
        if rx.search(text or ""):
            kinds.append(name)
    return kinds


def redact_pii(text: str) -> str:
    out = EMAIL.sub("[email removed]", text or "")
    out = AADHAAR.sub("[id number removed]", out)
    out = PHONE.sub("[phone removed]", out)
    out = PLATE.sub("[plate removed]", out)
    out = PAN.sub("[id number removed]", out)
    return out


def accusation_hits(text: str) -> list[str]:
    return sorted({m.group(0).lower() for m in _ACC_RE.finditer(text or "")})


def neutralize(text: str, lang: str = "en") -> tuple[str, list[str]]:
    """Returns (public_text, flags). The original text is kept privately for moderators."""
    flags: list[str] = []
    text = (text or "").strip()
    if not text:
        return "", flags
    pii = detect_pii(text)
    if pii:
        flags.append("pii:" + ",".join(pii))
    clean = redact_pii(text)
    hits = accusation_hits(clean)
    if hits:
        flags.append("accusatory_language:" + ",".join(hits))
    # Always ask the model for a neutral observable rewrite when there is anything to fix,
    # or when the note names a person (LLM decides), otherwise keep the citizen's words.
    if hits or llm.enabled():
        res = llm.chat_json(
            "Rewrite the citizen's note as a short, factual, neutral statement of what they observed at the "
            f"location, in the same language ({lang}). Remove accusations, motives, insults and any claim about "
            "someone's intent or honesty. Remove names of private individuals. Keep concrete observations "
            "(what, where, how long, how bad). Do not add facts. JSON keys: neutral_text (string, max 400 chars), "
            "names_private_person (boolean), removed_accusation (boolean).",
            clean, model=None, max_tokens=500,
        )
        if res and isinstance(res.get("neutral_text"), str) and res["neutral_text"].strip():
            if res.get("removed_accusation"):
                flags.append("rewritten_neutral")
            if res.get("names_private_person"):
                flags.append("names_person")
            return res["neutral_text"].strip(), flags
    if hits:
        # fallback without LLM: drop sentences containing accusatory terms
        parts = re.split(r"(?<=[.!?।])\s+", clean)
        kept = [p for p in parts if not _ACC_RE.search(p)]
        flags.append("rewritten_neutral")
        return " ".join(kept).strip() or "[note withheld pending review]", flags
    return clean, flags
