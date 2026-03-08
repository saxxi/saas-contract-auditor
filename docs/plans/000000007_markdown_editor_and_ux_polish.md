# Plan: Replace TipTap with Markdown Editor + McKinsey-Style Reports

## Context

TipTap StarterKit strips unsupported HTML (tables, complex lists). LLM outputs markdown natively. Switching to a markdown editor eliminates the conversion pipeline and renders all content correctly.

Additionally, reports now follow a McKinsey-style "Situation, Complication, Resolution" framework for more actionable, structured engagement briefs.

## Changes (all implemented)

### 1. TipTap replaced with `@uiw/react-md-editor`
- Raw markdown stored in DB (no HTML conversion)
- `@uiw/react-md-editor` loaded via `next/dynamic` (SSR disabled)
- Preview mode by default, Edit button toggles to live editor with toolbar
- Dark mode detected via MutationObserver on `<html>` class
- Removed: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/pm`, `@tailwindcss/typography`
- Removed: Python `markdown` library, all `markdown.markdown()` calls

### 2. McKinsey-style modal layout
- Compact header: account name, proposition badge (solid colored), success %, action required flag
- Metrics strip below header: MRR, renewal, payment, users, invoices, integrations with utilization %
- Edit/Preview toggle button (top right)
- Toolbar hidden in preview mode, shown in edit mode
- Generated date moved to metrics strip

### 3. McKinsey-style report prompt (Situation/Complication/Resolution)
- **Situation**: facts only, numbers first
- **Complication**: what breaks if nothing changes
- **Resolution**: Option A vs Option B table with action/upside/risk/timeline, then recommendation
- **Key Metrics**: pipe table with utilization %
- **Evidence from Similar Engagements**: historical deals with "what happened / what it means"
- **Risks and Mitigants**: paired table (risk + likelihood + mitigant)
- **Next Steps**: RACI-style table (action/owner/deadline relative to renewal)
- **Key Question**: one question for the client meeting

### 4. Writing style rules in prompts
- No em dashes, no emojis, no filler phrases
- Numbers first, lead with conclusion
- Plain business English, short direct sentences
- Bullet points use `-` not `*`

### 5. Per-account "Generating..." button state
- `generatingIds: Set<string>` tracks which accounts are generating
- Only the specific row shows "Generating...", others stay normal

### 6. Other fixes
- Close button: `cursor-pointer`
- Guard all `agent.runAgent()` with `if (agent.isRunning) return`
- React Query cache invalidation on agent completion

## Files modified
- `apps/app/src/components/contracts/report-modal.tsx` - full rewrite
- `apps/app/src/components/contracts/contracts-canvas.tsx` - generatingIds, guards
- `apps/app/src/components/contracts/selected-accounts-table.tsx` - per-row state
- `apps/agent/src/report_graph.py` - removed markdown->HTML conversion
- `apps/agent/src/contracts.py` - removed markdown->HTML in update_report
- `apps/agent/src/prompts.py` - McKinsey-style SCR framework + style rules
- `apps/agent/main.py` - updated system prompt terminology
- `apps/app/package.json` - added md-editor, removed tiptap + typography
- `apps/app/src/app/globals.css` - removed typography plugin
- `apps/agent/pyproject.toml` - removed markdown dependency

## Verification
1. Clear cache: `rm -rf apps/agent/.cache/*.json`
2. Generate a report: should produce SCR-structured markdown with tables
3. Modal: preview mode shows rendered markdown, Edit button toggles to editor
4. Dark mode: editor background matches app theme
5. Per-account buttons: only generating row shows "Generating..."
6. No em dashes or filler in generated content
