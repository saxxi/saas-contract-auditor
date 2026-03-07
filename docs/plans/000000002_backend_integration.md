# Plan: Backend Integration

## Goal

Hook up the frontend to a backend API for report data, move selection/focus to agent state, and have the backend mock report generation. Keep accounts as static FE data fetched via REST.

## State Design

### Agent State (CopilotKit, synced FE <-> BE)

```python
class AgentState(BaseAgentState):
    account_reports: list[AccountReport]   # selected accounts + their reports
    focused_account_id: str | None         # which report modal is open
```

```python
class AccountReport(TypedDict):
    id: str                                # account ID (e.g. "AC-1")
    status: Literal["pending", "generated"]
    report: Report | None                  # None when pending

class Report(TypedDict):
    proposition_type: str                  # "upsell", "renegotiation", "poor_usage", "at_capacity", "healthy"
    success_percent: int
    intervene: bool
    content: str
```

Selection = having an entry in `account_reports`. No separate selected IDs set.

### REST API (Next.js API routes, in-memory mock)

| Method | URL | Purpose |
|--------|-----|---------|
| `GET /api/accounts` | List all accounts (seed data) |
| `GET /api/accounts/:id` | Single account |
| `POST /api/accounts/:account_id/account_reports` | Generate report for one account |
| `GET /api/account_reports` | List all generated reports |
| `GET /api/account_reports/:id` | Get specific report |
| `POST /api/account_reports/batch` | Generate reports for all selected accounts without reports (up to 50) |

REST is for report data only — selection/focus is UI state managed via CopilotKit agent state.

### What lives where

| Concern | Location |
|---------|----------|
| Accounts list | `GET /api/accounts`, fetched once on mount |
| Selected account IDs | Derived from `agent.state.account_reports` |
| Reports | REST API (`/api/account_reports`), cached in agent state |
| Focused account | `agent.state.focused_account_id` |
| Chat context | Agent reads `focused_account_id` + `account_reports` from state |

## Changes

### Phase 1 — REST API routes (Next.js)

Create API routes with in-memory store (mock DB).

#### New files

- `apps/app/src/app/api/accounts/route.ts`
  - `GET` — return all accounts from seed data

- `apps/app/src/app/api/accounts/[account_id]/route.ts`
  - `GET` — return single account

- `apps/app/src/app/api/accounts/[account_id]/account_reports/route.ts`
  - `POST` — generate mock report for account, store in memory, return report

- `apps/app/src/app/api/account_reports/route.ts`
  - `GET` — return all generated reports

- `apps/app/src/app/api/account_reports/[id]/route.ts`
  - `GET` — return single report

- `apps/app/src/app/api/account_reports/batch/route.ts`
  - `POST` — accepts `{ account_ids: string[] }`, generates reports for all that don't have one yet, returns created reports

- `apps/app/src/lib/mock-db.ts`
  - In-memory store: `Map<string, AccountReport>`
  - Exports `getReports()`, `getReport(id)`, `createReport(accountId)`, `createReports(accountIds)`
  - Uses same report generation logic as current `report-utils.ts`

### Phase 2 — Agent state schema (Python)

Replace todo state with contracts auditor state.

#### Modify files

- `apps/agent/src/todos.py` → rename to `apps/agent/src/contracts.py`
  - Define `AccountReport`, `Report`, `AgentState` TypedDicts
  - Define tools:
    - `select_accounts(account_ids: list[str])` — adds entries to `account_reports` with `status: "pending"`
    - `get_account_reports()` — returns current `account_reports` from state
  - Remove all todo types and tools

- `apps/agent/main.py`
  - Import from `src.contracts` instead of `src.todos`
  - Update `AgentState`, tools list
  - Keep existing system prompt (already contracts-focused)

### Phase 3 — Frontend: TanStack React Query + wiring

Install `@tanstack/react-query`. Use React Query for all REST data fetching — no manual `useEffect`/`useState` for server data.

#### New files

- `apps/app/src/lib/query-client.tsx`
  - `QueryClientProvider` wrapper, create `queryClient` singleton
  - Add to layout (`apps/app/src/app/layout.tsx`)

- `apps/app/src/hooks/use-accounts.ts`
  - `useAccounts()` — `useQuery({ queryKey: ["accounts"], queryFn: ... })` fetching `GET /api/accounts`
  - Stale time high (accounts are static seed data)

- `apps/app/src/hooks/use-account-reports.ts`
  - `useAccountReports()` — `useQuery({ queryKey: ["account-reports"], queryFn: ... })` fetching `GET /api/account_reports`
  - `useAccountReport(id)` — `useQuery` for single report `GET /api/account_reports/:id`
  - `useGenerateReport()` — `useMutation` for `POST /api/accounts/:id/account_reports`, invalidates `["account-reports"]`
  - `useGenerateReportsBatch()` — `useMutation` for `POST /api/account_reports/batch`, invalidates `["account-reports"]`

#### Modify files

- `apps/app/src/app/layout.tsx`
  - Wrap with `QueryClientProvider`

- `apps/app/src/components/contracts/contracts-canvas.tsx`
  - Replace static import with `useAccounts()` hook
  - Replace local `reports` state with `useAccountReports()` query
  - Use mutations for report generation (auto-invalidates cache)
  - Read `selectedIds` from `agent.state.account_reports` (derived)
  - Read `openReportId` from `agent.state.focused_account_id`
  - `handleSelect` → update `agent.state.account_reports` (add entry with `status: "pending"`)
  - `handleDeselect` → update `agent.state.account_reports` (remove entry)
  - `handleGenerateReport` → call `generateReport.mutate(accountId)`
  - `handleGenerateMissing` → call `generateBatch.mutate(accountIds)`
  - `setOpenReportId` → update `agent.state.focused_account_id`
  - Remove `useFrontendTool` for `select_accounts` (now a backend agent tool)

- `apps/app/src/components/contracts/accounts-data.ts`
  - Keep as fallback/type reference, but primary data comes from REST

#### Delete files

- `apps/app/src/components/contracts/report-utils.ts` — logic moves to `mock-db.ts`

### Phase 4 — Agent report context in chat

- When `focused_account_id` changes, agent knows user is viewing that report
- Agent system prompt already handles contracts context
- Agent can reference the focused report's content when responding in chat
- Agent can suggest updates to the report based on chat conversation

## Mock behavior

- Reports generated server-side with same deterministic logic as current `report-utils.ts`
- In-memory store resets on server restart (acceptable for demo)
- No real LLM calls for report generation — just the mock algorithm
- Agent (LLM) handles chat, "Find Opportunities" analysis, and `select_accounts` tool calls

## Notes

- Accounts seed data shared: used by both REST routes and the static FE file
- REST API is Next.js route handlers (not Python) — keeps it simple, same process
- Agent tools modify agent state only; REST stores report data independently
- When agent calls `select_accounts`, FE sees state change and can optionally trigger report generation via REST
