# Plan 028: Production Hardening and AI Pipeline Robustness

## Context

An external review scored the project 6.5/10, citing weak AI implementation depth (5/10) and systems engineering signal (4/10). While the review partially confused this project with a different one, the valid criticisms map to real gaps: the LLM pipeline silently swallows failures, there's no output quality evaluation, no concurrency control on fan-out, no health checks, no production observability, and the evaluation harness is small. This plan addresses the highest-impact items to bring the project to production-grade quality.

## Phase 1: LLM Pipeline Robustness

The core issue: `_parse_report_metadata()` silently returns safe defaults (`"healthy"`, 50% success) on any parse failure. A garbage LLM response produces a saved report with wrong classification and nobody notices. There is no evaluation of report quality before saving.

### 1a. Pydantic validation for LLM metadata

Add a Pydantic model to validate LLM output metadata. Keep the current "JSON on last line" approach (no extra LLM call) but validate rigorously with a structured-output fallback.

**Files:**
- `apps/agent/src/types.py`: Add `ReportMetadata` Pydantic model with `proposition_type: Literal[...]`, `strategic_bucket: Literal[...]`, `success_percent: int` (0-100 constrained), `intervene: bool`, `priority_score: int` (1-10 constrained), `score_rationale: str`
- `apps/agent/src/report_graph.py`: Replace `_parse_report_metadata()` with Pydantic parsing. On validation failure, make a short `with_structured_output(ReportMetadata)` fallback call that extracts metadata from the report text. Log a warning via `tracing.py` when fallback is triggered
- `apps/agent/src/contracts.py`: Update `update_report` to use same Pydantic validation
- `apps/agent/src/opportunities_graph.py`: Add Pydantic model `OpportunitiesResult` for recommended_ids parsing

### 1b. Retry with backoff on LLM calls

**Files:**
- `apps/agent/src/resilience.py` (new): `async def invoke_with_retry(model, prompt, max_retries=3, base_delay=1.0)` with exponential backoff. Catches `openai.RateLimitError`, `openai.APIError`, `httpx.TimeoutException`
- `apps/agent/src/report_graph.py`: Use `invoke_with_retry` for both LLM passes in `analyze_account()`
- `apps/agent/src/opportunities_graph.py`: Use `invoke_with_retry` for the LLM call

### 1c. Evaluator node in report graph (hallucination mitigation)

Add an `evaluate_report` node to the report generation graph. This transforms the pipeline from a linear chain into a proper graph with conditional routing:

```
fan_out → [fetch_data → analyze (LLM) → evaluate → save] per account
                                           ↓ (fail)
                                         re-analyze (one retry)
```

The evaluator node scores the report against a rubric using a lightweight LLM call (`with_structured_output`):

**Rubric (Pydantic model `ReportEvaluation`):**
- `sections_complete: bool` (all 9 required sections present)
- `metrics_accurate: bool` (input numbers appear in Key Metrics table)
- `classification_justified: bool` (classification matches the data signals described)
- `evidence_grounded: bool` (historical deals referenced exist in input)
- `overall_quality: Literal["pass", "marginal", "fail"]`
- `issues: list[str]` (specific problems found)

**Routing logic:**
- `"pass"`: proceed to save
- `"marginal"`: proceed to save, log warning with issues
- `"fail"`: route back to `analyze` with issues as feedback (max 1 retry, then save with warning)

**Files:**
- `apps/agent/src/report_graph.py`:
  - Add `evaluate_report` async node
  - Add `ReportEvaluation` Pydantic model (or in `types.py`)
  - Add conditional edge from evaluate to either save or re-analyze
  - Update `ProcessAccountState` with `evaluation: dict | None` and `retry_count: int`
  - Update graph: `process_account` renamed to `analyze` for clarity, new `evaluate` node, conditional routing
- `apps/agent/src/prompts.py`: Add `REPORT_EVALUATOR_PROMPT` with the rubric. Short prompt: "Given this account data and this generated report, score against this rubric"

**Why this matters:** This is the single biggest architectural improvement. It demonstrates understanding of LLM reliability engineering (generate-then-verify pattern), uses LangGraph's conditional routing, and directly addresses the "hallucination mitigation" criticism.

