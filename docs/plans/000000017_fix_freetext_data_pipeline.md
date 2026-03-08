# Fix: Landing page report ignores free-text account usage data

## Problem

The landing page demo lets users paste free-text account data and generate a report. The generated pitch shows "n/a" for all usage metrics and claims "no usage telemetry" despite the input containing detailed usage, overages, and growth trends. Rated 6.5/10 in external review due to this factual mismatch.

## Root Cause

`analyze_raw_data` tool requires JSON input (`json.loads()`), but Example 1 is free text. Two lossy steps:
1. CopilotKit agent converts free text → JSON, dropping fields
2. `_raw_json_to_summary()` only handles 3 hardcoded metric pairs, missing API calls, automation runs, storage, etc.

The `REPORT_ANALYZER_PROMPT` handles any data format — but data is stripped before reaching it.

## Fix

1. **`analyze_raw_data`**: Try JSON first; if parse fails, pass raw text directly to LLM prompt
2. **`analyze_account`**: When summary has `raw_data` key, use it as-is instead of `json.dumps(summary)`
3. **`CACHED_NORTHSTAR_REPORT`**: Update to reflect correct metrics
4. Rename `account_data_json` → `account_data` for clarity

## Files

- `apps/agent/src/contracts.py`
- `apps/agent/src/report_graph.py`
- `apps/app/src/app/page.tsx`
