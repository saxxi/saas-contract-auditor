# Plan 027: Clarity and Positioning Improvements

## Problem

An external reviewer misunderstood the project as a **legal contract clause parser** (extracting pricing terms, billing structures from document text) and suggested building rule engines, clause extractors, and revenue simulators. The project is actually a **usage-vs-contract revenue intelligence tool** that compares real account usage data against contractual limits to surface upsell, churn, and renegotiation opportunities.

The fact that a reviewer arrived at this conclusion means:
1. The project's self-description has gaps that allow misinterpretation
2. `docs/lessons_learned/how_this_project_works.md` is completely outdated (still describes the original todo list template from before the contracts auditor was built)
3. The name "contract_auditor" could be confused with blockchain smart contract security tooling
4. The README, while solid, doesn't make the "usage data vs contract limits" angle prominent enough in the first few seconds of reading

## What the Reviewer Got Wrong (No Action Needed)

These suggestions from the review describe a different product and should be ignored:
- **Rule engine for economic analysis**: The project uses LLM analysis, not pattern-matching rules
- **Clause extractors / pricing parsers**: The project doesn't parse legal documents; it analyzes structured account data (usage metrics, billing info)
- **Revenue simulation**: Out of scope; the project identifies opportunities, not forecasts
- **Reorganize into parsers/models/rules/simulations**: Doesn't match the actual architecture
- **Structured contract models (ContractModel)**: Account data is already flexible via `account_usage_metrics` table (key-value pairs)
- **Example legal contracts**: The input is account data, not contract documents

## What the Reviewer Got Right (Action Needed)

1. **Positioning could be sharper**: A reader should understand within 5 seconds that this tool compares usage data against contract limits
2. **`how_this_project_works.md` is stale**: Describes todo list, not contracts auditor
3. **Name ambiguity**: "contract_auditor" can be misread as blockchain/smart contract tooling
4. **Core capabilities not listed explicitly**: README says what the tool does but doesn't enumerate the analysis types (upsell detection, churn risk, renegotiation signals)

## Tier 1: Critical

### 1. Rewrite `how_this_project_works.md`
Replace the outdated todo list documentation with accurate description of the contracts auditor:
- What the system actually does (usage vs contract analysis)
- Data flow: account data > LLM analysis > classified report
- Key components: report_graph.py (Send fan-out), contracts.py (tools), opportunities_graph.py
- State management pattern (CopilotKit v2 agent state)
- How reports are generated, stored, and edited

**Files**: `docs/lessons_learned/how_this_project_works.md`

### 2. Sharpen README opening
Make the first paragraph unambiguous:
- Lead with "compares contract limits against actual usage data"
- Explicitly say this is NOT about parsing legal document text or blockchain contracts
- Add a "How It Works" section with a concrete 3-step flow: paste account data > AI analyzes usage vs limits > get classified report

**Files**: `README.md`

## Tier 2: Important

### 3. Add explicit capability list to README
After "What It Does", add a short section listing the analysis types the AI performs:
- Upsell detection (usage approaching or exceeding limits)
- Churn risk (declining usage, poor adoption)
- Renegotiation signals (overages, mismatched billing terms)
- Account health classification (upsell proposition, requires negotiation, poor usage, at capacity, healthy)
- Success probability scoring and intervention flags

**Files**: `README.md`

### 4. Add "What This Is NOT" to README or AGENTS.md
One-liner clarifying: this is not a legal document parser, not a blockchain smart contract auditor, not a rule engine. It uses LLM analysis on structured account data.

**Files**: `README.md`

## Tier 3: Nice to Have

### 5. Repository renamed to `saas-contract-auditor`
**DONE.** Renamed from `contracts_auditor` to `saas-contract-auditor`. Updated all GitHub URLs, Docker DB names, .env.example, LICENSE-COMMERCIAL, HTML pages, and git remote.

### 6. Add sample input/output to README
Show a concrete example of input data (account JSON with usage metrics) and the resulting classification + report snippet. This immediately clarifies what "contract auditing" means in this context.

**Files**: `README.md`

## Skip

- **Rule engine, clause parsers, revenue simulation**: Different product
- **Repository restructure into parsers/models/rules**: Current structure (apps/app + apps/agent) is correct for the actual architecture
- **Evaluation benchmarks for clause extraction accuracy**: Not applicable; the system classifies accounts, not extracts clauses
- **Example legal contracts**: Input is account data, not documents

## Implementation Order

1. Rewrite `how_this_project_works.md` (most critical; currently describes wrong project)
2. Sharpen README opening paragraph
3. Add capability list to README
4. Add "What This Is NOT" clarification
5. (Optional) Add sample input/output
6. (Optional) Evaluate repository name change

## Verification

- Read `how_this_project_works.md` and confirm it accurately describes the contracts auditor
- Read README top section and confirm a new reader would understand "usage vs contract limits" within 5 seconds
- Confirm no mentions of todo lists, blockchain, or clause parsing remain in docs
- All existing tests still pass
