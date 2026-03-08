# Plan 012: Report PDF Download

## Problem

Users can view and edit reports in the modal but have no way to export them. Account managers need to share reports with colleagues, attach them to CRM records, or print them for meetings.

## Approach

Add a PDF button to the report modal header. Uses `@media print` on the already-rendered `ReportPreview` content. No new dependencies, no markdown-to-HTML conversion (the browser already has the rendered DOM from React).

**Why `@media print` instead of a PDF library or iframe?**
- PDF libraries (`jspdf`, `html2pdf`, `@react-pdf/renderer`) add 200KB+ bundle and require reimplementing all styling
- Iframe approach requires converting markdown to HTML (regex-based converters break on nested formatting, tables with bold text, code blocks, etc.)
- `@media print` prints exactly what's already rendered. Zero conversion, zero edge cases

**Why not a markdown download button?**
- Dropped. The primary use case is sharing formatted reports, not raw markdown files

## Implementation

### Step 1: `apps/app/src/app/globals.css` — Add print styles

`@media print` block that:
- Hides all page content via `visibility: hidden`
- Shows only `[data-report-print]` and its children
- Positions the report content at top-left, full width, with padding

### Step 2: `apps/app/src/components/contracts/report-modal.tsx` — Add button and print target

- Add `handlePrint` callback that calls `window.print()`
- Add `data-report-print` attribute to the report content container
- Add PDF button to header bar (between save status and Raw Markdown toggle)

## Files Summary

| File | Type | Change |
|------|------|--------|
| `apps/app/src/app/globals.css` | Edit | Add `@media print` block (~15 lines) |
| `apps/app/src/components/contracts/report-modal.tsx` | Edit | Add `handlePrint` callback, `data-report-print` attr, PDF button |

## No New Dependencies

Uses browser-native `window.print()` + CSS `@media print` only.
