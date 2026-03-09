# SaaS Contract Auditor

AI-powered tool that compares SaaS contract limits against real account usage data to surface revenue opportunities. It classifies each account (upsell, renegotiation, churn risk, healthy) and generates consulting-grade reports with strategic recommendations, objection handlers, and sales scripts.

This is NOT a legal document parser or blockchain smart contract tool. It works with structured account data (usage metrics, billing info, contract terms), not contract PDFs.

## Application Layout

**Homepage** (`/`): Landing page with a try-it-now experience. Users paste account data (plain text or JSON), generate a report via the AI agent, and view the result in a dialog. Includes two pre-filled examples and a chat sidebar. Links to the full demo.

**Demo** (`/demo`): Full application with split layout:
- **Right side**: AI chat (always visible)
- **Left side**: Two tables
  - **Selected accounts** (top): Shows accounts flagged for action with report status, proposition type, success %, and intervention flag. Users can generate or open reports.
  - **All accounts** (bottom): Full account list with checkboxes to select accounts for analysis.
  - **"Find Opportunities"** button: Sends unselected accounts to the AI agent which analyzes them and auto-selects the best opportunities.

**Reports**: Generated per-account with situation/complication/resolution structure, key metrics, evidence from similar deals, risks/mitigants, next steps, objection handlers, and closing framework. Reports can be viewed in a modal and discussed via chat.

## Tech Stack

- Frontend: Next.js 16 + React 19 + Tailwind 4 + CopilotKit + Recharts
- Agent: LangGraph (Python) + LangChain + Pydantic (LLM output validation)
- Database: PostgreSQL + Drizzle ORM
- Monorepo: Turborepo + pnpm

## Production Resilience

Use `/production-grade` skill for code quality reviews. Key patterns already in use:
- `invoke_with_retry()` in `src/resilience.py` for LLM retries with exponential backoff
- `asyncio.Semaphore` (`MAX_CONCURRENT_LLM`) for fan-out concurrency
- Pydantic validation on all LLM structured output (`ReportMetadata`, `ReportEvaluation`, `OpportunitiesResult`)
- LLM evaluator node: scores reports against a rubric (sections, metrics accuracy, classification justification, evidence grounding). On "fail", re-analyzes with feedback (max 1 retry)
- Langfuse integration (optional): LLM observability with trace visualization, evaluation scores. Set `LANGFUSE_PUBLIC_KEY`/`LANGFUSE_SECRET_KEY` to enable
- `GET /api/health` for Docker healthcheck
- Eval suite: 15 cases, `--mock` for CI

## HOW TO OPERATE

- Always read and keep updated `docs/lessons_learned` so we know why we took a decision instead of another.
  - each line should be a bullet point, no fillers, be succint eg. "- we decided to use library X as we first tried library Y but found difficulties in doing [...]" or `- when testing if a python feature works use script scripts/script.py`
- **MANDATORY**: Before writing any code for a significant change (new feature, new dependency, schema change, architectural change), FIRST create or update a plan in `docs/plans`. No exceptions. Small bug fixes and cosmetic tweaks are exempt
- use `docs/material` folder as source

## WHEN SESSION IS CONCLUDED

- cleanup `docs/lessons_learned` (remove what will never be useful in future)
- Ensure `CLAUDE.md` small, concise, useful
