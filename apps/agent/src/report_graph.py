"""
LangGraph report generation pipeline.
Uses Send() fan-out to process accounts in parallel:
  fan_out → [process_account per ID] → collect_results → finalize
"""

import json
import operator
import os
from typing import Annotated, TypedDict

import httpx
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, START, END
from langgraph.types import Send

from src.cache import cache_get, cache_set
from src.prompts import REPORT_ANALYZER_PROMPT, SALES_SCRIPT_PROMPT

API_BASE = os.getenv("NEXT_PUBLIC_API_URL", "http://localhost:3000")
MODEL_NAME = os.getenv("REPORT_MODEL", "gpt-5-mini")


# --- State schemas ---

class ReportResult(TypedDict):
    account_id: str
    report: dict
    error: str | None


class ReportGraphState(TypedDict):
    account_ids: list[str]
    results: Annotated[list[dict], operator.add]
    errors: Annotated[list[str], operator.add]


class ProcessAccountState(TypedDict):
    account_id: str
    account_summary: dict | None
    historical_deals: list[dict]
    report_html: str | None
    report_metadata: dict | None
    saved_report: dict | None


# --- Helper functions ---

async def _fetch_account_summary(account_id: str) -> dict | None:
    cache_key = f"{account_id}_summary"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{API_BASE}/api/account_summaries",
            params={"account_ids": account_id},
            timeout=30,
        )
        if resp.status_code != 200:
            return None
        data = resp.json()
        if not data:
            return None
        summary = data[0]
        await cache_set(cache_key, summary)
        return summary


async def _fetch_historical_deals() -> list[dict]:
    cache_key = "historical_deals_all"
    cached = await cache_get(cache_key)
    if cached:
        return cached

    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{API_BASE}/api/historical_deals", timeout=30)
        if resp.status_code != 200:
            return []
        deals = resp.json()
        await cache_set(cache_key, deals)
        return deals


def _filter_relevant_deals(deals: list[dict], summary: dict) -> list[dict]:
    """Filter top 5-8 relevant historical deals based on account characteristics."""
    tier = summary.get("budget_report", {}).get("tier", "")

    scored = []
    for deal in deals:
        score = 0
        if deal.get("original_tier", "").lower() == tier.lower():
            score += 3
        if deal.get("outcome", "").lower() in ("won", "closed-won", "success"):
            score += 2
        mrr = summary.get("budget_report", {}).get("mrr", 0)
        deal_size = deal.get("deal_size_usd", 0)
        if deal_size and mrr:
            ratio = deal_size / (mrr * 12) if mrr > 0 else 0
            if 0.5 <= ratio <= 3.0:
                score += 1
        scored.append((score, deal))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [deal for _, deal in scored[:8]]


def _parse_report_metadata(text: str) -> dict:
    """Extract JSON metadata from the last line of LLM output."""
    lines = text.strip().split("\n")
    for line in reversed(lines):
        line = line.strip()
        if line.startswith("{") and line.endswith("}"):
            try:
                meta = json.loads(line)
                return {
                    "proposition_type": meta.get("proposition_type", "healthy"),
                    "strategic_bucket": meta.get("strategic_bucket", "Healthy Growth"),
                    "success_percent": int(meta.get("success_percent", 50)),
                    "intervene": bool(meta.get("intervene", False)),
                    "priority_score": int(meta.get("priority_score", 5)),
                    "score_rationale": str(meta.get("score_rationale", "")),
                }
            except (json.JSONDecodeError, ValueError):
                continue
    return {"proposition_type": "healthy", "strategic_bucket": "Healthy Growth", "success_percent": 50, "intervene": False, "priority_score": 5, "score_rationale": ""}


def _extract_report_body(text: str) -> str:
    """Remove the JSON metadata line from the report body."""
    lines = text.strip().split("\n")
    for i in range(len(lines) - 1, -1, -1):
        line = lines[i].strip()
        if line.startswith("{") and line.endswith("}"):
            try:
                json.loads(line)
                lines.pop(i)
                break
            except json.JSONDecodeError:
                continue
    return "\n".join(lines).strip()


