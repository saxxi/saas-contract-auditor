"""Structured logging for agent operations.

Emits JSON log entries with request IDs, timing, and context.
All logs go to stderr via Python's logging module.
Includes in-memory counters for operational metrics.
Optionally integrates with Langfuse for LLM observability.
"""

import json
import logging
import os
import time
import uuid
from collections import defaultdict
from contextlib import contextmanager
from threading import Lock
from typing import Any


LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()

logger = logging.getLogger("agent")
logger.setLevel(getattr(logging, LOG_LEVEL, logging.INFO))

if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(message)s"))
    logger.addHandler(handler)

# --- Langfuse integration (optional) ---

_langfuse_handler = None
_langfuse_client = None
_langfuse_initialized = False


def _init_langfuse() -> None:
    """Initialize Langfuse if credentials are configured."""
    global _langfuse_handler, _langfuse_client, _langfuse_initialized
    if _langfuse_initialized:
        return
    _langfuse_initialized = True

    public_key = os.getenv("LANGFUSE_PUBLIC_KEY")
    secret_key = os.getenv("LANGFUSE_SECRET_KEY")
    if not public_key or not secret_key:
        return

    try:
        from langfuse.callback import CallbackHandler
        from langfuse import Langfuse

        host = os.getenv("LANGFUSE_HOST", "https://cloud.langfuse.com")
        _langfuse_handler = CallbackHandler(
            public_key=public_key,
            secret_key=secret_key,
            host=host,
        )
        _langfuse_client = Langfuse(
            public_key=public_key,
            secret_key=secret_key,
            host=host,
        )
        logger.info(json.dumps({"event": "langfuse_initialized", "host": host}))
    except ImportError:
        logger.warning(json.dumps({
            "event": "langfuse_import_error",
            "message": "langfuse package not installed; skipping integration",
        }))
    except Exception as exc:
        logger.warning(json.dumps({
            "event": "langfuse_init_error",
            "error": str(exc),
        }))


def get_langfuse_handler():
    """Return the Langfuse CallbackHandler, or None if not configured."""
    _init_langfuse()
    return _langfuse_handler


def get_langfuse_config() -> dict | None:
    """Return a LangChain config dict with Langfuse callbacks, or None."""
    handler = get_langfuse_handler()
    if handler:
        return {"callbacks": [handler]}
    return None


def log_evaluation_score(
    trace_id: str, name: str, value: float, comment: str = ""
) -> None:
    """Attach an evaluation score to a Langfuse trace."""
    _init_langfuse()
    if _langfuse_client is None:
        return
    try:
        _langfuse_client.score(
            trace_id=trace_id,
            name=name,
            value=value,
            comment=comment,
        )
    except Exception as exc:
        logger.warning(json.dumps({
            "event": "langfuse_score_error",
            "trace_id": trace_id,
            "error": str(exc),
        }))

# --- In-memory metrics ---

_metrics_lock = Lock()
_counters: dict[str, int] = defaultdict(int)
_durations: list[int] = []


def _emit(data: dict[str, Any]) -> None:
    logger.info(json.dumps(data, default=str))


def new_request_id() -> str:
    return uuid.uuid4().hex[:12]


def log_event(event: str, request_id: str, **kwargs: Any) -> None:
    _emit({"event": event, "request_id": request_id, **kwargs})

    # Track specific metrics
    with _metrics_lock:
        if event == "analysis_result":
            _counters["reports_generated_total"] += 1
            prop_type = kwargs.get("proposition_type", "unknown")
            _counters[f"reports_by_type:{prop_type}"] += 1
        elif event == "llm_retry":
            _counters["llm_retries_total"] += 1
        elif event.endswith("_error"):
            _counters["report_generation_errors_total"] += 1


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
        # Track report generation durations
        if event == "report":
            with _metrics_lock:
                _durations.append(duration_ms)


def get_metrics() -> dict:
    """Return current in-memory metrics as a dict."""
    with _metrics_lock:
        avg_duration = (
            int(sum(_durations) / len(_durations)) if _durations else 0
        )
        return {
            "reports_generated_total": _counters["reports_generated_total"],
            "report_generation_errors_total": _counters["report_generation_errors_total"],
            "llm_retries_total": _counters["llm_retries_total"],
            "report_generation_avg_duration_ms": avg_duration,
            "reports_by_type": {
                k.split(":")[1]: v
                for k, v in _counters.items()
                if k.startswith("reports_by_type:")
            },
        }
