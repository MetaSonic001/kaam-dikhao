"""RTI draft generator. Kaam Dikhao drafts; the citizen reviews and files on the official portal.

Never automatically submits anything and never pretends to be the RTI portal.
Under the RTI Act 2005: reply due in 30 days (48 hours where life/liberty is involved),
first appeal within 30 days, second appeal to the Information Commission within 90 days.
"""
from __future__ import annotations

from datetime import date

from . import llm

# Records a citizen can ask for, phrased neutrally. Each is offered only if the record is missing.
QUESTIONS = {
    "sanction": "Please provide a certified copy of the administrative sanction and technical sanction for this work, including the sanctioned amount and the head of account.",
    "tender": "Please provide the tender notice, the list of bidders, the evaluation statement and the award / work order for this work, including the name of the agency to which it was awarded and the awarded amount.",
    "dates": "Please state the date of commencement, the stipulated date of completion, and any extension of time granted (with reasons and revised dates).",
    "status": "Please state the current physical and financial progress of the work as on the date of your reply.",
    "completion": "Please provide a copy of the completion certificate / measurement book entries, and the date the work was taken over or handed over, if completed.",
    "payments": "Please provide the details of payments released so far against this work (dates and amounts, running bills and final bill).",
    "quality": "Please provide copies of quality-control / third-party inspection reports for this work.",
    "warranty": "Please state the defect liability / warranty period applicable to this work and the date it ends.",
    "complaints": "Please provide copies of any complaints received about this work and the action taken on each.",
}

DEFAULT_KEYS = ["sanction", "tender", "dates", "status", "completion", "payments"]


def missing_records(site: dict) -> list[str]:
    keys = []
    if not site.get("sanctioned_amount"):
        keys.append("sanction")
    if not site.get("contractor") or not site.get("awarded_amount"):
        keys.append("tender")
    if not site.get("expected_completion") or not site.get("work_order_date"):
        keys.append("dates")
    keys.append("status")
    if site.get("status") == "COMPLETED" or site.get("expected_completion"):
        keys.append("completion")
    keys += ["payments", "quality"]
    if site.get("status") == "COMPLETED":
        keys.append("warranty")
    return keys


def draft(site: dict | None, authority: str, keys: list[str], applicant: dict | None = None, location_hint: str | None = None, lang: str = "en") -> dict:
    keys = [k for k in keys if k in QUESTIONS] or DEFAULT_KEYS
    where = ", ".join(x for x in [site.get("locality"), site.get("ward"), site.get("city")] if x) if site else (location_hint or "")
    title = site["title"] if site else "the public work described below"
    subject = f"Information regarding {title}" + (f" ({where})" if where else "")
    identify = f"the work \"{title}\"" + (f" at {where}" if where else "")
    if site and site.get("source_url") and site.get("origin") == "official":
        identify += f" (reference: {site['source_url']})"
    body_q = [f"{i}. {QUESTIONS[k]}" for i, k in enumerate(keys, 1)]

    text = (
        f"To,\nThe Public Information Officer,\n{authority}\n\n"
        f"Date: {date.today().strftime('%d %B %Y')}\n\n"
        f"Subject: Application under Section 6(1) of the Right to Information Act, 2005 — {subject}\n\n"
        f"Sir/Madam,\n\nUnder the Right to Information Act, 2005, I request the following information about {identify}:\n\n"
        + "\n".join(body_q)
        + "\n\nIf any part of this information is held by another public authority, please transfer this application "
        "under Section 6(3). If any part is refused, please cite the specific provision of Section 8 or 9 relied upon "
        "and provide the remaining information as per Section 10. I am willing to pay the prescribed fee; please "
        "inform me of any additional fee with its calculation. I am a citizen of India.\n\n"
        f"Yours faithfully,\n{(applicant or {}).get('name') or '[Your name]'}\n{(applicant or {}).get('address') or '[Your postal address]'}\n"
    )
    if lang != "en" and llm.enabled():
        tr = llm.chat(
            f"Translate this RTI application into {'Hindi' if lang == 'hi' else 'Marathi' if lang == 'mr' else lang}. Keep the legal references "
            "(Section 6(1), 6(3), 8, 9, 10, RTI Act 2005) and all placeholders in [brackets]. Output only the translation.",
            text, max_tokens=1800,
        )
        if tr:
            text = tr
    return {
        "authority": authority, "subject": subject, "questions": [QUESTIONS[k] for k in keys], "text": text,
        "how_to_file": [
            "Review and edit the draft. You are the applicant; Kaam Dikhao does not file on your behalf.",
            "Central government bodies: file online at rtionline.gov.in (fee ₹10). Most state and municipal bodies have their own portal or accept a paper application with a fee; check the authority's website for the current fee and mode.",
            "You should get a reply within 30 days. If not, or if you are unhappy with it, you can file a first appeal with the First Appellate Authority within 30 days, and then a second appeal to the Information Commission within 90 days.",
            "Come back and share the reply on Kaam Dikhao so others can learn from it (personal details are removed before publishing).",
        ],
        "disclaimer": "This is a drafting aid, not legal advice. The questions ask for records and do not allege any wrongdoing.",
    }


def summarize_reply(question: str, reply_text: str, lang: str = "en") -> dict | None:
    """Structured neutral summary of an RTI reply. Candidate only; a moderator reviews before it is public."""
    return llm.chat_json(
        "Summarise the RTI reply factually. JSON keys: summary (max 60 words, neutral), outcome (one of FULL, PARTIAL, "
        "REJECTED, TRANSFERRED, NO_RESPONSE), provided (list of facts actually stated: amounts, dates, names of "
        "agencies as written), not_provided (list of things asked for but not answered), exemption_cited (string or null).",
        f"QUESTIONS ASKED:\n{question[:2500]}\n\nREPLY RECEIVED:\n{reply_text[:6000]}", max_tokens=900,
    )
