#!/usr/bin/env python3
"""Daily refresh of Bennett COA cases + status_map.json."""

from __future__ import annotations

import sys
from pathlib import Path

from build import DEFAULT_BAR, DEFAULT_DB, build
from export_status_map import export_data


def main() -> None:
    db = Path(DEFAULT_DB)
    print(f"COA daily update → {db}", file=sys.stderr)
    build(
        db,
        DEFAULT_BAR,
        incremental=True,
        force=False,
        sleep_s=0.4,
        search_cache=None,
    )
    export_data(db_path=db, deploy=True)


if __name__ == "__main__":
    main()
