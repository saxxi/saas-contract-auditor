## Purpose

This is a **revenue intelligence tool for SaaS companies**. It compares account usage data against contract limits to identify upsell opportunities, churn risks, and accounts needing renegotiation. It generates consulting-grade reports with strategic recommendations and sales scripts.

**Target audience:** Account executives, customer success teams, and revenue operations managing B2B SaaS client portfolios.

**What it is NOT:** This is not a legal document parser, not a blockchain/smart contract auditor, and not a rule engine. It uses LLM analysis on structured account data.

## Core Concept

The system takes structured account data (usage metrics, billing info, contract terms) and uses an LLM to:
1. Compute utilization rates for every usage/limit pair (seats, API calls, storage, integrations, etc.)
2. Classify the account into one of: "upsell proposition", "requires negotiation", "poor usage", "at capacity", "healthy"
3. Generate a structured report with situation analysis, risk assessment, and actionable next steps
4. Generate a tailored sales script for the account rep

The analysis is schema-agnostic: the prompt instructs the LLM to scan whatever data is provided and adapt. No hardcoded field names.

## Architecture

This is a **Turborepo monorepo** with two apps:

```
apps/
  app/              # Next.js 16 frontend + API routes + PostgreSQL (Drizzle ORM)
  agent/            # LangGraph Python agent (CopilotKit integration)
docker/             # Dockerfiles for app and agent
docs/               # Plans, lessons learned, reference material
evaluation/         # Agent evaluation harness (8 contract cases)
scripts/            # Benchmark and utility scripts
```

### Data Flow

1. **User inputs account data** via the UI (paste text/JSON on homepage, or select from pre-seeded accounts in demo)
2. **Next.js API routes** handle CRUD for accounts and reports (PostgreSQL via Drizzle)
3. **CopilotKit** connects the React frontend to the LangGraph agent via chat
4. **LangGraph agent** has tools to: fetch account data from Next.js API, generate reports, find opportunities
5. **Report generation** uses `Send()` fan-out for parallel processing: each account gets its own fork (fetch > LLM analyze > save to DB)
6. **Reports** stored as markdown in PostgreSQL, rendered client-side with custom React section renderers

### Key Components

- **`apps/agent/src/report_graph.py`**: LangGraph StateGraph with `Send()` fan-out for parallel report generation. Includes Pydantic validation, section validation, numeric consistency checks
- **`apps/agent/src/opportunities_graph.py`**: Dedicated graph for "Find Opportunities" (bulk analysis to pick best accounts)
- **`apps/agent/src/contracts.py`**: Agent tools (generate_reports, select_accounts, update_report)
- **`apps/agent/src/prompts.py`**: LLM prompts for report analysis, sales scripts, and report updates
- **`apps/agent/src/transforms.py`**: Converts raw JSON/text input to structured account summaries
- **`apps/agent/src/resilience.py`**: Retry with backoff, shared HTTP client, concurrency limiter (asyncio.Semaphore)
- **`apps/agent/src/types.py`**: Pydantic models (`ReportMetadata`, `OpportunitiesResult`) and TypedDict state types
- **`apps/agent/src/tracing.py`**: Structured JSON logging + in-memory metrics counters
- **`apps/app/src/app/api/`**: Next.js REST API routes for accounts, reports, historical deals, health check, metrics
- **`apps/app/src/components/contracts/`**: React components for account tables, report modal, report preview

### State Management

Uses **CopilotKit v2's agent state pattern**:
- State lives in the LangGraph agent backend (Python)
- Frontend reads via `agent.state` and writes via `agent.setState()`
- Agent state includes: `account_reports` (list of reports with metadata), `focused_account_id`, `report_manually_edited`, `report_latest_content`
- Agent writes reports to DB directly; frontend invalidates React Query cache when agent finishes

### Account Data Model

Flexible key-value storage via `account_usage_metrics` table:
- Each row: `metric_name`, `current_value`, `limit_value`, `unit`
- Handles any metric type (seats, API calls, storage, automations, transactions)
- `accounts` table has a `context` column for qualitative CS notes
- Legacy format (paired fields like `active_users`/`seat_limit`) still supported for backward compat

### Report Structure

Reports follow a consulting framework:
1. Executive Summary (classification, ARR at risk, top signal, action)
2. Situation (facts from data, utilization ratios)
3. Complication (what requires action)
4. Resolution (two structurally different options in a table)
5. Key Metrics (usage/limit pairs with utilization and headroom)
6. Evidence from Similar Engagements (historical deals)
7. Risks and Mitigants
8. Next Steps
9. Key Question
10. Sales Script (opening hook, discovery questions, value framing, objection handlers, closing framework)

## Tech Stack

- **Frontend**: Next.js 16 (Turbopack), React 19, Tailwind CSS 4, CopilotKit, Recharts
- **Agent**: LangGraph (Python), CopilotKit SDK, OpenAI
- **Database**: PostgreSQL 17 + Drizzle ORM (app data), PostgreSQL 16 + pgvector (LangGraph state)
- **Monorepo**: Turborepo with pnpm workspaces
- **Deployment**: Docker Compose (5 containers: app, app-postgres, langgraph-api, langgraph-postgres, langgraph-redis)

## Development

```bash
pnpm install          # Install all dependencies
pnpm dev              # Start both frontend and agent
pnpm test             # Run unit tests
cd apps/agent && uv run pytest  # Agent tests
cd apps/agent && uv run python ../../evaluation/run_eval.py --mock  # Eval (mock)
curl http://localhost:3000/api/health  # Health check
```
