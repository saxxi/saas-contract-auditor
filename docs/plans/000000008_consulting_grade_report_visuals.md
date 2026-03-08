# Plan: Consulting-Grade Report Visualizations

## Context

Reports currently render as raw markdown via `@uiw/react-md-editor` in preview mode. The content structure is solid (Situation/Complication/Resolution framework, tables, metrics), but it reads like a plain text document. We want executive-presentation-quality visuals: data gauges, comparison cards, color-coded risk matrices, timelines — the kind of polished output you see in top-tier strategy consulting deliverables.

## Approach: Hybrid Custom React Renderer

**Keep markdown as source of truth in DB.** No backend/agent/schema changes. Only change how preview mode renders.

- **Edit mode**: Raw markdown editor stays as-is (`@uiw/react-md-editor`)
- **Preview mode**: Replace md-editor preview with a custom React component that parses markdown sections and renders each with specialized visual components using `recharts` (already installed, unused)

This avoids the TipTap mistake (stripped HTML). Markdown stays editable. We only upgrade the visual output.

## New Files

### `apps/app/src/components/contracts/report-preview/parse-report.ts`
Parse markdown by `### ` headings into structured object. Parse pipe-tables into arrays. Fallback: return raw markdown for unparseable sections.

### `apps/app/src/components/contracts/report-preview/report-preview.tsx`
Main preview component composing all visual sub-components. Consulting-grade layout:
- **Proposition banner**: Full-width colored strip at top (red=negotiation, blue=upsell, amber=poor usage, orange=at capacity, emerald=healthy) with proposition label + success % badge
- **Executive summary**: Situation + Complication in two-column grid with serif typography, subtle left border accent
- **Resolution options**: Side-by-side glassmorphism cards with gradient headers. Recommended option has gold accent border. Each card shows Action/Upside/Risk/Timeline rows. Recommendation text below
- **Key Metrics dashboard**: Row of radial utilization gauges (recharts `RadialBarChart`) with animated fill, color transitions (green to amber to red). Financial metrics (MRR, contract, renewal, payment) as styled stat cards beside gauges
- **Evidence callouts**: Cards with left colored border, deal ID chip, "what happened" / "what it means" in distinct typography
- **Risk matrix**: Horizontal cards with large colored likelihood badge (High=red pill, Med=amber, Low=green), risk text, mitigant in muted sub-text
- **Next Steps timeline**: Horizontal connected dots with numbered circles, vertical text below each (action, owner, deadline). Line connecting dots uses gradient
- **Key Question**: Large pull-quote box with left accent bar, serif italic font, subtle background
- **Fallback sections**: Any unrecognized section rendered via `react-markdown`

### `apps/app/src/components/contracts/report-preview/utilization-gauge.tsx`
Reusable radial gauge using recharts. Takes `value`, `max`, `label`. Color shifts green to amber to red by utilization %.

### `apps/app/src/components/contracts/report-preview/option-card.tsx`
Styled card for Resolution options. Recommended option gets highlighted border.

### `apps/app/src/components/contracts/report-preview/risk-matrix.tsx`
Color-coded risk rows with likelihood badges.

### `apps/app/src/components/contracts/report-preview/timeline-steps.tsx`
Horizontal timeline with numbered circles, action/owner/deadline below each.

### `apps/app/src/components/contracts/report-preview/evidence-card.tsx`
Styled callout card for historical deal evidence. Left colored border, deal ID chip badge, two-line layout (what happened / what it means).

### `apps/app/src/components/contracts/report-preview/key-question.tsx`
Pull-quote styled component. Large serif italic text, left accent bar, subtle background tint.

### `apps/app/src/components/contracts/report-preview/section-header.tsx`
Reusable section heading with horizontal rule accent. Consistent typography across all sections.

### `apps/app/src/components/contracts/report-preview/stat-card.tsx`
Small metric card for financial data (MRR, contract value, renewal days, payment status). Used alongside gauges in Key Metrics section.

## Modified Files

### `apps/app/src/components/contracts/report-modal.tsx`
- Import `ReportPreview` via `dynamic(() => import(...), { ssr: false })`
- `isEditing ? <MDEditor preview="edit" ...> : <ReportPreview content={content} summary={summary} propositionType={report.proposition_type} />`
- MDEditor only shown in edit mode now (no more preview mode from md-editor)

### `apps/app/src/app/globals.css`
- Consulting color palette CSS variables (`--consulting-blue: #003A70`, `--consulting-gold: #C5A900`, etc.)
- Google Font import for serif typography (Georgia fallback)

## Package Changes
- **Add**: `react-markdown` — lightweight fallback renderer for sections the parser can't handle (user-edited non-standard markdown)
- **Already installed**: `recharts` v3.7 (unused, now activated for gauges/charts)

## No Backend Changes
- No DB schema changes
- No API route changes
- No Python agent/prompt changes

## Implementation Order
1. `parse-report.ts` (pure function, no deps)
2. `utilization-gauge.tsx`, `option-card.tsx`, `risk-matrix.tsx`, `timeline-steps.tsx`, `evidence-card.tsx`, `key-question.tsx`, `section-header.tsx`, `stat-card.tsx` (independent components)
3. `report-preview.tsx` (composes all above)
4. `report-modal.tsx` (swap preview rendering)
5. `globals.css` (color variables)

## Key Risks & Mitigations
- **Table parsing fragility**: Defensive parser with raw-markdown fallback per section
- **recharts SSR**: Use `dynamic()` with `ssr: false` (same pattern as md-editor)
- **User edits break structure**: Unrecognized sections render as plain markdown via react-markdown
- **Responsive**: Two-column layouts collapse to single-column in narrow modal

## Verification
1. Generate a report, open modal — should see visual preview with gauges, cards, timeline
2. Click Edit — should see raw markdown editor, make changes, switch back to preview
3. Test dark mode toggle — all new components should respect `dark:` classes
4. Edit markdown to break a section heading — that section should fallback to plain markdown rendering
5. Generate reports for different proposition types — banner colors should match
