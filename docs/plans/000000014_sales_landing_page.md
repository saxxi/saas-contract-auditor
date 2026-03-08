# Plan 014: Sales Landing Page + Demo Route

## Context
Convert the app into a sales-oriented app. Current contracts auditor moves to `/demo`. New homepage showcases the product with a hero, interactive example data, and real report generation for user-modified data.

## Changes

### 1. Navigation bar (`apps/app/src/components/navbar.tsx`)
- "Contract Auditor" branding top-left
- Nav links: Home (`/`), Demo (`/demo`)
- Compact, border-bottom separator

### 2. Root layout changes (`apps/app/src/app/layout.tsx`)
- Add navbar above `{children}`
- Make body flex column: navbar fixed height, content `flex-1 overflow-hidden`
- CopilotKit stays wrapping everything (both pages use the chat)

### 3. Move current page to `/demo` (`apps/app/src/app/demo/page.tsx`)
- Copy current `page.tsx` content verbatim

### 4. New homepage (`apps/app/src/app/page.tsx`)

**Section 1: Hero**
- Title: "Are your SaaS clients still on the right contract?"
- Subtitle explaining contract auditing value prop

**Section 2: Two-column layout**
- Column 1 (left):
  - Row 1: "See an example in action!" + description + "Generate Report" button
  - Row 2: Example toggle buttons ("Example 1", "Example 2") + large textarea
- Column 2 (right): CopilotKit chat sidebar (min-h 350px, max-h 520px)

**Section 3: Secondary CTA**
- "Want to see the full experience?" + link to `/demo`

### 5. Example data

**Example 1 (default):** Rich text dataset for Northstar Logistics GmbH. Includes client overview, contract details, plan limits, overage pricing, current usage, feature adoption, growth trends, operational signals, financial indicators, CS notes, upcoming events.

**Example 2:** JSON dataset for Velocity Logistics (structured JSON with contract, usage, history fields).

### 6. Report generation flow

**When Example 1 textarea is unchanged (default data):**
- Skip agent call entirely
- Show `CACHED_NORTHSTAR_REPORT` constant instantly in dialog
- Cache contains full consulting-grade markdown report (situation, complication, resolution, metrics, evidence, risks, next steps, key question, sales script)

**When textarea is modified or Example 2 is used:**
- Click "Generate Report" sends textarea content as chat message
- Agent processes via `analyze_raw_data` Python tool
- Report returned via `demo_report` agent state field, shown in dialog

### 7. Extract `analyze_account()` (`apps/agent/src/report_graph.py`)

Pure analysis function extracted from `process_account()`. Takes `(summary, deals)`, returns `{ content, proposition_type, success_percent, intervene }`. `process_account()` now calls this then saves to DB.

### 8. New Python tool: `analyze_raw_data` (`apps/agent/src/contracts.py`)

- Accepts raw text/JSON account data
- Transforms via `_raw_json_to_summary()` into AccountSummary shape
- Calls `analyze_account()` for LLM analysis
- Returns result via `demo_report` state field (no DB save)
- Handles malformed input gracefully

### 9. Landing report dialog (`apps/app/src/components/landing-report-dialog.tsx`)

Mirrors the demo's `ReportModal` visually and functionally:
- Same header bar: account name, proposition badge, success %, action required indicator
- Same toolbar: save status indicator, PDF button (`window.print()`), Raw Markdown / Preview toggle, close button
- Same report body: `ReportPreview` component with `editable` + `onContentChange`
- Same raw mode: `MDEditor` with live preview
- **Fake save:** edits trigger "Saving..." / "Saved (demo)" status with no actual persistence
- No DB hooks (`useUpdateReportContent`, `useAgent`) since there's no backing data

### 10. Agent state

`AgentState` class in `contracts.py` gets `demo_report: Report | None` field.

## Files

| File | Action | Notes |
|------|--------|-------|
| `apps/app/src/components/navbar.tsx` | Create | Nav bar component |
| `apps/app/src/app/layout.tsx` | Edit | Add navbar + flex wrapper |
| `apps/app/src/app/demo/page.tsx` | Create | Current page.tsx moved here |
| `apps/app/src/app/page.tsx` | Rewrite | Landing page with two examples + report dialog |
| `apps/app/src/components/landing-report-dialog.tsx` | Create | Full-featured modal with fake save |
| `apps/agent/src/contracts.py` | Edit | Add `analyze_raw_data` tool, `_raw_json_to_summary`, `demo_report` state field |
| `apps/agent/src/report_graph.py` | Refactor | Extract `analyze_account()` from `process_account()` |

## Future: User-defined data source (not in scope now)

User provides two fully arbitrary URLs + a bearer token (we don't know their API structure):

- Settings page stores these 3 values (DB or env)
- Accounts list URL returns an array of `{ id, name, ... }` mapped to our `Account` type
- Account data URL (with `{id}` placeholder) returns per-account data run through `_external_json_to_summary(data)` then fed to `analyze_account(summary, deals)`
- The transform function may need to be flexible (LLM-assisted mapping?) since each customer's API shape will differ

## Verification
1. Homepage: navbar + hero + two-column section (examples+textarea | chat) + secondary CTA
2. Click "Generate Report" with default Example 1 data: instant cached report dialog
3. Switch to Example 2 or modify data: click "Generate Report": agent generates report via LLM, dialog opens
4. Report dialog matches demo: editable sections, raw markdown toggle, PDF download, fake save status
5. "See the full demo" CTA links to `/demo` with full contracts auditor
6. `/demo` works exactly as before
