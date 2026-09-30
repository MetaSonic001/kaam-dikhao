"""Explainable, evidence-first scoring. No score is shown unless enough evidence exists.

Health score = weighted mean of the components that can be measured, and only once at least one
ground observation has been verified. Components with no data are reported as unavailable. The score is a composite
of public evidence, not a legal finding.
"""
from __future__ import annotations

from datetime import date, datetime, timezone

# Records completeness is shown for context but never scored: a missing record often just means
# the platform has not been given it yet, and must not count against the project.
WEIGHTS = {"timeline": 40, "records": 0, "ground": 35, "citizen": 25}
MIN_VERIFIED = 3  # a single photo is an anecdote, not a score


def _label(score: int) -> str:
    return "good" if score >= 75 else "mixed" if score >= 50 else "attention"


def health(site: dict, reports: list[dict]) -> dict:
    today = date.today()
    comps: dict[str, dict] = {}

    exp, act, status = site.get("expected_completion"), site.get("actual_completion"), site.get("status")
    if exp:
        if status == "COMPLETED":
            late = ((act or today) - exp).days
            v = 100 if late <= 0 else max(0, 100 - late / 3)
            note = "Completed on or before the expected date." if late <= 0 else f"Completion recorded {late} days after the expected date."
        else:
            late = (today - exp).days
            v = 85 if late <= 0 else max(0, 80 - late / 3.65)
            note = "Within the expected timeline." if late <= 0 else f"Expected completion passed {late} days ago; no completion recorded."
        comps["timeline"] = {"value": round(v), "note": note}
    else:
        comps["timeline"] = {"value": None, "note": "No expected completion date is published for this work."}

    fields = [site.get("sanctioned_amount"), site.get("contractor"), site.get("work_order_date"), site.get("expected_completion"),
              site.get("agency"), site.get("source_url") if site.get("origin") == "official" else None]
    have = sum(1 for f in fields if f)
    comps["records"] = {"value": round(100 * have / len(fields)), "note": f"{have} of {len(fields)} key public records are linked (amount, contractor, work order, dates, agency, official source)."}

    verified = [r for r in reports if r["status"] == "VERIFIED"]
    if len(verified) >= MIN_VERIFIED:
        recent = [r for r in verified if r.get("captured_at") and (datetime.now(timezone.utc) - r["captured_at"]).days <= 120]
        v = 100 if recent else 60
        comps["ground"] = {"value": v, "note": f"{len(verified)} verified ground observations, {len(recent)} in the last 120 days."}
        issues = [r for r in verified if r.get("observation") in ("issue", "not_started")]
        comps["citizen"] = {"value": round(100 * (1 - len(issues) / len(verified))), "note": f"{len(issues)} of {len(verified)} verified observations report a problem."}
    else:
        pending = len([r for r in reports if r["status"] in ("SUBMITTED", "UNDER_REVIEW")])
        need = MIN_VERIFIED - len(verified)
        comps["ground"] = {"value": None, "note": f"{len(verified)} verified so far; {need} more needed before a score is shown." + (f" {pending} awaiting review." if pending else "")}
        comps["citizen"] = {"value": None, "note": f"Needs at least {MIN_VERIFIED} verified observations."}

    have_w = sum(WEIGHTS[k] for k, c in comps.items() if c["value"] is not None)
    for k, c in comps.items():
        c["weight"] = WEIGHTS[k]
    if comps["ground"]["value"] is None:
        return {"score": None, "label": "insufficient", "coverage": have_w, "components": comps,
                "disclaimer": "Not enough public evidence to compute a score. This is not a judgement about the work."}
    score = round(sum(c["value"] * WEIGHTS[k] for k, c in comps.items() if c["value"] is not None) / have_w)
    return {"score": score, "label": _label(score), "coverage": have_w, "components": comps,
            "disclaimer": "Composite evidence score from public records and reviewed citizen evidence. Not a legal or audit finding."}


def timeline_state(site: dict) -> dict:
    """Days late/early against the expected date, for the Claim vs Reality card."""
    exp = site.get("expected_completion")
    if not exp:
        return {"known": False}
    ref = site.get("actual_completion") or date.today()
    days = (ref - exp).days
    return {"known": True, "expected": exp.isoformat(), "days_late": days, "completed": site.get("status") == "COMPLETED"}
