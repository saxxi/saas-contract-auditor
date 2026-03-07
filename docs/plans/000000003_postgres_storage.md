# Plan: PostgreSQL Storage

## Goal

Replace in-memory mock-db with PostgreSQL via Drizzle ORM. Create a seed script so the project can be started fresh with `pnpm db:seed`.

## Design

- **ORM**: Drizzle (lightweight, type-safe, good Next.js fit)
- **Driver**: `postgres` (postgres.js — fast, no native deps)
- **Tables**: `accounts` (seed data), `reports` (generated on demand)
- **Seed**: `apps/app/src/lib/db/seed.ts` — inserts all 50 accounts from `accounts-data.ts`
- Account summaries are just detailed columns on the `accounts` table (no separate table needed — the `/api/account_summaries` endpoint just selects more columns)

## Schema

```
accounts
  id              text PK        (e.g. "AC-1")
  name            text NOT NULL
  active_users    int
  seat_limit      int
  monthly_invoices int
  invoice_limit   int
  active_integrations int
  integration_limit int
  mrr             int
  contract_value  int
  tier            text
  renewal_in_days int
  payment_status  text

reports
  account_id      text PK FK -> accounts.id
  proposition_type text NOT NULL
  success_percent int NOT NULL
  intervene       boolean NOT NULL
  content         text NOT NULL
```

## Changes

### New files
- `apps/app/src/lib/db/index.ts` — Drizzle client singleton
- `apps/app/src/lib/db/schema.ts` — table definitions
- `apps/app/src/lib/db/seed.ts` — seed script (runnable via tsx)
- `apps/app/drizzle.config.ts` — Drizzle config

### Modified files
- `apps/app/package.json` — add `drizzle-orm`, `postgres`, `drizzle-kit`, `tsx` deps + `db:*` scripts
- `apps/app/src/lib/mock-db.ts` — replace in-memory Maps with Drizzle queries
- `.env.example` — add `DATABASE_URL`

### Scripts
- `pnpm --filter @repo/app db:generate` — generate migrations
- `pnpm --filter @repo/app db:migrate` — run migrations
- `pnpm --filter @repo/app db:seed` — seed accounts
- `pnpm --filter @repo/app db:push` — push schema directly (dev)

## Verification
1. `docker run -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres` (or local pg)
2. `pnpm --filter @repo/app db:push && pnpm --filter @repo/app db:seed`
3. App loads accounts from DB
4. Generate report → stored in DB → persists across server restarts
