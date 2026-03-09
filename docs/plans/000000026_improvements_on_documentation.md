# Plan 026: Documentation and Operational Improvements

## Problem

Some existing documentation (architecture page, decisions log, plan documents) was not surfaced in the README. Additionally, the repo lacked observability tooling, an evaluation harness, and a performance benchmark.

## What Already Exists (No Action Needed)

- **ADRs**: `docs/plans/` already has 25 numbered plan documents with problem/approach/tradeoffs. Just need to be surfaced in README.
- **Security**: `.env.example` exists, decisions documented, Docker uses separate DBs.
- **Queue processing**: LangGraph `Send()` fan-out already handles parallel contract processing. Adding BullMQ/Redis would add unnecessary complexity.

## Tier 1: Most Important

### 1. Architecture Diagram in README
Add a Mermaid diagram to `README.md` showing the system flow: User > Next.js UI > API Layer > LangGraph Agent > Contract Processing Pipeline > PostgreSQL. Include Docker architecture (5 containers).

**Files**: `README.md`

### 2. Surface `docs/plans/` as Architecture Decisions in README
Add a section in README pointing to `docs/plans/` and explaining the numbered plan convention.

**Files**: `README.md`

### 3. Fix CI Branch Name
CI workflow triggers on `main` but the default branch is `master`. Update to match.

**Files**: `.github/workflows/ci.yml`

## Tier 2: Easy Wins

### 4. Development Approach Note
Add a short section in README noting AI-assisted development was used for scaffolding and boilerplate.

**Files**: `README.md`

### 5. Agent Observability / Structured Tracing
Add structured logging to the agent: request IDs, contract IDs, analysis timing, risk scores, decisions. JSON-formatted output.

**Files**: new `apps/agent/src/tracing.py`, `apps/agent/src/report_graph.py`, `apps/agent/src/contracts.py`

## Tier 3: Nice to Have

### 6. Evaluation Harness
Create `evaluation/` folder with a small dataset (8 contract snippets with expected classifications) and `run_eval.py` that runs the agent and compares outputs.

**Files**: new `evaluation/dataset.json`, new `evaluation/run_eval.py`

### 7. Performance Benchmark Script
Add `scripts/benchmark.py` that processes N contracts and reports latency stats (avg, median, p95, p99). Reuses evaluation dataset.

**Files**: new `scripts/benchmark.py`

## Skip

- **Queue processing**: Already handled by LangGraph `Send()` fan-out.

## Implementation Order

1. Architecture diagram in README
2. Surface plans as ADRs in README
3. Fix CI branch name
4. Development approach note
5. Agent observability/tracing
6. Evaluation harness
7. Benchmark script

## Verification

- README renders correctly on GitHub with Mermaid diagram
- CI triggers on correct branch (`master`)
- Agent tracing: `pnpm dev:agent` shows structured logs
- Evaluation: `cd apps/agent && uv run python ../../evaluation/run_eval.py` produces accuracy metrics
- Benchmark: `cd apps/agent && uv run python ../../scripts/benchmark.py` reports latency stats
- All existing tests pass: `pnpm test` and `cd apps/agent && uv run pytest`
