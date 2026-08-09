#!/usr/bin/env python3
"""
Export a compact case_number → stage map for the CCA PDR highlighter extension.

Produces:
  output/status_map.json
  /var/www/iacls.org/html/cca/status_map.json  (via the cca → output symlink)

Stage rules match export_timeline_data.py so the site and the extension agree.
"""
from __future__ import annotations

import json
import sqlite3
import sys
from datetime import date, datetime, timezone
from pathlib import Path

from export_timeline_data import (
    DB_PATH,
    OUTPUT_DIR,
    is_stored,
    load_first_events,
    parse_date,
)

SCRIPT_DIR = Path(__file__).resolve().parent
OUTPUT_PATH = OUTPUT_DIR / "status_map.json"
# Deploy path is the same directory as timeline (cca → output symlink on iacls)
WEB_PATH = Path("/var/www/iacls.org/html/cca/status_map.json")

# User-facing highlight stages (extension colors these four)
HIGHLIGHT_STAGES = {
    "granted_pending": {
        "label": "Granted",
        "color": "#f5e663",  # yellow
        "css": "yellow",
    },
    "submitted": {
        "label": "Submitted",
        "color": "#7dcea0",  # green
        "css": "green",
    },
    "decided": {
        "label": "Decided",
        "color": "#b0b0b0",  # grey
        "css": "grey",
    },
    "refused": {
        "label": "Refused",
        "color": "#f1948a",  # red
        "css": "red",
    },
}

# Additional stages kept for completeness (no default highlight)
OTHER_STAGES = (
    "awaiting_disp",
    "pre_pdr",
    "abandoned_no_pdr",
    "stored",
)


def classify_stage(row: sqlite3.Row, events: dict) -> str:
    """Same stage ladder as export_timeline_data.export_data."""
    if "pdr_filed" in events:
        pdr_filed_d = events["pdr_filed"][0]
    elif "no_pdr" not in events:
        pdr_filed_d = parse_date(row["pdr_filed_date"])
    else:
        pdr_filed_d = None

    pdr_disp_val = (
        events["pdr_disp"][1]
        if "pdr_disp" in events
        else (row["pdr_disposition"] or None)
    )
    submitted_d = events["submitted"][0] if "submitted" in events else None
    decided_d = events["decided"][0] if "decided" in events else None

    if is_stored(row["calendar_type"]) or (row["final_disposition"] or "") == "NO PDR FILED (Abandoned)":
        if not pdr_filed_d:
            return "abandoned_no_pdr"
        if pdr_disp_val and "refuse" in (pdr_disp_val or "").lower():
            return "refused"
        if decided_d:
            return "decided"
        return "stored"
    if decided_d:
        return "decided"
    if submitted_d:
        return "submitted"
    if pdr_disp_val and "grant" in (pdr_disp_val or "").lower():
        return "granted_pending"
    if pdr_disp_val and "refuse" in (pdr_disp_val or "").lower():
        return "refused"
    if pdr_filed_d:
        return "awaiting_disp"
    return "pre_pdr"


def export_data(db_path: Path | str = DB_PATH, deploy: bool = True) -> Path:
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row

    print("Loading docket milestones…", file=sys.stderr)
    first_events = load_first_events(conn)
    print(f"  cases with tracked events: {len(first_events)}", file=sys.stderr)

    rows = conn.execute(
        """
        SELECT
            id, case_number, date_filed, pdr_filed_date,
            pdr_disposition, final_disposition, current_status,
            calendar_type, calendar_reason
        FROM cases
        WHERE case_number LIKE 'PD-%'
          AND (case_style IS NULL OR case_style NOT LIKE '%TAMES EXCEPTION%')
        ORDER BY case_number
        """
    ).fetchall()

    cases: dict[str, str] = {}
    counts: dict[str, int] = {}

    for row in rows:
        cn = (row["case_number"] or "").strip().upper()
        if not cn:
            continue
        events = first_events.get(row["id"], {})
        stage = classify_stage(row, events)
        cases[cn] = stage
        counts[stage] = counts.get(stage, 0) + 1

    conn.close()

    payload = {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "as_of": date.today().isoformat(),
        "version": 1,
        "source": "cca.db",
        "highlight": HIGHLIGHT_STAGES,
        "other_stages": list(OTHER_STAGES),
        "counts": dict(sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))),
        "n_cases": len(cases),
        "cases": cases,
    }

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    text = json.dumps(payload, separators=(",", ":"), ensure_ascii=False)
    OUTPUT_PATH.write_text(text + "\n", encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH} ({len(text):,} bytes, {len(cases):,} cases)", file=sys.stderr)
    print(f"  counts: {payload['counts']}", file=sys.stderr)

    if deploy and WEB_PATH.parent.exists():
        # When cca is a symlink to output, OUTPUT_PATH is already the web path.
        try:
            if OUTPUT_PATH.resolve() != WEB_PATH.resolve():
                WEB_PATH.write_text(text + "\n", encoding="utf-8")
                print(f"Deployed {WEB_PATH}", file=sys.stderr)
            else:
                print(f"Already at web path {WEB_PATH}", file=sys.stderr)
        except OSError as e:
            print(f"Deploy skipped: {e}", file=sys.stderr)

    return OUTPUT_PATH


def main() -> None:
    import argparse

    p = argparse.ArgumentParser(description="Export CCA status_map.json for highlighter extension")
    p.add_argument("--db", default=str(DB_PATH), help="Path to cca.db")
    p.add_argument("--no-deploy", action="store_true", help="Skip writing web path")
    args = p.parse_args()
    export_data(db_path=args.db, deploy=not args.no_deploy)


if __name__ == "__main__":
    main()
