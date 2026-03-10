# Self-Hosted Product Roadmap

## Vision

Open-core model: OSS version is fully functional for single-team use. Enterprise plugin adds multi-tenancy, SSO, audit, and integrations. Similar to Kestra, n8n, GitLab: the core product is complete, the plugin unlocks organizational features.

## Phase 1: Webhook Ingest API (Plan 029, current)

Programmatic data ingestion. Enables external systems (CRMs, billing, monitoring) to push account data.

- POST/DELETE webhook endpoints with HMAC-SHA256 auth
- `account_documents` table for contracts, usage logs, CS notes
- Agent integration (documents flow into report generation)
- **Future-proofing additions (new in this phase):**
  - `tenant_id` column on `accounts` (nullable, ignored for now; prevents painful migration later)
  - Auth middleware pattern (pluggable; ships with HMAC webhook check, no-op for UI routes)
  - `audit_events` table (write-only; every webhook call logged)

## Phase 2: Basic Authentication

Minimum viable auth for self-hosted. No enterprise features yet.

| Component | Detail |
|-----------|--------|
| Session auth | Cookie-based sessions, bcrypt passwords |
| User table | `users(id, email, password_hash, role, tenant_id, created_at)` |
| Roles | `admin` (manage users, webhooks) and `member` (view/generate reports) |
| Login page | Email + password form, session cookie on success |
| Middleware | Next.js middleware protecting all `/api/*` and `/demo` routes |
| API keys | `api_keys(id, user_id, key_hash, label, last_used_at)` for programmatic access alongside HMAC webhooks |

This is the "local auth" that ships with OSS. No external IdP yet.

## Phase 3: Audit Trail + Webhook Management UI

| Component | Detail |
|-----------|--------|
| Audit log UI | `/settings/audit` page, filterable by action/user/date |
| Webhook management | `/settings/webhooks` page: create/rotate secrets, view delivery history, retry failed deliveries |
| Delivery log | `webhook_deliveries(id, endpoint, status, response_code, payload_hash, created_at)` |
| Retention policy | Config var `AUDIT_RETENTION_DAYS` (default 90), cron job to prune |

## Phase 4: Enterprise Plugin (paid)

This is where the open-core split happens. Everything below ships as a separate package/module.

### SSO (OIDC/SAML)
- OIDC provider config (`/settings/sso`): client ID, secret, discovery URL
- SAML support for enterprises that require it
- Auto-provision users from IdP claims
- Disable local auth when SSO is active

### Multi-Tenancy
- `tenant_id` becomes enforced (not nullable)
- Tenant switcher in UI
- Data isolation: all queries scoped by tenant
- Per-tenant webhook secrets and API keys

### Advanced RBAC
- Custom roles beyond admin/member
- Account-set permissions (team A sees only their accounts)
- Report visibility scoping

### Integrations (push)
- Salesforce: push report findings as opportunity notes
- HubSpot: sync account classifications as deal properties
- Slack: webhook notifications on report generation
- Email: scheduled digest of new findings

### LLM Budget Controls
- Per-tenant token budgets (daily/monthly caps)
- Model tier restrictions (e.g., tenant A gets GPT-4, tenant B gets GPT-3.5)
- Usage dashboard with cost attribution

## Phase 5: Scheduled Operations

| Component | Detail |
|-----------|--------|
| Scheduled reports | Cron-based report regeneration (daily/weekly) |
| Scheduled ingestion | Pull-mode: fetch from configured API endpoints on schedule |
| Alerting | Threshold-based alerts (e.g., utilization > 90% -> Slack/email) |
| Bulk operations | CSV import/export, batch webhook replay |

## Architecture Seams

These are the extension points that make the plugin model work:

1. **Auth middleware** (Phase 1): pluggable `authenticate(req)` function. OSS: checks HMAC/session. Enterprise: adds OIDC/SAML.
2. **Tenant scoping** (Phase 1): `tenant_id` on accounts. OSS: always null (single tenant). Enterprise: enforced.
3. **Audit writer** (Phase 1): `writeAuditEvent()` function. OSS: writes to DB. Enterprise: adds structured export, retention, UI.
4. **Integration hooks** (Phase 4): post-report-generation hook. OSS: no-op. Enterprise: Salesforce/HubSpot/Slack push.

## Pricing Model (reference)

Already defined on landing page:
- **OSS (AGPL-3.0)**: Full product, self-hosted, community support
- **Personal/Startup ($299 one-time)**: Commercial license, removes AGPL obligations
- **Enterprise ($999 one-time)**: Enterprise plugin, SSO, multi-tenancy, priority support
