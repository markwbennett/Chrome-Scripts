#!/usr/bin/env python3
"""Search TAMES for Bennett COA cases and populate coa.db."""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path

from classify import is_coa_case_number, classify_stage, latest_event, opinion_disposition
from db import connect, existing_stages, stage_counts, upsert_case
from tames import get_case, guess_court_code, search_cases

HERE = Path(__file__).resolve().parent
DEFAULT_DB = HERE / "coa.db"
DEFAULT_BAR = "00792970"
TERMINAL_STAGES = {"decided", "dismissed", "stored"}


def collect_search(bar: str) -> list[dict]:
    print(f"Searching TAMES for bar {bar}…", file=sys.stderr)
    result = search_cases(attorney_bar_number=bar, court="All", all_pages=True)
    rows = result.get("cases") or []
    print(f"  {len(rows)} hits ({result.get('page_info') or ''})", file=sys.stderr)
    coa = []
    for row in rows:
        cn = (row.get("case_number") or "").strip().upper()
        if is_coa_case_number(cn):
            row["case_number"] = cn
            coa.append(row)
    print(f"  {len(coa)} COA cases", file=sys.stderr)
    return coa


def should_refresh(stage: str | None, force: bool, incremental: bool) -> bool:
    if force or not incremental:
        return True
    if not stage:
        return True
    return stage not in TERMINAL_STAGES


def fetch_one(row: dict, sleep_s: float) -> dict:
    cn = row["case_number"]
    court = (row.get("appellate_court") or "").lower()
    court_code = ""
    if court.startswith("coa") and len(court) >= 5:
        court_code = court[:5]
    try:
        court_code = court_code or guess_court_code(cn)
    except ValueError:
        court_code = court_code or ""
    detail = get_case(cn, court_code=court_code)
    if sleep_s:
        time.sleep(sleep_s)
    return detail


def build(
    db_path: Path,
    bar: str,
    *,
    incremental: bool,
    force: bool,
    sleep_s: float,
    search_cache: Path | None,
) -> None:
    conn = connect(db_path)
    if search_cache and search_cache.is_file():
        print(f"Loading search cache {search_cache}", file=sys.stderr)
        payload = json.loads(search_cache.read_text(encoding="utf-8"))
        rows = payload if isinstance(payload, list) else payload.get("cases") or []
        rows = [
            {**r, "case_number": (r.get("case_number") or "").strip().upper()}
            for r in rows
            if is_coa_case_number((r.get("case_number") or "").strip())
        ]
    else:
        rows = collect_search(bar)
        cache_path = HERE / "output" / "search.json"
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        cache_path.write_text(json.dumps(rows, indent=2), encoding="utf-8")

    known = existing_stages(conn)
    todo = [r for r in rows if should_refresh(known.get(r["case_number"]), force, incremental)]
    print(
        f"Refreshing {len(todo)} / {len(rows)} cases "
        f"(incremental={incremental}, force={force})",
        file=sys.stderr,
    )

    errors: list[str] = []
    for i, row in enumerate(todo, 1):
        cn = row["case_number"]
        print(f"  [{i}/{len(todo)}] {cn}", file=sys.stderr)
        try:
            detail = fetch_one(row, sleep_s)
            stage = classify_stage(detail)
            ev_date, ev_type, _ev_disp = latest_event(detail)
            upsert_case(
                conn,
                case_number=cn,
                court_code=detail.get("court_code") or "",
                search_row=row,
                detail=detail,
                stage=stage,
                current_event=ev_type,
                current_event_date=ev_date,
                opinion_disp=opinion_disposition(detail),
            )
            conn.commit()
        except Exception as exc:  # noqa: BLE001 — keep going through the roster
            errors.append(f"{cn}: {exc}")
            print(f"    ERROR {cn}: {exc}", file=sys.stderr)
            conn.rollback()

    counts = stage_counts(conn)
    n = conn.execute("SELECT COUNT(*) FROM cases").fetchone()[0]
    conn.close()
    print(f"DB {db_path}: {n} cases  counts={counts}", file=sys.stderr)
    if errors:
        print(f"{len(errors)} errors:", file=sys.stderr)
        for line in errors:
            print(f"  {line}", file=sys.stderr)
        raise SystemExit(1)


def main() -> None:
    p = argparse.ArgumentParser(description="Build Bennett COA case database")
    p.add_argument("--db", default=str(DEFAULT_DB), help="Path to coa.db")
    p.add_argument("--bar", default=DEFAULT_BAR, help="State Bar number")
    p.add_argument(
        "--incremental",
        action="store_true",
        help="Skip cases already decided or dismissed",
    )
    p.add_argument("--force", action="store_true", help="Refetch every case")
    p.add_argument("--sleep", type=float, default=0.4, help="Seconds between fetches")
    p.add_argument("--search-cache", default="", help="Reuse a saved search JSON")
    args = p.parse_args()
    build(
        Path(args.db),
        args.bar,
        incremental=args.incremental,
        force=args.force,
        sleep_s=args.sleep,
        search_cache=Path(args.search_cache) if args.search_cache else None,
    )


if __name__ == "__main__":
    main()
