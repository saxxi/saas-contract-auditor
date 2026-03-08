"""
LangGraph pipeline for finding account opportunities.
Fetches summaries for unselected accounts, analyzes with LLM,
and returns a discussion + recommended account IDs.
"""

import json
import os
from typing import TypedDict

import httpx
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, START, END

API_BASE = os.getenv("NEXT_PUBLIC_API_URL", "http://localhost:3000")
MODEL_NAME = os.getenv("OPPORTUNITIES_MODEL", "gpt-5-mini")

OPPORTUNITIES_PROMPT = """You are a senior strategy consultant helping a SaaS account team identify the best opportunities.

## Account Data
{account_data}

## Instructions

Analyze all accounts and identify the top opportunities across three categories:
1. **Upsell**: near capacity (>85% utilization), strong growth signals, payment current
2. **Renegotiation**: over limits, overdue payments, contract issues
3. **Churn risk**: low utilization (<30%), disengagement signals

## Output Format

Write a concise analysis in two parts:

### ANALYSIS
For each account worth flagging, write one short paragraph:
- Lead with the account name and ID in bold
- State the key numbers that make it stand out
- Classify it (upsell / renegotiation / churn risk)
- One sentence on recommended action

Skip accounts that look healthy with no immediate action needed.

### SELECTED
On the very last line, output a JSON array of the account IDs you recommend selecting (the strongest opportunities only):
["AC-1", "AC-5", ...]

## Writing style
- No em dashes. Use commas, periods, or semicolons.
- No emojis.
- Numbers first. "$4,200 MRR" not "an MRR of $4,200".
- Short, direct sentences. No filler.
"""


class OpportunitiesState(TypedDict):
    account_ids: list[str]
    analysis: str
    recommended_ids: list[str]


async def fetch_and_analyze(state: OpportunitiesState) -> dict:
    """Fetch account summaries and analyze with LLM."""
    account_ids = state["account_ids"]

    # Fetch summaries
    ids_param = ",".join(account_ids)
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{API_BASE}/api/account_summaries",
            params={"account_ids": ids_param},
            timeout=30,
        )
        summaries = resp.json() if resp.status_code == 200 else []

    # Fetch account names
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{API_BASE}/api/accounts", timeout=30)
        all_accounts = resp.json() if resp.status_code == 200 else []
    names = {a["id"]: a["name"] for a in all_accounts}

    # Build compact data for LLM
    account_data = []
    for s in summaries:
        aid = s.get("id", "")
        if aid not in account_ids:
            continue
        # Build usage summary from flexible metrics
        usage = {}
        for m in s.get("usage_metrics", []):
            name = m.get("metric_name", "unknown")
            usage[name] = f"{m.get('current_value', 0)}/{m.get('limit_value', 0)}"

        entry = {
            "id": aid,
            "name": names.get(aid, aid),
            "tier": s.get("budget_report", {}).get("tier", ""),
            "mrr": s.get("budget_report", {}).get("mrr", 0),
            "renewal_in_days": s.get("budget_report", {}).get("renewal_in_days", 0),
            "payment_status": s.get("budget_report", {}).get("payment_status", ""),
            **usage,
        }
        if s.get("context"):
            entry["context"] = s["context"]
        account_data.append(entry)

    prompt = OPPORTUNITIES_PROMPT.format(
        account_data=json.dumps(account_data, separators=(",", ":")),
    )
    model = ChatOpenAI(model=MODEL_NAME)
    response = await model.ainvoke(prompt)
    llm_text = response.content

    # Parse recommended IDs from last line
    recommended_ids = []
    lines = llm_text.strip().split("\n")
    for line in reversed(lines):
        line = line.strip()
        if line.startswith("[") and line.endswith("]"):
            try:
                recommended_ids = json.loads(line)
                break
            except json.JSONDecodeError:
                continue

    # Extract analysis (everything except the JSON line)
    analysis_lines = []
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("[") and stripped.endswith("]"):
            try:
                json.loads(stripped)
                continue
            except json.JSONDecodeError:
                pass
        analysis_lines.append(line)
    analysis = "\n".join(analysis_lines).strip()

    return {
        "analysis": analysis,
        "recommended_ids": recommended_ids,
    }


def build_opportunities_graph():
    """Build and compile the opportunities analysis StateGraph."""
    graph = StateGraph(OpportunitiesState)
    graph.add_node("fetch_and_analyze", fetch_and_analyze)
    graph.add_edge(START, "fetch_and_analyze")
    graph.add_edge("fetch_and_analyze", END)
    return graph.compile()
