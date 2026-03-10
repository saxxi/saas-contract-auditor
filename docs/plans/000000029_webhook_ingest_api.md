# Plan 029: Webhook Ingest API

## Context

Account data currently enters the system via UI paste or DB seed. Users need a programmatic way to push account data from external systems (CRMs, billing platforms, monitoring tools). The webhook endpoint allows upsert/delete of accounts by a stable external key, with support for attaching documents (contracts, usage logs, notes) alongside the existing numeric metrics and budget data.

Self-hosted deployment focus; HMAC-SHA256 auth now, broader auth deferred. See `docs/plans/roadmap_self_hosted.md` for the full product roadmap.

This plan includes three future-proofing additions (cheap now, expensive to retrofit): `tenant_id` column, pluggable auth middleware pattern, and `audit_events` table.

## Design: Single Atomic Webhook + Documents Table

### Why this approach
- Existing `account_usage_metrics` and `account_budgets` tables already handle numeric metrics and financials
- Documents (contract text, API usage logs, CS notes) are qualitatively different from numeric metrics; they need their own entity
- Single POST endpoint for the full account payload keeps caller integration simple
- HMAC-SHA256 is the standard webhook auth pattern (GitHub, Stripe, Slack all use it)

### Alternatives considered
- **JSONB column on accounts**: simpler but can't query individual docs, no validation
- **Extend usage_metrics only**: contracts and logs don't fit as numeric current/limit pairs
- **Separate endpoints per resource**: more REST-pure but forces callers to make 4 API calls atomically

## Schema Changes

**File: `apps/app/src/lib/db/schema.ts`**

New table `account_documents`:
```
id: text PK
account_id: text FK -> accounts
document_type: text NOT NULL  (e.g. "contract", "api_usage", "seat_usage", "cpu_usage", "ai_token_usage", "custom")
title: text NOT NULL
content: text NOT NULL          (text or stringified JSON)
metadata: text (nullable)       (optional extra fields as JSON string)
unique(account_id, document_type, title)
```

Follows existing schema conventions: text columns, `created_at`/`updated_at`, FK to accounts.

Add `tenant_id` column to `accounts` table:
```
tenant_id: text (nullable)   -- ignored in OSS, enforced in enterprise
```
No index needed yet. No query changes; column exists purely as a future seam.

New table `audit_events`:
```
id: text PK
event_type: text NOT NULL     (e.g. "webhook.account.upserted", "webhook.account.deleted")
actor: text NOT NULL          (e.g. "webhook:hmac", "user:email@example.com")
resource_type: text NOT NULL  (e.g. "account")
resource_id: text NOT NULL    (the account_key or account id)
detail: text (nullable)       (JSON string with extra context: IP, user-agent, upsert counts)
created_at: text NOT NULL
```
Write-only in this phase. No UI, no queries, no retention policy yet. The table exists so every webhook call is logged from day one.

## Auth Middleware Pattern

**New file: `apps/app/src/lib/auth-middleware.ts`**

Pluggable authentication for route handlers. Ships with two strategies:

1. **HMAC webhook auth** (used by `/api/webhook/*`): validates `X-Webhook-Signature` header against `WEBHOOK_SECRET`
2. **No-op** (used by all other routes): passes through. Placeholder for session/OIDC auth in Phase 2+

```typescript
// Usage in a route handler:
import { withWebhookAuth } from "@/lib/auth-middleware";

export const POST = withWebhookAuth(async (req) => {
  // handler logic; req is already authenticated
});
```

The HMAC verification logic from `webhook-auth.ts` is wrapped into this middleware. `webhook-auth.ts` remains a pure utility (verify signature, return boolean); `auth-middleware.ts` is the Next.js integration layer (read body, verify, return 401/403 or call handler).

## API Endpoints

### `POST /api/webhook/accounts` - Upsert account + related data

Headers: `X-Webhook-Signature: sha256=<hmac_hex>`

```json
{
  "account_key": "ext-acme-001",
  "name": "Acme Corp",
  "context": "Enterprise client, 3yr contract",
  "usage_metrics": [
    { "metric_name": "api_calls", "current_value": 8500, "limit_value": 10000, "unit": "requests/month" }
  ],
  "budget": {
    "mrr": 5000, "contract_value": 60000, "tier": "growth",
    "renewal_in_days": 45, "payment_status": "current"
  },
  "documents": [
    { "document_type": "contract", "title": "MSA 2025", "content": "Full contract text..." },
    { "document_type": "api_usage", "title": "March API Logs", "content": "..." }
  ]
}
```

Logic (in a DB transaction):
1. Upsert `accounts` (account_key -> id, onConflictDoUpdate)
2. Upsert each `account_usage_metrics` (conflict on account_id+metric_name)
3. Upsert `account_budgets` (conflict on account_id)
4. Replace `account_documents` (delete all for account, insert new)

`usage_metrics`, `budget`, `documents` are all optional; only provided fields are upserted.

Returns `201` with `{ account_key, upserted: { metrics: N, budget: bool, documents: N } }`.

### `DELETE /api/webhook/accounts/[account_key]` - Delete account + cascade

Headers: `X-Webhook-Signature: sha256=<hmac_hex>` (signs empty body)

