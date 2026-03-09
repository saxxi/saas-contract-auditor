"""Structured logging for agent operations.

Emits JSON log entries with request IDs, timing, and context.
All logs go to stderr via Python's logging module.
"""

import json
import logging
import os
import time
import uuid
from contextlib import contextmanager
from typing import Any


LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

logger = logging.getLogger("agent")
logger.setLevel(getattr(logging, LOG_LEVEL, logging.INFO))

if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(message)s"))
    logger.addHandler(handler)


def _emit(data: dict[str, Any]) -> None:
    logger.info(json.dumps(data, default=str))


def new_request_id() -> str:
    return uuid.uuid4().hex[:12]


def log_event(event: str, request_id: str, **kwargs: Any) -> None:
    _emit({"event": event, "request_id": request_id, **kwargs})


@contextmanager
def trace_operation(event: str, request_id: str, **kwargs: Any):
    """Context manager that logs start/complete events with duration."""
    _emit({"event": f"{event}_start", "request_id": request_id, **kwargs})
    t0 = time.monotonic()
    result: dict[str, Any] = {}
    try:
        yield result
    except Exception as exc:
        duration_ms = int((time.monotonic() - t0) * 1000)
        _emit({
            "event": f"{event}_error",
            "request_id": request_id,
            "duration_ms": duration_ms,
            "error": str(exc),
            **kwargs,
        })
        raise
    else:
        duration_ms = int((time.monotonic() - t0) * 1000)
        _emit({
            "event": f"{event}_complete",
            "request_id": request_id,
            "duration_ms": duration_ms,
            **kwargs,
            **result,
        })
