# Plan 022: Rename mock-db to db-queries (DONE)

`mock-db.ts` is the real data access layer (Drizzle/Postgres queries). The name is a leftover from when the project used hardcoded data. Rename to `db-queries.ts` to reflect its actual purpose.

## Files to change

### 1. Rename the file
- `apps/app/src/lib/mock-db.ts` -> `apps/app/src/lib/db-queries.ts`

### 2. Update all imports (18 files reference `mock-db`)

Route handlers:
- `apps/app/src/app/api/accounts/route.ts`
- `apps/app/src/app/api/accounts/[account_id]/route.ts`
- `apps/app/src/app/api/accounts/[account_id]/account_reports/route.ts`
- `apps/app/src/app/api/account_reports/route.ts`
- `apps/app/src/app/api/account_reports/[id]/route.ts`
- `apps/app/src/app/api/account_reports/batch/route.ts`
- `apps/app/src/app/api/account_summaries/route.ts`
- `apps/app/src/app/api/historical_deals/route.ts`

Tests:
- `apps/app/src/app/api/__tests__/routes.test.ts` (vi.mock path)
- `apps/app/src/lib/__tests__/mock-db.test.ts` -> rename to `db-queries.test.ts`

### 3. Update docs references
- `docs/plans/000000020_testing_validation_cleanup.md`
- `docs/lessons_learned/decisions.md`

### 4. Verification
- `pnpm build` passes
- `pnpm test` passes
- `grep -r "mock-db" apps/` returns zero results
