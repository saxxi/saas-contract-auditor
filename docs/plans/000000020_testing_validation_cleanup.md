# Plan 020: Testing, Validation, and Cleanup

Add tests for business logic, input validation at API boundaries, split long files, structured error handling, and remove debug code.

## 1. Testing

Plan 019 covers frontend tests. Below covers the full picture.

### Frontend (Vitest) — see plan 019 for details

- `parse-report.ts` pure functions (parseReport, parseTable, replaceSectionBody, parseResolutionOptions, parseKeyMetrics, parseRisks, parseNextSteps, parseEvidence, parseObjectionHandlers)
- `db-queries.ts` data access layer (getAccounts, getAccountSummaries, createReport proposition logic, updateReportContent)
- API route handlers (all GET/POST/PUT routes, 404 paths, 400 validation paths)
- React Query hooks (fetch calls, cache invalidation, disabled states)

### Python Agent (pytest)

- `report_graph.py`
  - `_filter_relevant_deals`: tier matching, outcome scoring, MRR ratio scoring, top 8 selection
  - `_parse_report_metadata`: valid JSON extraction, fallback on malformed JSON, missing fields default values
  - `_extract_report_body`: removes JSON metadata line, preserves report content
  - `analyze_account`: returns expected keys (content, proposition_type, success_percent, intervene), handles raw_data vs structured input
  - `process_account`: returns errors list when account fetch fails, returns errors when save fails
  - `build_report_graph`: compiles without error, fan_out produces correct number of Send objects

- `contracts.py`
  - `_raw_json_to_summary`: new format passthrough (usage_metrics array), legacy format conversion (paired fields), extra keys as generic metrics
  - `select_accounts`: deduplicates against existing entries, returns Command with correct state update
  - `find_opportunities`: parses recommended IDs from LLM output, replaces selection (not appends)
  - `analyze_raw_data`: JSON input goes through _raw_json_to_summary, free text sets raw_data field

- `opportunities_graph.py`
  - `fetch_and_analyze`: builds compact data for LLM, parses JSON array from last line, extracts analysis text
  - `build_opportunities_graph`: compiles without error

- `prompts.py`
  - Verify prompt strings contain required sections (Executive Summary, Situation, Complication, Resolution, Key Metrics, etc.)
  - Verify metadata JSON template is valid (parseable format string)

### CI integration
- Add `pnpm test` to CI workflow
- Add `pytest` to CI workflow
- Keep existing smoke test

## 2. Input Validation

### Zod schemas on all API routes
- `GET /api/account_summaries`: validate `account_ids` query param (non-empty string)
- `POST /api/accounts/[id]/account_reports`: validate body has required fields (content, proposition_type, success_percent, intervene)
- `PUT /api/account_reports/[id]`: validate body has content field, optional metadata fields have correct types
- `POST /api/account_reports/batch`: validate body is array of strings, max length 5
- Return structured `{ error: string, details?: ... }` JSON on 400

### Python side
- Validate `account_ids` param is non-empty list in agent tools
- Validate `account_id` is non-empty string in single-account tools

## 3. Split Long Files

### `page.tsx` (499 lines)
- Extract `EXAMPLE_1`, `EXAMPLE_2`, `CACHED_NORTHSTAR_REPORT`, `CACHED_VELOCITY_REPORT` to `lib/landing-data.ts`
- Page component drops to ~170 lines

### `contracts.py` (388 lines)
- Extract `AgentState`, `Report`, `AccountReport` to `types.py`
- Extract `_raw_json_to_summary` to `transforms.py`
- `contracts.py` becomes tool definitions only (~200 lines)

## 4. Error Handling

- Replace bare `catch {}` blocks with logging or user-facing error messages
- API routes: wrap DB calls in try/catch, return `{ error: "..." }` with appropriate status codes
- Python agent tools: return structured error messages instead of empty strings
- Add `onError` callback to React Query hooks that surfaces toast/console errors

## 5. Cleanup

- Remove `console.log("[agent state]", agent.state)` from `contracts-canvas.tsx:59`
- Remove unused `reportsById` from `handleGenerateSelected` dependency array in `contracts-canvas.tsx:124`

## Priority Order

1. **Testing** — biggest grade impact
2. **Input validation** — second biggest, prevents real bugs
3. **Split long files** — quick wins, improves maintainability
4. **Error handling** — systematic improvement
5. **Cleanup** — trivial fixes

## Out of Scope

- Auth/authz
- Rate limiting
- Proper DB timestamps
- Docker compose full-stack deploy
- Pagination
