#!/usr/bin/env python3
"""Export case_number → stage map for the highlighter extension."""

from __future__ import annotations

import argparse
import json
import sys
from datetime import date, datetime, timezone
from pathlib import Path

from classify import HIGHLIGHT_STAGES, OTHER_STAGES
from db import connect

HERE = Path(__file__).resolve().parent
DEFAULT_DB = HERE / "coa.db"
OUTPUT_PATH = HERE / "output" / "status_map.json"
WEB_PATH = Path("/var/www/iacls.org/html/coa/status_map.json")


def export_data(db_path: Path | str = DEFAULT_DB, deploy: bool = True) -> Path:
    conn = connect(db_path)
    rows = conn.execute(
        """
        SELECT case_number, stage
        FROM cases
        ORDER BY case_number
        """
    ).fetchall()
    conn.close()

    cases: dict[str, str] = {}
    counts: dict[str, int] = {}
    for row in rows:
        cn = (row["case_number"] or "").strip().upper()
        stage = (row["stage"] or "pending").strip()
        if not cn:
            continue
        cases[cn] = stage
        counts[stage] = counts.get(stage, 0) + 1

    payload = {
        "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "as_of": date.today().isoformat(),
        "version": 1,
        "source": "coa.db",
        "scope": "bennett",
        "bar_number": "00792970",
        "highlight": HIGHLIGHT_STAGES,
        "other_stages": list(OTHER_STAGES),
        "counts": dict(sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))),
        "n_cases": len(cases),
        "cases": cases,
    }

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(payload, separators=(",", ":"), ensure_ascii=False)
    OUTPUT_PATH.write_text(text + "\n", encoding="utf-8")
    print(f"Wrote {OUTPUT_PATH} ({len(text):,} bytes, {len(cases):,} cases)", file=sys.stderr)
    print(f"  counts: {payload['counts']}", file=sys.stderr)

    if deploy and WEB_PATH.parent.exists():
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
    p = argparse.ArgumentParser(description="Export COA status_map.json")
    p.add_argument("--db", default=str(DEFAULT_DB))
    p.add_argument("--no-deploy", action="store_true")
    args = p.parse_args()
    export_data(db_path=args.db, deploy=not args.no_deploy)


if __name__ == "__main__":
    main()