async def _save_report(account_id: str, html_content: str, metadata: dict) -> dict | None:
    """Save report via POST to Next.js API."""
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{API_BASE}/api/accounts/{account_id}/account_reports",
            json={
                "content": html_content,
                "proposition_type": metadata["proposition_type"],
                "strategic_bucket": metadata.get("strategic_bucket", "Healthy Growth"),
                "success_percent": metadata["success_percent"],
                "intervene": metadata["intervene"],
                "priority_score": metadata.get("priority_score", 5),
                "score_rationale": metadata.get("score_rationale", ""),
            },
            timeout=30,
        )
        if resp.status_code in (200, 201):
            return resp.json()
        return None


# --- Graph nodes ---

def fan_out(state: ReportGraphState) -> list[Send]:
    """Emit one Send per account ID for parallel processing."""
    return [
        Send("process_account", {"account_id": aid})
        for aid in state["account_ids"]
    ]


async def analyze_account(summary: dict, deals: list[dict]) -> dict:
    """
    Pure analysis: takes account summary + historical deals, returns report.
    Doesn't know or care where the data came from.
    Returns: { content: str, proposition_type: str, success_percent: int, intervene: bool }
    """
    # If raw_data is present, pass text directly to prompt; otherwise use structured JSON
    is_raw = "raw_data" in summary
    account_data_str = summary["raw_data"] if is_raw else json.dumps(summary, indent=2)

    relevant_deals = deals[:5] if is_raw else _filter_relevant_deals(deals, summary)

    # Pass 1: analytical report
    prompt = REPORT_ANALYZER_PROMPT.format(
        account_data=account_data_str,
        historical_deals=json.dumps(relevant_deals, indent=2),
    )
    model = ChatOpenAI(model=MODEL_NAME)
    response = await model.ainvoke(prompt)
    llm_text = response.content

    metadata = _parse_report_metadata(llm_text)
    report_body_md = _extract_report_body(llm_text)

    # Pass 2: sales script
    script_prompt = SALES_SCRIPT_PROMPT.format(
        report_content=report_body_md,
        account_data=account_data_str,
        proposition_type=metadata["proposition_type"],
    )
    script_response = await model.ainvoke(script_prompt)
    report_body_md = report_body_md + "\n\n---\n\n" + script_response.content.strip()

    return {
        "content": report_body_md,
        **metadata,
    }


async def process_account(state: ProcessAccountState) -> dict:
    """
    Process a single account: fetch data, analyze with LLM, save report.
    Returns dict merged into parent state via reducers.
    """
    account_id = state["account_id"]

    # 1. Fetch account summary
    summary = await _fetch_account_summary(account_id)
    if not summary:
        return {
            "results": [],
            "errors": [f"Could not fetch data for account {account_id}"],
        }

    # 2. Fetch historical deals
    all_deals = await _fetch_historical_deals()

    # 3. Run pure analysis
    result = await analyze_account(summary, all_deals)

    # 4. Save via API (raw markdown)
    saved = await _save_report(account_id, result["content"], {
        "proposition_type": result["proposition_type"],
        "success_percent": result["success_percent"],
        "intervene": result["intervene"],
    })
    if not saved:
        return {
            "results": [],
            "errors": [f"Failed to save report for account {account_id}"],
        }

    return {
        "results": [{"account_id": account_id, "report": saved}],
        "errors": [],
    }


def collect_results(state: ReportGraphState) -> dict:
    """No-op: results already merged via reducer."""
    return {}


def finalize(state: ReportGraphState) -> dict:
    """No-op: graph returns final state."""
    return {}


# --- Build graph ---

def build_report_graph():
    """Build and compile the report generation StateGraph."""
    graph = StateGraph(ReportGraphState)

    graph.add_node("process_account", process_account)
    graph.add_node("collect_results", collect_results)
    graph.add_node("finalize", finalize)

    graph.add_conditional_edges(START, fan_out, ["process_account"])
    graph.add_edge("process_account", "collect_results")
    graph.add_edge("collect_results", "finalize")
    graph.add_edge("finalize", END)

    return graph.compile()
