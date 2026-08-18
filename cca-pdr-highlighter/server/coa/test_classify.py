#!/usr/bin/env python3
"""Stage-classification checks (no network)."""

from __future__ import annotations

from datetime import date

from classify import classify_stage, is_coa_case_number


def ev(date_s, et, disp=""):
    return {"Date": date_s, "Event Type": et, "Disposition": disp}


def test_numbers():
    assert is_coa_case_number("01-26-00483-CR")
    assert is_coa_case_number("14-25-00856-CR")
    assert not is_coa_case_number("PD-0602-26")
    assert not is_coa_case_number("WR-97,555-01")
    assert not is_coa_case_number("25-1053")


def test_pending():
    detail = {
        "events": [
            ev("05/08/2026", "Case began in court of appeals"),
            ev("06/24/2026", "Clerks record filed"),
            ev("06/26/2026", "Reporters record filed"),
            ev("08/18/2026", "Motion to withdraw attorney disposed", "Motion or Writ Granted"),
        ]
    }
    assert classify_stage(detail, today=date(2026, 8, 18)) == "pending"


def test_submitted_event():
    detail = {
        "events": [
            ev("05/20/2026", "Set for submission on briefs"),
            ev("07/08/2026", "Submitted"),
        ]
    }
    assert classify_stage(detail, today=date(2026, 7, 1)) == "submitted"


def test_set_for_submission_future_is_pending():
    detail = {"events": [ev("09/01/2026", "Set for submission on briefs")]}
    assert classify_stage(detail, today=date(2026, 8, 18)) == "pending"


def test_set_for_submission_past_is_submitted():
    detail = {"events": [ev("07/01/2026", "Set for submission on briefs")]}
    assert classify_stage(detail, today=date(2026, 8, 18)) == "submitted"


def test_decided():
    detail = {
        "events": [
            ev("07/08/2026", "Submitted"),
            ev("08/04/2026", "Memorandum opinion issued", "AFFIRMED"),
        ]
    }
    assert classify_stage(detail) == "decided"


def test_dismissed_opinion():
    detail = {
        "events": [
            ev("01/15/2025", "Memorandum opinion issued", "DISMISSED"),
        ]
    }
    assert classify_stage(detail) == "dismissed"


def test_dismissed_appeal():
    detail = {
        "events": [
            ev("03/01/2025", "Appeal dismissed", "Dismissed"),
        ]
    }
    assert classify_stage(detail) == "dismissed"


def test_stored_without_opinion():
    detail = {"events": [ev("10/26/1999", "Case  stored")]}
    assert classify_stage(detail) == "stored"


def test_transferred_is_stored():
    detail = {
        "events": [
            ev("03/20/2026", "Case transferred from this court to another court"),
        ]
    }
    assert classify_stage(detail) == "stored"


def test_attorney_withdraw_not_decided():
    detail = {
        "events": [
            ev("08/18/2026", "Motion to withdraw attorney disposed", "Motion or Writ Granted"),
        ]
    }
    assert classify_stage(detail) == "pending"


def main() -> None:
    test_numbers()
    test_pending()
    test_submitted_event()
    test_set_for_submission_future_is_pending()
    test_set_for_submission_past_is_submitted()
    test_decided()
    test_dismissed_opinion()
    test_dismissed_appeal()
    test_stored_without_opinion()
    test_transferred_is_stored()
    test_attorney_withdraw_not_decided()
    print("ok")


if __name__ == "__main__":
    main()
