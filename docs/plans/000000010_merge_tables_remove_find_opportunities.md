# Plan 010: Merge Tables & Rework Find Opportunities

**Status: DONE**

## What Changed

### 1. Merged two tables into one unified `AccountsTable`
- Replaced `SelectedAccountsTable` + `AccountsTable` with a single table
- All accounts shown with checkbox; selected rows highlighted (blue tint) and sorted to top
- Columns: Checkbox | Report | ID | Name | Proposition | % Success | Intervene
- Deleted `selected-accounts-table.tsx`

### 2. Reworked "Find Opportunities" as a collaborative flow
- Created `apps/agent/src/opportunities_graph.py` — dedicated LangGraph pipeline
  - Fetches account summaries + names server-side (no JSON in chat)
  - LLM analyzes and returns discussion + recommended IDs
  - Uses `OPPORTUNITIES_MODEL` env var (can use lighter model)
  - Compact JSON (`separators=(",",":")`) to reduce tokens
- Added `find_opportunities` tool in `contracts.py` that calls the graph, replaces selection with only recommended accounts
- Frontend clears selection immediately on click, sends simple message with account IDs
- Split button with batch sizes: default 5, dropdown for 10/20/50/100/200/All

### 3. Renamed and simplified "Generate reports for selected"
- Was "Generate missing reports" — only generated for accounts without reports
- Now generates/regenerates for ALL selected accounts regardless of existing reports
- Button visible whenever accounts are selected (disabled only during generation)

### 4. Added "Deselect all" button
- Appears when any accounts are selected
- Clears `account_reports` in agent state

### 5. Updated agent system prompt (`main.py`)
- Added `find_opportunities` tool description
- Explicit rules: `select_accounts` is low-risk, no confirmation needed
- When user asks for N accounts, select exactly N

### Files Changed
- `apps/app/src/components/contracts/accounts-table.tsx` — rewritten as unified table with split button
- `apps/app/src/components/contracts/contracts-canvas.tsx` — simplified, batch size support
- `apps/app/src/components/contracts/selected-accounts-table.tsx` — deleted
- `apps/agent/src/opportunities_graph.py` — new file
- `apps/agent/src/contracts.py` — added `find_opportunities` tool
- `apps/agent/main.py` — updated system prompt