Deletes child rows in order: reports, documents, metrics, budgets, then account.
Returns `200` or `404`.

## HMAC Authentication

**New file: `apps/app/src/lib/webhook-auth.ts`**

- Env var: `WEBHOOK_SECRET` (fail-closed: no secret = reject all)
- Sender: `HMAC-SHA256(raw_request_body, secret)` -> hex digest
- Header: `X-Webhook-Signature: sha256=<hex>`
- Receiver: recompute + `timingSafeEqual` (Node.js `crypto`)

## DB Query Additions

**File: `apps/app/src/lib/db-queries.ts`**

- `upsertAccount(id, name, context)` - onConflictDoUpdate on PK
- `upsertUsageMetrics(accountId, metrics[])` - onConflictDoUpdate on (account_id, metric_name)
- `upsertBudget(accountId, budget)` - onConflictDoUpdate on account_id
- `replaceDocuments(accountId, documents[])` - delete + insert
- `getAccountDocuments(accountId)` - for agent consumption
- `deleteAccountCascade(accountId)` - manual cascade delete (child tables first)
- `writeAuditEvent(event)` - insert into audit_events (fire-and-forget, never blocks the request)

## Agent Integration

The agent fetches account data via `GET /api/account_summaries` -> `getAccountSummaries()` in db-queries.ts.

Extend `getAccountSummaries` to also fetch `account_documents` grouped by account_id and include in response:
```typescript
// AccountSummary gains:
documents?: { document_type: string; title: string; content: string }[]
```

The LLM prompt (`REPORT_ANALYZER_PROMPT`) is already schema-agnostic ("inspect the data"). Documents will flow through as part of `{account_data}` JSON. Optionally add one line to the prompt about reviewing attached documents.

No changes needed to `report_graph.py` or `contracts.py`; data flows automatically via the existing summary fetch path.

## Files to Create/Modify

| File | Change |
|------|--------|
| `apps/app/src/lib/db/schema.ts` | Add `accountDocuments`, `auditEvents` tables; add `tenant_id` to `accounts` |
| `apps/app/src/lib/webhook-auth.ts` | **NEW** - HMAC verification utility (pure function) |
| `apps/app/src/lib/auth-middleware.ts` | **NEW** - Pluggable auth middleware (wraps webhook-auth for routes) |
| `apps/app/src/app/api/webhook/accounts/route.ts` | **NEW** - POST handler (uses `withWebhookAuth`) |
| `apps/app/src/app/api/webhook/accounts/[account_key]/route.ts` | **NEW** - DELETE handler (uses `withWebhookAuth`) |
| `apps/app/src/lib/db-queries.ts` | Add upsert/delete/getDocuments/writeAuditEvent functions |
| `apps/app/src/components/contracts/types.ts` | Add `AccountDocument`, `AuditEvent`, update `AccountSummary` |
| `docs/api/openapi.yaml` | Document webhook endpoints |
| `apps/app/src/lib/db/seed.ts` | Import new tables for clearing |
| `docs/lessons_learned/decisions.md` | Document webhook + future-proofing decisions |
| `docs/plans/roadmap_self_hosted.md` | **NEW** - Self-hosted product roadmap |

## Implementation Sequence

1. Schema + types (`accountDocuments`, `auditEvents` tables, `tenant_id` on accounts, TS interfaces)
2. HMAC utility (`webhook-auth.ts`) + auth middleware (`auth-middleware.ts`) + unit tests
3. DB query functions (upsert, delete cascade, getDocuments, writeAuditEvent)
4. POST webhook route (uses `withWebhookAuth`, writes audit event) + tests
5. DELETE webhook route (uses `withWebhookAuth`, writes audit event) + tests
6. Agent integration (extend getAccountSummaries with documents)
7. Seed script update (clear new tables)
8. OpenAPI spec update
9. Docs + lessons learned

## Verification

1. **Unit tests**: HMAC verification (valid/invalid/missing/timing-safe), auth middleware (wraps handler correctly, rejects before handler runs), POST route (full payload, partial, bad sig, bad body, oversized body), DELETE route (existing, not found, bad sig)
2. **Audit trail**: POST and DELETE both write audit events; verify events exist in DB after each operation
3. **Integration test**: POST account -> GET /api/account_summaries verifies data present including documents; POST twice verifies upsert (no duplicates); DELETE verifies cascade (including documents and audit events for the account)
4. **Agent roundtrip**: POST account via webhook -> generate report via agent -> verify documents referenced in LLM output
5. **Schema**: `tenant_id` column exists on accounts, nullable, no queries use it yet
6. **curl smoke test**:
   ```bash
   SECRET="test-secret"
   BODY='{"account_key":"test-1","name":"Test Corp","usage_metrics":[{"metric_name":"seats","current_value":80,"limit_value":100,"unit":"users"}]}'
   SIG=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$SECRET" | cut -d' ' -f2)
   curl -X POST http://localhost:3000/api/webhook/accounts \
     -H "Content-Type: application/json" \
     -H "X-Webhook-Signature: sha256=$SIG" \
     -d "$BODY"
   ```

## Payload Size Limits

Enforce 1MB max request body in the route handler. Log a warning for documents > 100KB individually.
