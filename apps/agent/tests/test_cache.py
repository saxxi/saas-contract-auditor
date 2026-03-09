import json
import os
import time

from src.cache import (
    _cache_path,
    _sync_cache_get,
    _sync_cache_set,
    _sync_cache_clear,
    cache_get,
    cache_set,
)


def test_cache_path_returns_correct_path(tmp_cache_dir):
    result = _cache_path("foo")
    assert result == tmp_cache_dir / "foo.json"


def test_sync_cache_set_creates_file(tmp_cache_dir):
    _sync_cache_set("test_key", {"a": 1})
    path = tmp_cache_dir / "test_key.json"
    assert path.exists()
    assert json.loads(path.read_text()) == {"a": 1}


def test_sync_cache_get_returns_data(tmp_cache_dir):
    _sync_cache_set("round_trip", [1, 2, 3])
    result = _sync_cache_get("round_trip")
    assert result == [1, 2, 3]


def test_sync_cache_get_missing_key(tmp_cache_dir):
    result = _sync_cache_get("nonexistent")
    assert result is None


def test_sync_cache_get_expired_ttl(tmp_cache_dir):
    _sync_cache_set("expiring", {"data": True})

    # TTL is patched to 60 seconds in fixture; backdate file mtime by 61 seconds
    path = tmp_cache_dir / "expiring.json"
    old_time = time.time() - 61
    os.utime(path, (old_time, old_time))

    result = _sync_cache_get("expiring")
    assert result is None
    assert not path.exists()


def test_sync_cache_clear(tmp_cache_dir):
    _sync_cache_set("a", {"x": 1})
    _sync_cache_set("b", {"y": 2})
    _sync_cache_clear()

    assert list(tmp_cache_dir.glob("*.json")) == []


async def test_async_wrappers(tmp_cache_dir):
    await cache_set("async_key", {"async": True})
    result = await cache_get("async_key")
    assert result == {"async": True}
