# Plan: Post-Generation UX Fixes

## Context

Report generation via LangGraph is working, but four UX issues remain after initial implementation.

## Fixes

1. **Button state** — Replace `agent.isRunning` with local `isFindingOpportunities` flag
2. **Table refresh** — Invalidate React Query `["account-reports"]` cache when agent finishes
3. **Auto-open modal** — Set `focused_account_id` for single report; skip for batch
4. **TipTap styling** — Install `@tailwindcss/typography` for `prose` classes

## Files

- `apps/app/src/components/contracts/contracts-canvas.tsx`
- `apps/agent/src/contracts.py`
- `apps/app/package.json` + `globals.css`