### 1d. Numeric consistency check (used by evaluator)

Extract as a utility function used by the evaluator node:

**Files:**
- `apps/agent/src/report_graph.py`: Add `_check_numeric_consistency(input_data: dict, report_text: str) -> tuple[bool, list[str]]`. Verifies key input numbers (current_value, limit_value from each usage_metric) appear in report. Returns (passed, list of missing values). Used by the evaluator node's `metrics_accurate` check

**Tests:**
- `apps/agent/tests/test_report_helpers.py`: Update for Pydantic validation (invalid enums, out-of-range values, fallback behavior)
- `apps/agent/tests/test_resilience.py` (new): Retry logic tests (mock LLM failures, verify backoff)
- `apps/agent/tests/test_report_graph_integration.py`: Update mocks for new graph structure (evaluate node, conditional routing)
- `apps/agent/tests/test_evaluator.py` (new): Test evaluator rubric scoring with sample reports (good, marginal, bad)

## Phase 2: Systems Engineering

### 2a. Concurrency limiter for fan-out

The `Send()` fan-out sends ALL accounts simultaneously. 50 accounts = 100+ concurrent LLM calls (2-pass + evaluator). This will hit rate limits.

**Files:**
- `apps/agent/src/report_graph.py`: Add module-level `asyncio.Semaphore` (default 5, configurable via `MAX_CONCURRENT_LLM` env var). Wrap each `model.ainvoke()` call in `async with _llm_semaphore:`, not the whole node (data fetching stays parallel)

### 2b. HTTP retry and shared client

**Files:**
- `apps/agent/src/resilience.py`: Add `get_http_client() -> httpx.AsyncClient` factory with `httpx.AsyncHTTPTransport(retries=2)`. Module-level shared client with connection pooling
- `apps/agent/src/report_graph.py`: Replace scattered `async with httpx.AsyncClient() as client:` calls in `_fetch_account_summary()`, `_fetch_historical_deals()`, `_save_report()` with shared client
- `apps/agent/src/contracts.py`: Same replacement for httpx calls in `get_report_content()`, `update_report()`
- `apps/agent/src/opportunities_graph.py`: Same replacement

### 2c. Health check endpoint

**Files:**
- `apps/app/src/app/api/health/route.ts` (new): GET endpoint returning `{"status":"ok","db":"ok"|"error","agent":"ok"|"error","timestamp":"..."}`. DB check via `SELECT 1` through Drizzle. Agent check via HTTP ping to LangGraph URL. Returns 200 if all ok, 503 if degraded
- `docker-compose.yml`: Add `healthcheck` config to `app` service pointing to `/api/health`

### 2d. Graceful degradation

**Files:**
- `apps/app/src/app/api/copilotkit/route.ts`: Wrap agent proxy in try/catch, return user-friendly error message when agent is unreachable instead of 500

**Tests:**
- `apps/agent/tests/test_resilience.py`: Semaphore concurrency test, shared client test
- `apps/app/src/app/api/__tests__/routes.test.ts`: Health endpoint test

## Phase 3: Observability with Langfuse

Replace the hand-rolled `tracing.py` metrics approach with Langfuse, an open-source LLM observability platform. Langfuse provides trace visualization, token/cost tracking, prompt versioning, and evaluation scores, all without building custom dashboards.

### 3a. Langfuse integration

**Files:**
- `apps/agent/pyproject.toml`: Add `langfuse` dependency
- `apps/agent/src/tracing.py`: Add Langfuse `CallbackHandler` initialization. Create a `get_langfuse_handler()` that returns the callback configured from env vars (`LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_HOST`)
- `apps/agent/src/report_graph.py`: Pass Langfuse callback handler to each `ChatOpenAI` call via `model.ainvoke(prompt, config={"callbacks": [langfuse_handler]})`. This automatically traces all LLM calls with token counts, latency, and cost
- `apps/agent/src/opportunities_graph.py`: Same callback handler
- `apps/agent/src/contracts.py`: Same for the `update_report` LLM call
- `.env.example`: Add `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`, `LANGFUSE_HOST` (optional, defaults to cloud)

