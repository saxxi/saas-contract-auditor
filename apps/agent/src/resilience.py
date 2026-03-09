"""Resilience utilities: retry with backoff, shared HTTP client, concurrency control."""

import asyncio
import os

import httpx

from src.tracing import log_event

# --- Concurrency limiter for LLM fan-out ---

_MAX_CONCURRENT_LLM = int(os.getenv("MAX_CONCURRENT_LLM", "5"))
llm_semaphore = asyncio.Semaphore(_MAX_CONCURRENT_LLM)

# --- Shared HTTP client with connection pooling and retries ---

_transport = httpx.AsyncHTTPTransport(retries=2)
_http_client: httpx.AsyncClient | None = None


def get_http_client() -> httpx.AsyncClient:
    """Return a shared httpx.AsyncClient with retry transport."""
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(transport=_transport, timeout=30)
    return _http_client


# --- Retry with exponential backoff for LLM calls ---

_RETRYABLE_EXCEPTIONS = (
    httpx.TimeoutException,
    httpx.ConnectError,
)

# Import these lazily to avoid hard dependency at module level
_OPENAI_EXCEPTIONS: tuple = ()


def _get_retryable_exceptions() -> tuple:
    """Build the full tuple of retryable exceptions, including OpenAI errors if available."""
    global _OPENAI_EXCEPTIONS
    if not _OPENAI_EXCEPTIONS:
        try:
            import openai
            _OPENAI_EXCEPTIONS = (openai.RateLimitError, openai.APIError)
        except ImportError:
            _OPENAI_EXCEPTIONS = ()
    return _RETRYABLE_EXCEPTIONS + _OPENAI_EXCEPTIONS


async def invoke_with_retry(
    model,
    prompt,
    *,
    max_retries: int = 3,
    base_delay: float = 1.0,
    request_id: str = "",
    config: dict | None = None,
) -> object:
    """Invoke an LLM model with exponential backoff on transient failures."""
    retryable = _get_retryable_exceptions()
    last_exc = None

    for attempt in range(max_retries + 1):
        try:
            async with llm_semaphore:
                if config:
                    return await model.ainvoke(prompt, config=config)
                return await model.ainvoke(prompt)
        except retryable as exc:
            last_exc = exc
            if attempt < max_retries:
                delay = base_delay * (2 ** attempt)
                log_event("llm_retry", request_id,
                          attempt=attempt + 1,
                          max_retries=max_retries,
                          delay=delay,
                          error=str(exc))
                await asyncio.sleep(delay)
            else:
                raise
    # Should not reach here, but satisfy type checker
    raise last_exc  # type: ignore[misc]
