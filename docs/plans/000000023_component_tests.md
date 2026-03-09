# Plan 023: Component-Level Tests (DONE)

Add Vitest + React Testing Library tests for untested UI components.

## Components to test

### 1. `AccountsTable` (`components/contracts/accounts-table.tsx`)

Pure presentational component, receives all data and callbacks as props. Easy to test.

Tests:
- Renders all accounts in the table
- Selected accounts appear with highlighted row styling
- Selected accounts sort to top
- Checkbox toggles call `onSelect`/`onDeselect`
- "Generate..." button appears for selected accounts without reports
- Report date link appears for accounts with reports, calls `onOpenReport`
- PropositionBadge renders correct colors per type
- "Generate reports for selected" button disabled when `generatingIds` is non-empty
- "Find Opportunities" button disabled when `isFinding` is true
- Empty state shows "No accounts found"
- Success % color coding: green >=70, amber >=40, red <40
- Intervene column shows "YES" (red) or "no"

### 2. `ReportModal` (`components/contracts/report-modal.tsx`)

Requires mocking: `useAgent`, `useUpdateReportContent`, dynamic imports (MDEditor, ReportPreview).

Tests:
- Renders account name and ID in header
- Shows proposition type badge with correct color
- Shows success % with correct color
- Shows "Action Required" when `report.intervene` is true
- MetricCard renders MRR, renewal, payment from summary
- Usage metrics rendered from summary
- Mode toggle switches between "Preview" and "Raw Markdown" labels
- Close button calls `onClose`
- Clicking backdrop calls `onClose`
- Clicking modal content does NOT call `onClose` (stopPropagation)

### 3. `HomePage` (`app/page.tsx`)

Requires mocking: `useAgent`, `CopilotChat`, `LandingReportDialog`.

Tests:
- Renders hero heading text
- Example 1 button active by default
- Switching to Example 2 updates textarea value
- "Generate Report" button triggers agent message
- "Open Report" button appears when `reportData` is set
- "See the full demo" link points to `/demo`
- Report dialog opens when `showDialog` is true

### 4. `Navbar` (`components/navbar.tsx`)

Tests:
- Renders "Contract Auditor" brand link
- Renders Home and Demo navigation links
- Active link has blue color class based on pathname
- Theme toggle button present

## Setup

- All tests in `__tests__/` directories next to their components
- Mock `@copilotkit/react-core/v2` module globally in vitest setup or per-file
- Use `@testing-library/react` `render` + `screen` queries
- Mock dynamic imports with `vi.mock("next/dynamic", ...)`

## Priority

1. AccountsTable (pure component, most value, easiest)
2. ReportModal (complex but high value)
3. HomePage (integration-heavy, lower ROI)
4. Navbar (trivial, lowest priority)
