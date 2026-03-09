# Plan 025: Docker Deployment

**Status**: Completed
**Date**: 2026-03-09

## Goal

Provide a production-ready Docker Compose setup so the full stack (Next.js app, LangGraph agent, PostgreSQL) can be deployed with a single `docker compose up`.

## Architecture (5 containers)

```
docker-compose.yml
├── app                 (Next.js standalone, port 3000)
│   └── depends_on: app-postgres, langgraph-api
├── app-postgres        (postgres:17-alpine, port 5432)
├── langgraph-api       (langchain/langgraph-api Wolfi, port 8123→8000)
│   └── depends_on: langgraph-postgres, langgraph-redis
├── langgraph-postgres  (pgvector/pgvector:pg16, port 5433)
└── langgraph-redis     (redis:6)
```

## Key Decisions

- **Two Postgres instances**: LangGraph requires pgvector and its own schema for checkpointing. Sharing one DB would be fragile.
- **Redis required**: LangGraph production image uses Redis for pub-sub streaming. Cannot be removed.
- **Wolfi distro**: Security-focused, zero-CVE goal, glibc-based. Set via `image_distro: wolfi` in `langgraph.json`.
- **`langchain/langgraph-api:3.12` base image**: Handles serving internally on port 8000. Includes healthcheck at `/api/healthcheck.py`.
- **Dockerfile.app unchanged**: `LANGGRAPH_DEPLOYMENT_URL` is a runtime env passed via compose, no build-time change needed.
- **DB migration as explicit step**: Use `migrate` service (tools profile) after startup. No auto-migration.

## Files Modified

| File | Action |
|------|--------|
| `docker-compose.yml` | Created — 5 services with healthchecks and dependency ordering |
| `docker/Dockerfile.agent` | Created — uses `langchain/langgraph-api:3.12` base |
| `docker/Dockerfile.app` | Reviewed — no changes needed |
| `apps/agent/langgraph.json` | Added `image_distro: wolfi` |
| `.dockerignore` | Updated — added `.coverage`, `playwright-report`, `.langgraph_api` |
| `.env.example` | Updated — added `POSTGRES_PASSWORD` |

## Usage

```bash
# Start all services
docker compose up -d --build

# Apply DB schema and seed (first run)
docker compose --profile tools run --rm migrate db:push
docker compose --profile tools run --rm migrate db:seed

# Access
# App: http://localhost:3000
# LangGraph API: http://localhost:8123

# Teardown
docker compose down -v
```
