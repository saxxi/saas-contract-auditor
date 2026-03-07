# Plan: Backend Integration [IMPLEMENTED]

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
| `GET /api/accounts` | List all accounts (minimal: id, name only) |
| `GET /api/accounts/:id` | Single account (minimal: id, name only) |
| `GET /api/account_summaries?account_ids=AC-1,AC-2` | Detailed usage/budget data for given accounts (simulates fetching from different tables) |
| `POST /api/accounts/:account_id/account_reports` | Generate report for one account |
| `GET /api/account_reports` | List all generated reports |
| `GET /api/account_reports/:id` | Get specific report |
| `POST /api/account_reports/batch` | Generate reports for selected accounts without reports (max 5) |

REST is for report data only — selection/focus is UI state managed via CopilotKit agent state.

### What lives where

| Concern | Location |
|---------|----------|
| Accounts list (id, name) | `GET /api/accounts`, fetched once on mount |
| Account summaries (usage, budget) | `GET /api/account_summaries?account_ids=...`, fetched on demand |
| Selected account IDs | Derived from `agent.state.account_reports` |
| Reports | REST API (`/api/account_reports`), cached in agent state |
| Focused account | `agent.state.focused_account_id` |
| Chat context | Agent reads `focused_account_id` + `account_reports` from state |

## Changes

### Phase 1 — REST API routes (Next.js)

Create API routes with in-memory store (mock DB).

#### New files

- `apps/app/src/app/api/accounts/route.ts`
  - `GET` — return all accounts from seed data (minimal: id, name)

- `apps/app/src/app/api/accounts/[account_id]/route.ts`
  - `GET` — return single account (minimal: id, name)

- `apps/app/src/app/api/account_summaries/route.ts` **(new)**
  - `GET /api/account_summaries?account_ids=AC-1,AC-2,AC-3`
  - Returns array of `AccountSummary` objects for requested IDs
  - Pulls from seed data (simulates fetching from different tables)

- `apps/app/src/app/api/accounts/[account_id]/account_reports/route.ts`
  - `POST` — generate mock report for account, store in memory, return report

- `apps/app/src/app/api/account_reports/route.ts`
  - `GET` — return all generated reports

- `apps/app/src/app/api/account_reports/[id]/route.ts`
  - `GET` — return single report

- `apps/app/src/app/api/account_reports/batch/route.ts`
  - `POST` — accepts `{ account_ids: string[] }`, generates reports for all that don't have one yet, returns created reports
  - **Capped at 5 account_ids per request**

- `apps/app/src/lib/mock-db.ts`
  - In-memory store: `Map<string, AccountReport>`
  - Exports `getReports()`, `getReport(id)`, `createReport(accountId)`, `createReports(accountIds)`
  - `getAccounts()` returns `{id, name}[]` (minimal)
  - `getAccount(id)` returns `{id, name}` (minimal)
  - `getAccountSummaries(ids: string[])` returns detailed summary data for given IDs
  - `generateMockReport()` output uses snake_case fields (`account_id`, `proposition_type`, `success_percent`)
  - `createReports()` capped at **5** (not 50)

### Phase 2 — Agent state schema (Python)

Replace todo state with contracts auditor state.

#### Modify files

- `apps/agent/src/contracts.py`
  - Define `AccountReport`, `Report`, `AgentState` TypedDicts
  - Define tools:
    - `select_accounts(account_ids: list[str])` — adds entries to `account_reports` with `status: "pending"`
    - `get_account_reports()` — returns current `account_reports` from state
  - All fields use snake_case

- `apps/agent/main.py`
  - Import from `src.contracts` instead of `src.todos`
  - Update `AgentState`, tools list

### Phase 3 — Types & Data (snake_case)

#### Types (`apps/app/src/components/contracts/types.ts`)

All types use snake_case fields:

```ts
export interface Report {
  account_id: string;
  proposition_type: PropositionType;
  success_percent: number;
  intervene: boolean;
  content: string;
}

// Minimal — returned by /api/accounts
export interface Account {
  id: string;
  name: string;
}

// Detailed — returned by /api/account_summaries
export interface AccountSummary {
  id: string;
  active_users_report: { active_users: number; seat_limit: number };
  invoicing_usage_report: { monthly_invoices: number; invoice_limit: number };
  integrations_usage_report: { active_integrations: number; integration_limit: number };
  budget_report: { mrr: number; contract_value: number; tier: string; renewal_in_days: number; payment_status: string };
}
```

#### Accounts data (`apps/app/src/components/contracts/accounts-data.ts`)

- Export two views:
  - `accounts`: minimal `Array<{id, name}>` for the accounts list
  - `accountSeedData`: full data with all reports (used by mock-db for summaries + report generation)

### Phase 4 — Frontend: TanStack React Query + wiring

Install `@tanstack/react-query`. Use React Query for all REST data fetching.

#### New files

- `apps/app/src/lib/query-client.tsx`
  - `QueryClientProvider` wrapper, create `queryClient` singleton
  - Add to layout (`apps/app/src/app/layout.tsx`)

- `apps/app/src/hooks/use-accounts.ts`
  - `useAccounts()` — fetches `GET /api/accounts`, returns minimal `Account[]` (id, name)

