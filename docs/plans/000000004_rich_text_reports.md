# Plan: Rich Text Editable Reports

## Goal

Make report content editable with a rich text editor in the modal, with autosave on debounce.

## Context

- Reports are generated as plain text and displayed read-only in a modal
- Users need to refine/adjust report content after generation or after chatting with the agent
- Edits should persist without a manual save button

## Decisions

- **Editor**: TipTap (`@tiptap/react` + `@tiptap/starter-kit`) — lightweight, ProseMirror-based, great React/Tailwind DX. Preferred over HugeRTE (heavy, legacy API) and Lexical (more complex API for this use case)
- **Content format**: HTML stored in the existing `content` text column. Plain text auto-wrapped in `<p>` tags on first load
- **Save strategy**: Debounced autosave (800ms) via `PUT /api/account_reports/:id`. Status indicator in header (Saving.../Saved)
- **Toolbar**: Minimal — bold, italic, H3, bullet list, ordered list. Enough for report formatting without clutter

## Changes

### Backend
- `mock-db.ts`: `updateReportContent(reportId, content)` — updates `content` + `updated_at`
- `PUT /api/account_reports/[id]` — new route handler for content updates
- `use-account-reports.ts`: `useUpdateReportContent()` mutation hook

### Frontend
- `report-modal.tsx`: Replaced static `<p>` with TipTap `EditorContent` + toolbar
- Editor resets content when `report.id` changes (e.g. after regeneration)
- Summary stats moved to 3-column grid at bottom, editor takes main space
- Save status indicator in header next to Regenerate button

### Schema (done in prior task)
- Reports table already had `id`, `generated_at`, `created_at`, `updated_at`
- Multiple reports per account already supported
