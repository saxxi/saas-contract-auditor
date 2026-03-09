# Plan 021: API Documentation (DONE)

Add lightweight, maintainable API documentation using JSDoc comments and a generated OpenAPI spec.

## Approach

Use inline JSDoc/TSDoc comments on each route handler. Keep docs co-located with the code so they stay in sync. Generate an OpenAPI/Swagger JSON from these comments using `next-swagger-doc` or a simple hand-maintained `openapi.yaml`.

Hand-maintained `openapi.yaml` is preferred: this project has ~10 routes, so auto-generation tooling adds more complexity than it saves.

## 1. Create `docs/api/openapi.yaml`

Single OpenAPI 3.1 spec covering all routes:

### Endpoints to document

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/accounts` | List all accounts |
| GET | `/api/accounts/[account_id]` | Get single account |
| GET | `/api/account_summaries?account_ids=` | Get account summaries (usage + budget) |
| GET | `/api/account_reports` | List all reports (newest first) |
| GET | `/api/account_reports/[id]` | Get single report by account ID |
| PUT | `/api/account_reports/[id]` | Update report content + metadata |
| POST | `/api/account_reports/batch` | Create reports for multiple accounts (max 5) |
| POST | `/api/accounts/[account_id]/account_reports` | Create report for single account |
| GET | `/api/historical_deals` | List all historical deals |

### For each endpoint, document:
- Request params / query params / body schema
- Response schema (200, 201, 400, 404, 500)
- Example request/response

## 2. Add inline comments to route handlers

Short JSDoc block at the top of each route function referencing the OpenAPI spec path. Example:

```ts
/** GET /api/accounts - returns all accounts. See docs/api/openapi.yaml */
export async function GET() { ... }
```

## 3. Serve spec at `/api/docs` (optional)

Simple route that returns the YAML file as JSON. Low priority, only if useful for frontend devs.

## Out of Scope

- Swagger UI hosting (overkill for this project size)
- Auto-generation from TypeScript types
- Versioning
