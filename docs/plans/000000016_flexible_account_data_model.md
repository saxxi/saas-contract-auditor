# Plan 016: Flexible Account Data Model

## Problem

The current DB schema hardcodes exactly 3 usage metric types (seats, invoices, integrations) across 3 separate tables. When real-world account data contains other metrics (API calls, automation runs, storage, etc.), that data is silently dropped. The LLM then generates reports based on incomplete data, producing incorrect analysis.

The prompt (`prompts.py`) is already schema-agnostic. The bottleneck is the data layer: rigid tables that can only express a fixed set of metrics.

Additionally, qualitative context (CS notes, growth trends, feature adoption) has no storage at all.

## Approach: Flexible Metrics + Context

Replace the 3 rigid per-metric tables with 1 flexible key-value table. Add a freeform context field for qualitative data. Keep `account_budgets` as-is (financial fields are structurally consistent).

### Changes

**1. New table: `account_usage_metrics`**
- `id: text PK`
- `account_id: text FK -> accounts`
- `metric_name: text NOT NULL` (e.g. "seats", "api_calls", "storage_tb")
- `current_value: numeric NOT NULL` (using numeric for decimals)
- `limit_value: numeric NOT NULL`
- `unit: text` (optional: "calls/mo", "TB", "seats", etc.)
- `unique(account_id, metric_name)`

**2. New column on `accounts`: `context: text (nullable)`**
Freeform text for CS notes, growth trends, feature adoption.

**3. Drop tables**: `account_active_users`, `account_invoicing_usages`, `account_integrations_usages`

**4. Update `AccountSummary` type** (`types.ts`): usage_metrics array instead of 3 fixed report fields

**5. Update `getAccountSummaries`** (`mock-db.ts`): query `account_usage_metrics` grouped by account

**6. Update seed data** (`accounts-data.ts`): convert to flexible format

**7. Update `_raw_json_to_summary`** (`contracts.py`): iterate over whatever usage data is provided

**8. Update `generateMockReport`** (`mock-db.ts`): compute utilization from flexible metrics array

### What stays the same
- `prompts.py` — already schema-agnostic
- `report_graph.py` — passes `summary` as JSON to prompt
- `account_budgets` table
- Report rendering, sales script generation

## Files to modify

| File | Change |
|------|--------|
| `apps/app/src/lib/db/schema.ts` | Drop 3 metric tables, add `account_usage_metrics`, add `context` to `accounts` |
| `apps/app/src/components/contracts/types.ts` | Update `AccountSummary` interface |
| `apps/app/src/components/contracts/accounts-data.ts` | Convert seed entries to flexible format |
| `apps/app/src/lib/db/seed.ts` | Seed `account_usage_metrics` instead of 3 separate tables |
| `apps/app/src/lib/mock-db.ts` | Update `getAccountSummaries`, `generateMockReport` |
| `apps/agent/src/contracts.py` | Update `_raw_json_to_summary` to be flexible |
| `docs/lessons_learned/decisions.md` | Document decision |

## Migration
Full DB reset (dev-only): `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` then push + seed.
