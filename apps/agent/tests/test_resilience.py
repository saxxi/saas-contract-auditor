"""Tests for resilience module: retry logic, shared HTTP client, concurrency."""

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from src.resilience import invoke_with_retry, get_http_client, llm_semaphore


# --- invoke_with_retry ---


async def test_retry_succeeds_first_try():
    model = AsyncMock()
    model.ainvoke.return_value = "result"

    result = await invoke_with_retry(model, "prompt", max_retries=3)
    assert result == "result"
    assert model.ainvoke.call_count == 1


async def test_retry_succeeds_after_transient_failure():
    model = AsyncMock()
    model.ainvoke.side_effect = [
        httpx.TimeoutException("timeout"),
        "result",
    ]

    result = await invoke_with_retry(
        model, "prompt", max_retries=3, base_delay=0.01
    )
    assert result == "result"
    assert model.ainvoke.call_count == 2


async def test_retry_exhausted_raises():
    model = AsyncMock()
    model.ainvoke.side_effect = httpx.ConnectError("connection refused")

    with pytest.raises(httpx.ConnectError):
        await invoke_with_retry(
            model, "prompt", max_retries=2, base_delay=0.01
        )
    assert model.ainvoke.call_count == 3  # initial + 2 retries


async def test_retry_non_retryable_raises_immediately():
    model = AsyncMock()
    model.ainvoke.side_effect = ValueError("bad input")

    with pytest.raises(ValueError):
        await invoke_with_retry(model, "prompt", max_retries=3, base_delay=0.01)
    assert model.ainvoke.call_count == 1


async def test_retry_with_openai_rate_limit():
    """Mock openai.RateLimitError as a retryable exception."""
    try:
        import openai
        model = AsyncMock()
        model.ainvoke.side_effect = [
            openai.RateLimitError(
                "rate limited",
                response=MagicMock(status_code=429),
                body=None,
            ),
            "result",
        ]

        result = await invoke_with_retry(
            model, "prompt", max_retries=3, base_delay=0.01
        )
        assert result == "result"
    except ImportError:
        pytest.skip("openai not installed")


# --- Concurrency limiter ---


async def test_semaphore_limits_concurrency():
    """Verify semaphore limits concurrent LLM calls."""
    max_concurrent = 0
    current_concurrent = 0
    lock = asyncio.Lock()

    async def mock_ainvoke(prompt):
        nonlocal max_concurrent, current_concurrent
        async with lock:
            current_concurrent += 1
            max_concurrent = max(max_concurrent, current_concurrent)
        await asyncio.sleep(0.05)
        async with lock:
            current_concurrent -= 1
        return "result"

    model = AsyncMock()
    model.ainvoke.side_effect = mock_ainvoke

    # Run 10 concurrent calls with semaphore limit (default 5)
    tasks = [
        invoke_with_retry(model, f"prompt-{i}", max_retries=0, base_delay=0)
        for i in range(10)
    ]
    await asyncio.gather(*tasks)

    # max_concurrent should not exceed the semaphore value
    assert max_concurrent <= llm_semaphore._value


# --- Shared HTTP client ---


def test_get_http_client_returns_same_instance():
    client1 = get_http_client()
    client2 = get_http_client()
    assert client1 is client2


def test_get_http_client_is_async():
    client = get_http_client()
    assert isinstance(client, httpx.AsyncClient)
