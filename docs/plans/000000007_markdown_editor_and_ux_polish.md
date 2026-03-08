# Plan: Replace TipTap with Markdown Editor + UX Polish

## Context

TipTap StarterKit strips HTML tags it doesn't support (tables, complex lists). The LLM outputs markdown natively. Switching to a markdown editor eliminates the markdown-to-HTML conversion pipeline entirely and renders tables/lists correctly. Several other UX issues to fix alongside.

## Changes

### 1. Replace TipTap with `@uiw/react-md-editor`

Store markdown in DB instead of HTML. Use `@uiw/react-md-editor` for display + editing in the modal.

**Frontend (`report-modal.tsx`):**
- Remove TipTap imports (`useEditor`, `EditorContent`, `StarterKit`)
- Remove `EditorToolbar` component
- Add `@uiw/react-md-editor` with preview mode by default
- The editor handles markdown natively - tables, lists, headings all render correctly
- Keep debounced auto-save on content change (save raw markdown)
- Keep agent state sync (`report_manually_edited`, `report_latest_content`) but pass markdown instead of HTML

**Backend (`report_graph.py`):**
- Remove `import markdown` and the HTML conversion step
- Save the raw markdown body directly via `_save_report` (no `markdown.markdown()` call)

**Backend (`contracts.py`):**
- `update_report`: remove `md_lib.markdown()` conversion, save raw markdown
- `REPORT_UPDATE_PROMPT`: change instruction from "Current Report Content (HTML)" to "(Markdown)" since content is now markdown

**Cleanup:**
- Remove `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/pm` from `package.json`
- Remove `@tailwindcss/typography` from `package.json` (no longer needed)
- Remove `@plugin "@tailwindcss/typography"` from `globals.css`
- Remove `markdown` from Python `pyproject.toml` dependencies

### 2. Fix "Generate..." button state (per-account)

Current bug: all "Generate..." buttons turn to "Generating..." simultaneously.

**Fix:** Track `generatingAccountIds: Set<string>` instead of a boolean `isGenerating`.
- `handleGenerateReport(id)`: add `id` to set
- `handleGenerateMissing()`: add all pending IDs to set
- On agent finish (isRunning true->false): clear the set
- Pass the set to `SelectedAccountsTable`, which checks `generatingAccountIds.has(account.id)` per row

**Files:**
- `contracts-canvas.tsx` - track set instead of boolean
- `selected-accounts-table.tsx` - per-row check

### 3. Modal close button cursor

Add `cursor-pointer` to the `&times;` button in `report-modal.tsx`.

### 4. Improve prompts to avoid AI tells

Update `apps/agent/src/prompts.py`:
- Remove em dash instruction artifacts
- Add explicit rules: "Do not use em dashes. Use commas, periods, or semicolons instead." and "No emojis."
- Add: "Write in plain business English. Avoid filler phrases like 'It is worth noting', 'Importantly', 'Notably'."

### 5. Update REPORT_UPDATE_PROMPT

Since content is now markdown (not HTML), update the prompt to reference markdown format.

## Files to modify

- `apps/app/src/components/contracts/report-modal.tsx` - replace TipTap with md-editor
- `apps/app/src/components/contracts/contracts-canvas.tsx` - generatingAccountIds set
- `apps/app/src/components/contracts/selected-accounts-table.tsx` - per-row generating state
- `apps/agent/src/report_graph.py` - remove markdown->HTML conversion
- `apps/agent/src/contracts.py` - remove markdown->HTML in update_report
- `apps/agent/src/prompts.py` - fix AI tells, update format references
- `apps/app/package.json` - add `@uiw/react-md-editor`, remove tiptap packages and typography
- `apps/app/src/app/globals.css` - remove typography plugin
- `apps/agent/pyproject.toml` - remove `markdown` dependency

## Verification

1. Generate a report - content saved as markdown in DB, modal shows rendered markdown with proper tables and lists
2. Edit in modal - raw markdown editing, auto-saves
3. Agent updates report - reads/writes markdown (no HTML conversion)
4. "Generate..." buttons only show "Generating..." for accounts being generated
5. Close button shows pointer cursor
6. No em dashes or AI filler in generated reports
