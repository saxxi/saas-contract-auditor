# Plan 015: Adaptive, Schema-Agnostic Report Prompts

## Problem
Report generation assumes a fixed data schema (seats, invoices, integrations, MRR, etc.). Real-world account data varies — different fields, naming, and completeness. Reports also lack financial anchoring and executive-scannable structure.

Based on 28 feedback items. After filtering out slop-prone suggestions, ~12 are worth implementing.

## Anti-Slop Filter
Rejected feedback items that would produce generic filler:
- "Data Gaps" section → always becomes "more data would help" boilerplate. Dropped.
- "Score Drivers" as a full section → LLM fabricates plausible-sounding reasons for an arbitrary number. Replaced with a 1-sentence `score_rationale` in metadata.
- "Measurable success criteria" with specific numbers → LLM invents targets ("reach 60% in 90 days") with no basis. Dropped.
- "Frame as unrealized value / wasted spend" → buzzword repackaging of the same content. Dropped as explicit instruction; good reports will do this naturally when the data supports it.
- "Pair operational recommendations with strategic goals" → produces vague platitudes. Dropped.

## Approach: Schema-Agnostic Prompt

### Data Inventory Step
Before analysis, LLM scans whatever data is provided and identifies:
- All usage/capacity pairs → compute utilization %
- All financial figures → compute ARR at risk (contract_value if churn risk, overage delta if over-limit)
- All time signals (renewal, onboarding, trends) → assess urgency
- If data is sparse, work with what's there — don't hallucinate missing signals

### Analytical Framework (questions, not field lookups)
1. Is the contract sized correctly for actual usage?
2. What revenue is at risk and on what timeline?
3. Is usage expanding, stable, or contracting?
4. Broad-but-shallow or narrow-but-deep engagement?

## Report Structure Changes

### New: Executive Summary (before Situation)
4 lines max. No filler. Format:
- **Classification**: [strategic bucket] | [proposition type]
- **ARR at Risk**: $X (computed from available financial data)
- **Top Signal**: one specific data point driving the classification
- **Action**: one sentence

### Enhanced existing sections
- **Situation**: all available metrics as ratios + percentages (e.g., "12/200 seats, 6%"). Financial anchor (ARR, contract value). Renewal timing context.
- **Complication**: connect contract scope to actual usage explicitly. If over limits, state the overage. If under-utilized, state the gap.
- **Resolution**: ensure the 2 options are structurally different types (e.g., one adoption-focused, one commercial). Not two variations of the same approach.
- **Key Metrics table**: add Headroom/Overage column. Add ARR at Risk row. For under-utilized accounts, show what a right-sized contract would look like.
- **Next Steps**: deadlines relative to renewal or urgency signals, not arbitrary dates.

### Classification
- Keep 5 proposition types, make criteria adaptive: use relative guidance ("typically <30% signals poor usage, >85% signals capacity pressure") not hardcoded field references
- Add strategic bucket to metadata: "Adoption Recovery", "Upsell Opportunity", "Underpriced Account", "Overprovisioned Contract", "Churn Risk", "Healthy Growth"
- Proposition-specific emphasis adapts to data: e.g., "poor usage" checks for narrow-but-deep pattern if transaction-level data exists before concluding churn risk

### Metadata JSON
```json
{"proposition_type": "...", "strategic_bucket": "...", "success_percent": N, "intervene": true/false, "priority_score": N, "score_rationale": "one sentence"}
```
- `priority_score` (1-10): high ARR + high urgency = high score. Computed from data, not vibes.
- `score_rationale`: one sentence max explaining the success_percent. Constrained to prevent rambling.

## Files to modify
1. `apps/agent/src/prompts.py` — rewrite REPORT_ANALYZER_PROMPT (schema-agnostic), update REPORT_UPDATE_PROMPT metadata format
2. `apps/agent/src/report_graph.py` — `_parse_report_metadata` (parse new fields with defaults), `_save_report` (pass new fields)
3. `apps/app/src/lib/db/schema.ts` — add `strategic_bucket` (text, nullable), `priority_score` (integer, nullable), `score_rationale` (text, nullable) to `reports` table
4. `apps/app/src/lib/mock-db.ts` — `createReportFromData` + `updateReportContent` accept new fields
5. `apps/app/src/app/api/accounts/[account_id]/account_reports/route.ts` — pass through new fields
6. `apps/app/src/app/api/account_reports/[id]/route.ts` — pass through new fields in PUT
7. `docs/lessons_learned/decisions.md` — document adaptive prompt decision + anti-slop rationale

## What stays the same
- `SALES_SCRIPT_PROMPT` — receives report as input, benefits automatically
- Report pipeline structure (`report_graph.py` graph)
- Frontend rendering — new sections are markdown, existing renderer handles them
- Opportunities graph — separate pipeline, not in scope

## Verification
1. DB reset + push + seed
2. Generate report for one account → verify Executive Summary present, metrics as ratios, ARR at risk computed
3. Verify metadata JSON has all new fields
4. Generate batch → check variety, no formulaic repetition across reports
5. Test report update via chat → new metadata preserved
6. Test `analyze_raw_data` (landing page) with different data shapes
