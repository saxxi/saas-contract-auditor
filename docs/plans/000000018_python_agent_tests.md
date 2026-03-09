# Plan: Python Agent Tests (Unit & Integration)

## Context

The Python agent (`apps/agent/`) has zero tests. All logic — caching, report generation, opportunity analysis, tool functions — is untested. The existing CI (`ci.yml`) only does smoke tests (frontend startup) and linting. We need comprehensive unit and integration tests that run fast, require no real LLM or API calls, and work in GitHub Actions.

## Test Dependencies

Add to `apps/agent/pyproject.toml` as dev dependencies:

```
pytest>=8.0
pytest-asyncio>=0.24
pytest-cov>=5.0
respx>=0.22          # httpx-native mock (code uses httpx.AsyncClient)
time-machine>=2.14   # deterministic time.time() for TTL tests
```

**pytest config** in `pyproject.toml`:

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
asyncio_mode = "auto"
pythonpath = ["."]
```

## File Structure

```
apps/agent/tests/
  __init__.py
  conftest.py                       # shared fixtures
  test_cache.py                     # src/cache.py
  test_report_helpers.py            # pure functions from src/report_graph.py
  test_report_graph_integration.py  # process_account, analyze_account (mocked LLM+HTTP)
  test_opportunities.py             # src/opportunities_graph.py
  test_contracts.py                 # src/contracts.py tool functions
  test_raw_json.py                  # _raw_json_to_summary
  test_query.py                     # src/query.py
  test_todos.py                     # src/todos.py
  test_graph_structure.py           # graph compilation & topology