- `apps/app/src/hooks/use-account-reports.ts`
  - `useAccountReports()` — fetches `GET /api/account_reports`
  - `useAccountReport(id)` — single report
  - `useGenerateReport()` — mutation for `POST /api/accounts/:id/account_reports`
  - `useGenerateReportsBatch()` — mutation for `POST /api/account_reports/batch`
  - `reportsById` map keyed by `r.account_id` (snake_case)

- `apps/app/src/hooks/use-account-summaries.ts` **(new)**
  - `useAccountSummaries(accountIds: string[])` — fetches `GET /api/account_summaries?account_ids=...`
  - Enabled only when accountIds is non-empty
  - Used by: selected-accounts-table (tier/MRR), report-modal (detail cards), Find Opportunities (agent data)

#### Modify files

- `apps/app/src/app/layout.tsx`
  - Wrap with `QueryClientProvider`

- `apps/app/src/components/contracts/contracts-canvas.tsx`
  - Replace static import with `useAccounts()` hook
  - Replace local `reports` state with `useAccountReports()` query
  - `reportsById` key: `r.account_id` (snake_case)
  - `handleFindOpportunities`: fetch summaries for unselected accounts before sending to agent
  - Remove direct access to `account.budget_report` etc. — those come from summaries now
  - Add `useEffect` logging agent state changes: `console.log("[agent state]", agent.state)`

- `apps/app/src/components/contracts/selected-accounts-table.tsx`
  - Accept `AccountSummary[]` data as prop (or fetch via `useAccountSummaries`)
  - Report field access: `report.proposition_type`, `report.success_percent` (snake_case)

- `apps/app/src/components/contracts/accounts-table.tsx`
  - Remove tier and MRR columns (accounts are now minimal: id + name only)

- `apps/app/src/components/contracts/report-modal.tsx`
  - Report field access: snake_case
  - Accept `AccountSummary` as prop for detail cards (users, invoices, etc.)

#### Delete files

- `apps/app/src/components/contracts/report-utils.ts` — logic moved to `mock-db.ts` (already deleted)

### Phase 5 — Agent report context in chat

- When `focused_account_id` changes, agent knows user is viewing that report
- Agent system prompt already handles contracts context
- Agent can reference the focused report's content when responding in chat
- Agent can suggest updates to the report based on chat conversation

## Mock behavior

- Reports generated server-side with same deterministic logic as current `report-utils.ts`
- In-memory store resets on server restart (acceptable for demo)
- No real LLM calls for report generation — just the mock algorithm
- Agent (LLM) handles chat, "Find Opportunities" analysis, and `select_accounts` tool calls
- All backend responses use snake_case fields — frontend types match

## File summary (refinements)

| File | Action |
|------|--------|
| `apps/app/src/components/contracts/types.ts` | Modify (snake_case, split Account/AccountSummary) |
| `apps/app/src/components/contracts/accounts-data.ts` | Modify (export minimal + full) |
| `apps/app/src/lib/mock-db.ts` | Modify (minimal accounts, add summaries, snake_case reports, cap 5) |
| `apps/app/src/app/api/accounts/route.ts` | Modify (minimal response) |
| `apps/app/src/app/api/accounts/[account_id]/route.ts` | Modify (minimal response) |
| `apps/app/src/app/api/account_summaries/route.ts` | **New** |
| `apps/app/src/app/api/account_reports/batch/route.ts` | Modify (cap 5) |
| `apps/app/src/hooks/use-account-summaries.ts` | **New** |
| `apps/app/src/hooks/use-accounts.ts` | Modify (minimal type) |
| `apps/app/src/hooks/use-account-reports.ts` | Modify (snake_case) |
| `apps/app/src/components/contracts/contracts-canvas.tsx` | Modify (snake_case, summaries, state logging) |
| `apps/app/src/components/contracts/selected-accounts-table.tsx` | Modify (snake_case, accept summaries) |
| `apps/app/src/components/contracts/accounts-table.tsx` | Modify (remove tier/MRR columns) |
| `apps/app/src/components/contracts/report-modal.tsx` | Modify (snake_case, accept summary) |

## Verification

1. `pnpm build --filter @repo/app` — must pass with no TS errors
2. `pnpm dev` — start app, open browser console
3. Select an account — console shows `[agent state]` with `account_reports` entry
4. Generate a report — verify `POST /api/accounts/:id/account_reports` returns snake_case fields
5. Open report modal — verify summary data loads and displays
6. Try batch generate with >5 selected — verify only 5 are processed
7. `GET /api/accounts` — verify returns only `{id, name}` per account
8. `GET /api/account_summaries?account_ids=AC-1,AC-2` — verify returns full summary data
9. Find Opportunities — verify agent receives summary data and selects accounts

## Notes

- Accounts seed data shared: used by both REST routes and the static FE file
- REST API is Next.js route handlers (not Python) — keeps it simple, same process
- Agent tools modify agent state only; REST stores report data independently
- When agent calls `select_accounts`, FE sees state change and can optionally trigger report generation via REST
- `report-utils.ts` was already deleted — logic lives in `mock-db.ts`
