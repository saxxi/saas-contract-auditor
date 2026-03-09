# Plan 019: Frontend API Unit Tests

## Goal

Add unit tests for the frontend API layer: Next.js API route handlers, data-access functions (`mock-db.ts`), React Query hooks, and pure utility functions (`parse-report.ts`).

## Current State

- No unit test framework configured (only Playwright for e2e)
- No test files exist
- API routes are thin wrappers over `mock-db.ts` functions
- `mock-db.ts` contains all DB queries via Drizzle ORM
- Hooks (`use-accounts.ts`, `use-account-summaries.ts`, `use-account-reports.ts`) are thin React Query wrappers over fetch calls
- `parse-report.ts` has pure parsing functions (no dependencies) — easiest to test

## Test Framework Choice

**Vitest** — fast, native ESM/TypeScript support, compatible with Next.js path aliases, minimal config. Use `@testing-library/react` + `@testing-library/react-hooks` for hook tests.

## Setup Steps

1. Install dev dependencies:
   ```
   pnpm add -D vitest @vitejs/plugin-react @testing-library/react @testing-library/jest-dom jsdom
   ```
2. Create `apps/app/vitest.config.ts` with path alias resolution (`@/` → `src/`)
3. Add `"test": "vitest run"` and `"test:watch": "vitest"` scripts to `apps/app/package.json`

## Test Suites

### 1. `parse-report.test.ts` — Pure utility functions (no mocking needed)

Location: `apps/app/src/components/contracts/report-preview/__tests__/parse-report.test.ts`

| Function | Test cases |
|---|---|
| `parseReport` | Parses markdown into sections by `###` headings; handles preamble (no heading); tracks correct `startLine`/`endLine`; handles empty input |
| `parseTable` (via `parseReport`) | Extracts pipe-table headers and rows; returns undefined for < 3 table lines; trims cell whitespace |
| `replaceSectionBody` | Replaces body of a headed section; replaces preamble body; preserves other sections |
| `parseResolutionOptions` | Extracts option names stripping "Option X:" prefix; maps action/upside/risk/timeline rows correctly; handles missing columns |
| `parseKeyMetrics` | Maps table rows to metric objects; handles rows with missing cells |
| `parseRisks` | Maps risk/likelihood/mitigant columns |
| `parseNextSteps` | Maps number/action/owner/deadline columns |
| `parseEvidence` | Extracts bullet items; captures deal IDs matching `D-\d+`; handles bullets without deal IDs |
| `parseObjectionHandlers` | Extracts `**"objection"**` + rebuttal pairs; handles multiple objections; flushes last item |

### 2. `mock-db.test.ts` — Data access layer (mock Drizzle)

Location: `apps/app/src/lib/__tests__/mock-db.test.ts`

Mock the `db` object from `./db/index.ts` to avoid real DB connections. Use `vi.mock` to replace Drizzle query methods.

| Function | Test cases |
|---|---|
| `getAccounts` | Returns array of `{id, name}` from DB rows |
| `getAccount` | Returns account when found; returns `undefined` when not found |
| `getAccountSummaries` | Returns empty array for empty input; joins budgets + metrics correctly; groups metrics by account ID; converts numeric strings to numbers |
| `getReports` | Returns reports ordered by `generated_at` desc |
| `getReport` | Returns most recent report for account; returns `undefined` when none |
| `createReport` | Returns `null` when account not found; inserts report with correct proposition logic; covers all 5 proposition branches (over limit, near limits, low usage, at capacity, healthy) |
| `createReportFromData` | Returns `null` when account not found; inserts with provided data; sets default values for optional fields |
| `updateReportContent` | Updates content and `updated_at`; applies metadata fields when provided; returns `undefined` when report not found |
| `getHistoricalDeals` | Returns all deals |
| `createReports` | Creates up to 5 reports; skips accounts not found |
| `generateMockReport` (indirect) | Tested via `createReport` — verify proposition type selection logic for each branch |

### 3. API Route handler tests

Location: `apps/app/src/app/api/__tests__/routes.test.ts`

Mock `@/lib/mock-db` entirely. Test route handlers by calling them directly with constructed `Request` objects and checking `NextResponse` output.

| Route | Method | Test cases |
|---|---|---|
| `/api/accounts` | GET | Returns JSON array of accounts |
| `/api/accounts/[id]` | GET | Returns account; returns 404 for missing account |
| `/api/account_summaries` | GET | Returns summaries for given IDs; returns 400 when `account_ids` missing |
| `/api/account_reports` | GET | Returns all reports |
| `/api/account_reports/[id]` | GET | Returns report; returns 404 for missing |
| `/api/account_reports/[id]` | PUT | Updates report content; updates with metadata; returns 404 for missing |
| `/api/account_reports/batch` | POST | Creates reports for given IDs; returns 400 for non-array; returns 400 for > 5 IDs |
| `/api/accounts/[id]/account_reports` | POST | Creates report from JSON body (agent); creates mock report (fallback); returns 404 for missing account |
| `/api/historical_deals` | GET | Returns all deals |

### 4. React Query hook tests

Location: `apps/app/src/hooks/__tests__/hooks.test.ts`

Use `@testing-library/react` with a `QueryClientProvider` wrapper. Mock `fetch` globally.

| Hook | Test cases |
|---|---|
| `useAccounts` | Fetches `/api/accounts` and returns data; uses `staleTime: Infinity` |
| `useAccountSummaries` | Fetches with sorted comma-joined IDs; disabled when `accountIds` is empty |
| `useAccountReports` | Fetches `/api/account_reports` |
| `useAccountReport` | Fetches single report by ID; disabled when `id` is null |
| `useUpdateReportContent` | Sends PUT with content; invalidates `account-reports` queries on success |
| `useGenerateReport` | Sends POST to account reports endpoint; invalidates queries on success |
| `useGenerateReportsBatch` | Sends POST with account_ids array; invalidates queries on success |

## Priority Order

1. **`parse-report.test.ts`** — Zero dependencies, pure functions, highest value/effort ratio
2. **API route tests** — Core business logic validation
3. **`mock-db.test.ts`** — DB layer correctness (requires more mocking)
4. **Hook tests** — Thin wrappers, lower priority but good for regression

## Estimated Test Count

~60-70 test cases total across all suites.

## Out of Scope

- CopilotKit route (`/api/copilotkit`) — depends on external runtime, better covered by integration/e2e tests
- Component rendering tests — separate effort
- AG-UI middleware — external library wrapper
