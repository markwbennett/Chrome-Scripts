"""SQLite store for Bennett COA cases."""

from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

SCHEMA = """
CREATE TABLE IF NOT EXISTS cases (
    case_number TEXT PRIMARY KEY,
    court_code TEXT,
    date_filed TEXT,
    case_type TEXT,
    style TEXT,
    v TEXT,
    orig_proc TEXT,
    trial_court TEXT,
    trial_county TEXT,
    trial_case TEXT,
    url TEXT,
    stage TEXT,
    current_event TEXT,
    current_event_date TEXT,
    opinion_disposition TEXT,
    first_seen TEXT,
    updated_at TEXT,
    last_fetched TEXT,
    raw_json TEXT
);

CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    case_number TEXT NOT NULL,
    date TEXT,
    event_type TEXT,
    disposition TEXT,
    FOREIGN KEY (case_number) REFERENCES cases(case_number)
);

CREATE INDEX IF NOT EXISTS idx_events_case ON events(case_number);
CREATE INDEX IF NOT EXISTS idx_cases_stage ON cases(stage);
"""


def connect(db_path: Path | str) -> sqlite3.Connection:
    path = Path(db_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.executescript(SCHEMA)
    return conn


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def upsert_case(
    conn: sqlite3.Connection,
    *,
    case_number: str,
    court_code: str,
    search_row: dict[str, Any],
    detail: dict[str, Any],
    stage: str,
    current_event: str,
    current_event_date: str,
    opinion_disp: str,
) -> None:
    info = detail.get("case_info") or {}
    trial = detail.get("trial_court") or {}
    stamp = now_iso()
    existing = conn.execute(
        "SELECT first_seen FROM cases WHERE case_number = ?", (case_number,)
    ).fetchone()
    first_seen = existing["first_seen"] if existing else stamp
    conn.execute(
        """
        INSERT INTO cases (
            case_number, court_code, date_filed, case_type, style, v,
            orig_proc, trial_court, trial_county, trial_case, url, stage,
            current_event, current_event_date, opinion_disposition,
            first_seen, updated_at, last_fetched, raw_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(case_number) DO UPDATE SET
            court_code = excluded.court_code,
            date_filed = excluded.date_filed,
            case_type = excluded.case_type,
            style = excluded.style,
            v = excluded.v,
            orig_proc = excluded.orig_proc,
            trial_court = excluded.trial_court,
            trial_county = excluded.trial_county,
            trial_case = excluded.trial_case,
            url = excluded.url,
            stage = excluded.stage,
            current_event = excluded.current_event,
            current_event_date = excluded.current_event_date,
            opinion_disposition = excluded.opinion_disposition,
            updated_at = excluded.updated_at,
            last_fetched = excluded.last_fetched,
            raw_json = excluded.raw_json
        """,
        (
            case_number,
            court_code,
            search_row.get("date_filed") or info.get("Date Filed") or "",
            search_row.get("case_type") or info.get("Case Type") or "",
            search_row.get("style") or info.get("Style") or "",
            search_row.get("v") or info.get("v.") or "",
            info.get("Orig Proc") or "",
            search_row.get("trial_court") or trial.get("Court") or "",
            search_row.get("trial_county") or trial.get("County") or "",
            search_row.get("trial_court_case") or trial.get("Court Case") or "",
            detail.get("url") or search_row.get("url") or "",
            stage,
            current_event,
            current_event_date,
            opinion_disp,
            first_seen,
            stamp,
            stamp,
            json.dumps(detail, ensure_ascii=False),
        ),
    )
    conn.execute("DELETE FROM events WHERE case_number = ?", (case_number,))
    for ev in detail.get("events") or []:
        conn.execute(
            """
            INSERT INTO events (case_number, date, event_type, disposition)
            VALUES (?, ?, ?, ?)
            """,
            (
                case_number,
                ev.get("Date") or "",
                ev.get("Event Type") or "",
                ev.get("Disposition") or "",
            ),
        )


def existing_stages(conn: sqlite3.Connection) -> dict[str, str]:
    rows = conn.execute("SELECT case_number, stage FROM cases").fetchall()
    return {r["case_number"]: r["stage"] or "" for r in rows}


def reclassify_all(conn: sqlite3.Connection, classify_fn) -> int:
    """Recompute stage from stored raw_json. Returns number of rows changed."""
    import json

    changed = 0
    rows = conn.execute(
        "SELECT case_number, stage, raw_json FROM cases"
    ).fetchall()
    for row in rows:
        if not row["raw_json"]:
            continue
        detail = json.loads(row["raw_json"])
        stage = classify_fn(detail)
        if stage != row["stage"]:
            conn.execute(
                "UPDATE cases SET stage = ?, updated_at = ? WHERE case_number = ?",
                (stage, now_iso(), row["case_number"]),
            )
            changed += 1
    return changed


def stage_counts(conn: sqlite3.Connection) -> dict[str, int]:
    rows = conn.execute(
        "SELECT stage, COUNT(*) AS n FROM cases GROUP BY stage"
    ).fetchall()
    return {r["stage"] or "unknown": r["n"] for r in rows}