```

## Shared Fixtures (`conftest.py`)

- **`tmp_cache_dir`** — patches `src.cache.CACHE_DIR` to `tmp_path` subdir, sets `TTL_SECONDS` to known value
- **`mock_tool_runtime`** — factory returning MagicMock with `.state` dict and `.tool_call_id` string
- **`sample_account_summary`** — realistic account summary dict
- **`sample_historical_deals`** — 10+ deals with varied tiers/outcomes/sizes
- **`sample_llm_report_output`** — markdown report with valid JSON metadata on last line

## Unit Tests

### `test_cache.py` (~7 tests)

| Test | Validates |
|------|-----------|
| `test_cache_path_returns_correct_path` | `_cache_path("foo")` → `CACHE_DIR / "foo.json"` |
| `test_sync_cache_set_creates_file` | File exists with correct JSON after set |
| `test_sync_cache_get_returns_data` | Set → get round-trip |
| `test_sync_cache_get_missing_key` | Returns `None` |
| `test_sync_cache_get_expired_ttl` | time-machine advance past TTL → `None`, file deleted |
| `test_sync_cache_clear` | Deletes all `.json` files |
| `test_async_wrappers` | `cache_set` → `cache_get` async round-trip |

### `test_report_helpers.py` (~14 tests)

**`_parse_report_metadata`** (6 tests):
- Valid JSON last line → parsed dict
- JSON not on last line (trailing blank) → still found
- Partial fields → defaults fill in
- No JSON → full defaults
- Invalid JSON → defaults
- String `"success_percent": "75"` → cast to `int(75)`

**`_extract_report_body`** (4 tests):
- Removes valid JSON line
- Preserves non-JSON braces in body
- No JSON line → returns full text
- Multiple JSON lines → removes only last valid one

**`_filter_relevant_deals`** (4 tests):
- Tier match scores higher
- Won outcome scores higher
- Deal size ratio 0.5-3.0x scores higher
- Returns max 8 results

### `test_raw_json.py` (~5 tests)

- New format with `usage_metrics` → passthrough
- Legacy format with known pairs (`active_users`/`seat_limit`) → correct metrics
- Generic numeric keys → generic metrics
- Missing `usage` key → empty metrics
- Account name extraction

### `test_query.py` (~2 tests)

- `query_data` returns a list of dicts
- Rows have expected columns from `db.csv`

### `test_todos.py` (~3 tests)

- `manage_todos` assigns UUIDs to todos without `id`
- Preserves existing IDs
- `get_todos` returns `[]` on empty state

### `test_graph_structure.py` (~5 tests)

- `build_report_graph()` compiles without error
- Report graph has nodes: `process_account`, `collect_results`, `finalize`
- `build_opportunities_graph()` compiles without error
- Opportunities graph has node: `fetch_and_analyze`
- `fan_out({"account_ids": ["A","B"]})` returns 2 `Send` objects

## Integration Tests (Mocked LLM + HTTP)

All use `respx` for httpx mocking and `unittest.mock.patch` on `ChatOpenAI.ainvoke`.

### `test_report_graph_integration.py` (~5 tests)

- **`test_process_account_success`** — mock all APIs + LLM → results has 1 entry, no errors
- **`test_process_account_fetch_fails`** — API 500 → error message returned
- **`test_process_account_save_fails`** — save POST 500 → error about save failure
- **`test_analyze_account_two_llm_passes`** — LLM `ainvoke` called exactly 2x (report + sales script)
- **`test_analyze_account_raw_data_path`** — summary with `raw_data` → deals sliced `[:5]`, not filtered

### `test_opportunities.py` (~3 tests)

- **`test_fetch_and_analyze_success`** — mock APIs + LLM with `["AC-1"]` → recommended_ids parsed
- **`test_fetch_and_analyze_no_json_array`** — LLM has no array → `recommended_ids == []`
- **`test_fetch_and_analyze_api_failure`** — APIs return 500 → handles gracefully

### `test_contracts.py` (~7 tests)

- **`test_select_accounts_adds_new`** — empty state → entries with `status="pending"`
- **`test_select_accounts_skips_duplicates`** — existing AC-1 → only AC-2 added
- **`test_generate_reports_invokes_graph`** — patch `build_report_graph` → verify graph called
- **`test_get_report_content_success`** — mock GET → returns JSON string
- **`test_update_report_full_flow`** — mock GET + LLM + PUT → Command with `focused_account_id`
- **`test_analyze_raw_data_json`** — valid JSON → `demo_report` in Command
- **`test_analyze_raw_data_freetext`** — plain text → summary has `raw_data`, `demo_report` set

## CI Workflow Addition

Add `test-agent` job to `.github/workflows/ci.yml`:

```yaml
test-agent:
  name: Agent Tests / Python ${{ matrix.python }}
  runs-on: ubuntu-latest
  strategy:
    matrix:
      python: [3.12, 3.13]
  defaults:
    run:
      working-directory: apps/agent
  steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-python@v4
      with:
        python-version: ${{ matrix.python }}
    - uses: astral-sh/setup-uv@v4
      with:
        enable-cache: true
    - name: Install dependencies
      run: uv sync --dev
    - name: Run tests with coverage
      run: uv run pytest --tb=short -q --cov=src --cov-report=term-missing --cov-fail-under=80
```

Add `test-agent` to the `needs` list in `notify-slack` job.

## Implementation Order

1. Add test deps to `pyproject.toml`, run `uv sync --dev`
2. Create `tests/__init__.py` + `conftest.py` with fixtures
3. Pure function unit tests first (`test_cache`, `test_report_helpers`, `test_raw_json`, `test_query`, `test_todos`)
4. Graph structure tests (`test_graph_structure`)
5. Integration tests (`test_report_graph_integration`, `test_opportunities`, `test_contracts`)
6. Update CI workflow
7. Run full suite: `uv run pytest -v --cov=src`

## Verification

- `cd apps/agent && uv run pytest -v --cov=src --cov-report=term-missing` — all tests pass, coverage ≥80%
- Push branch, verify `test-agent` job passes in GitHub Actions
- No real API keys or LLM calls needed anywhere

## Notes

- `query.py` loads `db.csv` at import time — tests must run from `apps/agent/` working directory
- `asyncio_mode = "auto"` means no `@pytest.mark.asyncio` decorators needed
- `respx` is used over `unittest.mock` for httpx calls — it intercepts at transport level, more reliable
- Total: ~51 tests across 9 test files
