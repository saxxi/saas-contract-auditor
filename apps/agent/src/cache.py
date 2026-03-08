import asyncio
import json
import os
import time
from pathlib import Path

CACHE_DIR = Path(__file__).parent.parent / ".cache"
# 1 day dev, 10 minutes production
TTL_SECONDS = 600 if os.getenv("ENVIRONMENT") == "production" else 86400


def _cache_path(key: str) -> Path:
    return CACHE_DIR / f"{key}.json"


def _sync_cache_get(key: str) -> dict | list | None:
    path = _cache_path(key)
    if not path.exists():
        return None
    age = time.time() - path.stat().st_mtime
    if age > TTL_SECONDS:
        path.unlink(missing_ok=True)
        return None
    with open(path) as f:
        return json.load(f)


def _sync_cache_set(key: str, data: dict | list) -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    with open(_cache_path(key), "w") as f:
        json.dump(data, f)


def _sync_cache_clear() -> None:
    if CACHE_DIR.exists():
        for p in CACHE_DIR.iterdir():
            if p.suffix == ".json":
                p.unlink(missing_ok=True)


async def cache_get(key: str) -> dict | list | None:
    return await asyncio.to_thread(_sync_cache_get, key)


async def cache_set(key: str, data: dict | list) -> None:
    await asyncio.to_thread(_sync_cache_set, key, data)


async def cache_clear() -> None:
    await asyncio.to_thread(_sync_cache_clear)