### 3b. Evaluation scores in Langfuse

**Files:**
- `apps/agent/src/report_graph.py`: After the evaluator node runs, attach the `ReportEvaluation` scores to the Langfuse trace as evaluation metrics. This creates a dashboard of report quality over time without any custom code
- `apps/agent/src/tracing.py`: Add `log_evaluation_score(trace_id, name, value)` helper that writes to Langfuse

### 3c. Keep structured logging as fallback

**Files:**
- `apps/agent/src/tracing.py`: Keep existing `log_event()` and `trace_operation()` functions. They continue to emit JSON logs to stderr for Docker log capture. Langfuse is additive; if `LANGFUSE_PUBLIC_KEY` is not set, everything works as before with just structured logs

## Phase 4: Evaluation Harness

### 4a. Expand evaluation dataset

**Files:**
- `evaluation/dataset.json`: Add 7+ new cases:
  - Exactly at 100% utilization on one metric, low on others
  - Overdue payment + low utilization (negotiation vs churn ambiguity)
  - Single-metric account (seats only)
  - High ARR ($50k+ MRR) enterprise with mixed signals
  - Imminent renewal (5 days) + healthy metrics
  - Free-text with incomplete/messy data
  - All metrics at 85% boundary

### 4b. Report quality scoring in eval

**Files:**
- `evaluation/run_eval.py`: After each case, score for section completeness (check presence of 9 required sections), metric table coverage (input metrics appear in output), ARR at Risk present. Add `quality_score` to results and report average in summary. Reuse `_check_numeric_consistency()` and section validation logic from the evaluator node

### 4c. Mock-LLM eval mode for CI

**Files:**
- `evaluation/run_eval.py`: Add `--mock` flag. When set, patch `ChatOpenAI` to return pre-recorded responses from `evaluation/fixtures/`
- `evaluation/fixtures/` (new dir): One JSON file per eval case ID with recorded LLM responses
- `.github/workflows/ci.yml`: Add eval step with `--mock` flag in the agent test job

## Implementation Order

1. **Phase 1a + 1b** (Pydantic validation + retry): Changes the LLM output contract, foundation for everything else
2. **Phase 1c + 1d** (evaluator node + numeric check): The biggest architectural improvement
3. **Phase 2a** (concurrency limiter): Small change, high safety value
4. **Phase 3a + 3c** (Langfuse integration + fallback): Observability without breaking existing logging
5. **Phase 3b** (evaluation scores in Langfuse): Wire evaluator scores to Langfuse
6. **Phase 2b + 2c + 2d** (HTTP resilience + health check + graceful degradation)
7. **Phase 4a + 4b + 4c** (expanded eval + quality scoring + mock CI)

## What This Plan Does NOT Include

- Streaming LLM responses (UX improvement, not reliability)
- Multiple LLM provider support (not needed)
- Kubernetes/Helm (Docker Compose is appropriate for this project's scale)
- Message queues or background job systems (LangGraph runtime already handles concurrency via Redis + Send())
- RAG/vector search (project uses structured data, not documents)

## Verification

1. All existing tests pass: `pnpm test`, `cd apps/agent && uv run pytest`, `pnpm --filter app test:e2e`
2. New evaluator tests pass: `uv run pytest tests/test_evaluator.py`
3. Run evaluation: `cd apps/agent && uv run python ../../evaluation/run_eval.py` (expanded dataset, quality scores reported)
4. Mock eval in CI: `uv run python ../../evaluation/run_eval.py --mock` passes
5. Health check: `curl http://localhost:3000/api/health` returns 200 with component status
6. Langfuse traces visible in dashboard (if keys configured)
7. Manual test: Generate reports for 10+ accounts, verify concurrency is limited and evaluator catches bad reports
8. Manual test: Kill agent container, verify frontend shows graceful error instead of crash
9. Verify Pydantic fallback: Check logs for any `metadata_fallback_triggered` warnings
10. Verify evaluator routing: Check logs for `report_evaluation_fail` / `report_evaluation_marginal` events
