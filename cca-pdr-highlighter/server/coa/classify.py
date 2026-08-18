"""Classify a Texas Court of Appeals case into a highlighter stage."""

from __future__ import annotations

import re
from datetime import date, datetime
from typing import Any

COA_CASE_RE = re.compile(r"^\d{2}-\d{2}-\d{5}-[A-Z]{2}$", re.IGNORECASE)

# Highlighted stages (same four-color palette as the CCA map)
HIGHLIGHT_STAGES = {
    "pending": {
        "label": "Pending",
        "color": "#f5e663",
        "css": "yellow",
    },
    "submitted": {
        "label": "Submitted",
        "color": "#7dcea0",
        "css": "green",
    },
    "decided": {
        "label": "Decided",
        "color": "#b0b0b0",
        "css": "grey",
    },
    "dismissed": {
        "label": "Dismissed",
        "color": "#f1948a",
        "css": "red",
    },
}

OTHER_STAGES = ("stored",)

_SKIP_DISPOSED = (
    "attorney",
    "extension",
    "time to file",
    "substitute",
    "withdraw",
    "reporters record",
    "clerks record",
    "brief",
)

_ORIG_PROC = (
    "petition",
    "writ",
    "mandamus",
    "habeas",
    "prohibition",
    "injunction",
)

_OPINION = (
    "memorandum opinion issued",
    "opinion issued",
    "per curiam opinion issued",
    "en banc opinion issued",
    "opinion issued - ",
)


def is_coa_case_number(cn: str) -> bool:
    return bool(COA_CASE_RE.match(str(cn or "").strip()))


def parse_date(value: str | None) -> date | None:
    if not value:
        return None
    text = str(value).strip()
    for fmt in ("%m/%d/%Y", "%Y-%m-%d", "%m/%d/%y"):
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    m = re.match(r"(\d{1,2})/(\d{1,2})/(\d{2,4})$", text)
    if m:
        year = int(m.group(3))
        if year < 100:
            year += 2000
        try:
            return date(year, int(m.group(1)), int(m.group(2)))
        except ValueError:
            return None
    return None


def _events(detail: dict[str, Any]) -> list[tuple[str, str, date | None]]:
    out: list[tuple[str, str, date | None]] = []
    for ev in detail.get("events") or []:
        et = (ev.get("Event Type") or ev.get("event_type") or "").strip().lower()
        disp = (ev.get("Disposition") or ev.get("disposition") or "").strip().lower()
        d = parse_date(ev.get("Date") or ev.get("date"))
        if et or disp:
            out.append((et, disp, d))
    return out


def _is_skip_motion(event_type: str) -> bool:
    return any(tok in event_type for tok in _SKIP_DISPOSED)


def classify_stage(detail: dict[str, Any], today: date | None = None) -> str:
    """Return pending / submitted / decided / dismissed.

    Ladder (first match wins):
      dismissed  — appeal/case/petition dismissed (not a side motion)
      decided    — merits opinion, or original-proceeding grant/deny
      submitted  — Submitted event, oral argument held, or set-for-submission
                   date that has already passed
      pending    — everything else
    """
    today = today or date.today()
    events = _events(detail)

    stored = any(
        et.replace("  ", " ").strip() in {"case stored", "stored"}
        or "case stored" in et
        or "transferred from this court" in et
        for et, _disp, _d in events
    )

    for et, disp, _d in events:
        if "dismiss" not in et and "dismiss" not in disp:
            continue
        if _is_skip_motion(et):
            continue
        if any(k in et for k in ("appeal", "case", "petition", "writ", "cause")):
            return "dismissed"
        if any(k in et for k in _OPINION) and "dismiss" in disp:
            return "dismissed"
        if et in {"dismissed", "case dismissed"}:
            return "dismissed"

    for et, disp, _d in events:
        if any(k in et for k in _OPINION):
            if "dismiss" in disp:
                return "dismissed"
            return "decided"
        if et == "judgment issued" and disp and "dismiss" in disp:
            return "dismissed"

    for et, disp, _d in events:
        if "disposed" not in et or _is_skip_motion(et):
            continue
        if any(k in et for k in _ORIG_PROC) and disp:
            if "dismiss" in disp:
                return "dismissed"
            return "decided"

    for et, _disp, _d in events:
        if et == "submitted" or et.startswith("submitted "):
            return "submitted"
        if "oral argument held" in et:
            return "submitted"

    for et, _disp, d in events:
        if "set for submission" in et:
            if d is None or d <= today:
                return "submitted"

    if stored:
        return "stored"

    return "pending"


def latest_event(detail: dict[str, Any]) -> tuple[str, str, str]:
    """Return (date, event_type, disposition) of the newest docket event."""
    best: tuple[date, str, str, str] | None = None
    for ev in detail.get("events") or []:
        et = (ev.get("Event Type") or "").strip()
        disp = (ev.get("Disposition") or "").strip()
        raw = (ev.get("Date") or "").strip()
        d = parse_date(raw) or date.min
        cand = (d, raw, et, disp)
        if best is None or cand[0] > best[0]:
            best = cand
    if not best:
        return ("", "", "")
    return (best[1], best[2], best[3])


def opinion_disposition(detail: dict[str, Any]) -> str:
    for ev in detail.get("events") or []:
        et = (ev.get("Event Type") or "").strip().lower()
        disp = (ev.get("Disposition") or "").strip()
        if any(k in et for k in _OPINION) and disp:
            return disp
    return ""
