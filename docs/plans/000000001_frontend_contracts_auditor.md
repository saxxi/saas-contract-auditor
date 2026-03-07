# Plan: Frontend - Contracts Auditor UI (Mock)

## Goal

Replace the todo-list demo UI with a Contracts Auditor interface. Frontend-only, hardcoded data, no agent integration yet.

## Layout

```
+---------------------------------------------+------------------+
|  LEFT SIDE (accounts area)                   |  RIGHT SIDE      |
|                                              |  (chat, always   |
|  [Selected Accounts Table - max 10 visible,  |   visible)       |
|   scrolls if more]                           |                  |
|                                              |                  |
|  [Accounts Table - fills remaining space]    |                  |
|                                              |                  |
+---------------------------------------------+------------------+
```

- No mode toggle (remove existing toggle)
- Chat always visible on right
- Left side: two stacked tables

## Data

- Hardcode accounts from `docs/material/accounts_seed.json` as a static import/constant in the frontend
- Types: `Account` with id, name, active_users_report, invoicing_usage_report, integrations_usage_report, budget_report

## Components to CREATE

### `apps/app/src/components/contracts/`

1. **`types.ts`** - Account type, Report type, SelectedAccount type (extends Account with report status/data)

2. **`accounts-data.ts`** - Hardcoded accounts array from seed data

3. **`contracts-canvas.tsx`** - Main canvas component (replaces ExampleCanvas)
   - Local state: `selectedAccountIds: Set<string>`, `reports: Map<string, Report>`
   - Renders SelectedAccountsTable + AccountsTable stacked vertically

4. **`selected-accounts-table.tsx`** - Top table
   - Shows only accounts whose checkbox is checked
   - Max height ~40%, scrolls if >10 rows
   - Columns: checkbox (to deselect), Report status, id, name, proposition type, % of success, intervene?
   - Report column shows:
     - `[Generate]` button if no report yet
     - `Generated [open]` link if report exists
   - Header area has a `[Generate missing reports]` button to bulk-generate for all selected accounts without reports

5. **`accounts-table.tsx`** - Bottom table
   - Shows accounts NOT in selected set
   - Fills remaining vertical space, scrolls
   - Columns: checkbox (to select), id, name
   - Checking moves account to selected table

6. **`report-modal.tsx`** - Modal/dialog overlay
   - Opens when user clicks `[open]` on a generated report
   - Left side of modal: the generated proposition text (mock content)
   - Right side of modal: placeholder for chat (just a note "Chat context will update here")
   - Close button to dismiss

### `apps/app/src/components/app-layout.tsx` - New layout (replaces ExampleLayout)
   - Fixed split: left = accounts area, right = chat
   - No mode toggle
   - Responsive: on mobile, stack vertically or hide chat

## Components to DELETE

- `apps/app/src/components/example-canvas/` (entire folder: index.tsx, todo-list.tsx, todo-column.tsx, todo-card.tsx)
- `apps/app/src/components/example-layout/` (entire folder: index.tsx, mode-toggle.tsx)
- `apps/app/src/hooks/use-generative-ui-examples.tsx` (todo-specific)
- `apps/app/src/hooks/use-example-suggestions.tsx` (todo-specific)
- `apps/app/src/components/generative-ui/` (not needed for contracts auditor)

## Files to MODIFY

- **`apps/app/src/app/page.tsx`** - Replace imports, use new AppLayout + ContractsCanvas, remove generative UI hooks
- **`apps/app/src/hooks/index.ts`** - Remove deleted hook exports

## Mock behavior

- **Select/deselect**: checkbox toggles move accounts between tables (local state)
- **Generate report**: sets a mock report object with fake proposition text, success %, proposition type
- **Generate missing reports**: bulk-generates mock reports for all selected accounts without one
- **Open report**: opens modal with mock proposition content
- **No agent interaction** yet - chat renders but does not respond to account context

## Phases

### Phase 1 - Scaffolding
- Create types and data file
- Create new layout component
- Delete old components
- Wire up page.tsx with new layout

### Phase 2 - Tables
- Build AccountsTable with checkbox selection
- Build SelectedAccountsTable with report column
- Implement select/deselect flow between tables

### Phase 3 - Reports
- Add Generate button (per-account) + Generate missing reports button
- Create mock report generation (random proposition type, % success, intervene flag)
- Build ReportModal with mock content

### Phase 4 - Find Opportunities (Agent Integration)
- Add "Find Opportunities" button to AccountsTable (lower table)
- On click: sends unselected accounts data as a message to the agent via CopilotKit chat
- Agent analyzes accounts for upsell, negotiation, churn risk based on usage/limits/renewal
- Register `select_accounts` frontend tool so the agent can select accounts from the chat
- Update Python agent system prompt to understand contracts auditor context
- Agent responds in chat with reasoning and calls `select_accounts` to move top opportunities to selected table

#### Frontend changes
- `contracts-canvas.tsx`: add `useAgent()` + `useFrontendTool("select_accounts", ...)` to let agent select accounts
- `accounts-table.tsx`: add `onFindOpportunities` prop, render "Find Opportunities" button in header
- Loading state while agent is running

#### Agent changes
- `apps/agent/main.py`: update system prompt for contracts auditor context
- `apps/agent/src/todos.py`: replace todo state/tools with contracts state schema (keep file, rename later)

## Notes

- All state is local React state for now; will move to agent state later
- Account data is static; will come from agent/backend later
- Report generation is instant mock; will call agent later
- Chat integration with report context is deferred
- "Find Opportunities" is the first agent integration point - agent receives account data via chat message and can select accounts via frontend tool
