"""Tests for the structured tracing module."""

import json
import logging

from src.tracing import new_request_id, log_event, trace_operation


def test_new_request_id_format():
    rid = new_request_id()
    assert len(rid) == 12
    assert rid.isalnum()


def test_new_request_id_unique():
    ids = {new_request_id() for _ in range(100)}
    assert len(ids) == 100


def test_log_event(caplog):
    with caplog.at_level(logging.INFO, logger="agent"):
        log_event("test_event", "abc123", account_id="AC-1")

    record = json.loads(caplog.records[-1].message)
    assert record["event"] == "test_event"
    assert record["request_id"] == "abc123"
    assert record["account_id"] == "AC-1"


def test_trace_operation_success(caplog):
    with caplog.at_level(logging.INFO, logger="agent"):
        with trace_operation("analyze", "req001", account_id="AC-2") as ctx:
            ctx["result"] = "ok"

    messages = [json.loads(r.message) for r in caplog.records]
    start = next(m for m in messages if m["event"] == "analyze_start")
    complete = next(m for m in messages if m["event"] == "analyze_complete")

    assert start["request_id"] == "req001"
    assert start["account_id"] == "AC-2"
    assert complete["duration_ms"] >= 0
    assert complete["result"] == "ok"


def test_trace_operation_error(caplog):
    with caplog.at_level(logging.INFO, logger="agent"):
        try:
            with trace_operation("fail_op", "req002"):
                raise ValueError("test error")
        except ValueError:
            pass

    messages = [json.loads(r.message) for r in caplog.records]
    error = next(m for m in messages if m["event"] == "fail_op_error")
    assert error["error"] == "test error"
    assert error["duration_ms"] >= 0
