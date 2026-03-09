"""
LangGraph report generation pipeline.
Uses Send() fan-out to process accounts in parallel:
  fan_out → [process_account per ID] → collect_results → finalize

Each process_account fork runs:
  analyze (LLM) → evaluate (LLM rubric) → [re-analyze if fail] → sales script → save
"""

import json
import operator
import os
from typing import Annotated, TypedDict

from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, START, END
from langgraph.types import Send

from src.cache import cache_get, cache_set
from src.prompts import REPORT_ANALYZER_PROMPT, SALES_SCRIPT_PROMPT, REPORT_EVALUATOR_PROMPT
from src.resilience import get_http_client, invoke_with_retry
from src.tracing import (
    new_request_id, log_event, trace_operation,
    get_langfuse_config, log_evaluation_score,
)
from src.types import ReportMetadata, ReportEvaluation

API_BASE = os.getenv("NEXT_PUBLIC_API_URL", "http://localhost:3000")
MODEL_NAME = os.getenv("REPORT_MODEL", "gpt-5-mini")

REQUIRED_SECTIONS = [
    "### Executive Summary",
    "### Situation",
    "### Complication",
    "### Resolution",
    "### Key Metrics",
    "### Evidence from Similar Engagements",
    "### Risks and Mitigants",
    "### Next Steps",
    "### Key Question",
]


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

    client = get_http_client()
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

    client = get_http_client()
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


def _parse_report_metadata(text: str, request_id: str = "") -> ReportMetadata:
    """Extract and validate JSON metadata from the last line of LLM output."""
    lines = text.strip().split("\n")
    for line in reversed(lines):
        line = line.strip()
        if line.startswith("{") and line.endswith("}"):
            try:
                meta = json.loads(line)
                return ReportMetadata(**meta)
            except (json.JSONDecodeError, ValueError):
                continue

    # No valid metadata found; return defaults and log warning
    if request_id:
        log_event("metadata_parse_failed", request_id,
                  reason="no valid JSON metadata line found in LLM output")
    return ReportMetadata()


async def _parse_metadata_with_fallback(
    text: str, model, request_id: str = "", config: dict | None = None
) -> ReportMetadata:
    """Parse metadata from text, falling back to structured output on failure."""
    metadata = _parse_report_metadata(text, request_id)

    # If we got defaults (no JSON found or parse failed), try structured output fallback
    if metadata.proposition_type == "healthy" and metadata.success_percent == 50 and metadata.score_rationale == "":
        # Check if there's actually JSON that was parsed (vs. true defaults)
        has_json = any(
            line.strip().startswith("{") and line.strip().endswith("}")
            for line in text.strip().split("\n")
        )
        if not has_json:
            log_event("metadata_fallback_triggered", request_id)
            try:
                structured_model = model.with_structured_output(ReportMetadata)
                fallback_prompt = (
                    "Extract the metadata from this report. Return the classification, "
                    "success percentage, whether intervention is needed, priority score, "
                    "and rationale.\n\n"
                    f"{text[:3000]}"
                )
                metadata = await invoke_with_retry(
                    structured_model, fallback_prompt,
                    request_id=request_id, config=config,
                )
            except Exception as exc:
                log_event("metadata_fallback_error", request_id, error=str(exc))
                # Keep the defaults

    return metadata


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


def _validate_report_sections(text: str) -> list[str]:
    """Return list of required section headers missing from the report."""
    return [section for section in REQUIRED_SECTIONS if section not in text]


async def _save_report(account_id: str, html_content: str, metadata: dict) -> dict | None:
    """Save report via POST to Next.js API."""
    client = get_http_client()
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


# --- Evaluator ---

async def evaluate_report(
    report_text: str,
    metadata: ReportMetadata,
    summary: dict,
    deals: list[dict],
    request_id: str = "",
    config: dict | None = None,
) -> ReportEvaluation:
    """Score a generated report against a quality rubric using an LLM call."""
    model = ChatOpenAI(model=MODEL_NAME)
    structured_model = model.with_structured_output(ReportEvaluation)

    is_raw = "raw_data" in summary
    account_data_str = summary.get("raw_data", "") if is_raw else json.dumps(summary, indent=2)
    deals_str = json.dumps(deals[:8], indent=2) if deals else "[]"

    prompt = REPORT_EVALUATOR_PROMPT.format(
        account_data=account_data_str,
        historical_deals=deals_str,
        report_text=report_text,
        report_metadata=json.dumps(metadata.model_dump(), indent=2),
    )

    with trace_operation("llm_evaluate", request_id, account_id=summary.get("id", "unknown")):
        evaluation = await invoke_with_retry(
            structured_model, prompt,
            request_id=request_id, config=config,
        )

    log_event("report_evaluation", request_id,
              account_id=summary.get("id", "unknown"),
              quality=evaluation.overall_quality,
              sections_complete=evaluation.sections_complete,
              metrics_accurate=evaluation.metrics_accurate,
              classification_justified=evaluation.classification_justified,
              evidence_grounded=evaluation.evidence_grounded,
              issues=evaluation.issues)

    # Log evaluation scores to Langfuse if available
    quality_score = {"pass": 1.0, "marginal": 0.5, "fail": 0.0}
    log_evaluation_score(
        request_id, "report_quality",
        quality_score.get(evaluation.overall_quality, 0.0),
        comment="; ".join(evaluation.issues) if evaluation.issues else "No issues",
    )
    log_evaluation_score(
        request_id, "metrics_accurate",
        1.0 if evaluation.metrics_accurate else 0.0,
    )
    log_evaluation_score(
        request_id, "classification_justified",
        1.0 if evaluation.classification_justified else 0.0,
    )

    return evaluation


# --- Graph nodes ---

def fan_out(state: ReportGraphState) -> list[Send]:
    """Emit one Send per account ID for parallel processing."""
    return [
        Send("process_account", {"account_id": aid})
        for aid in state["account_ids"]
    ]


async def analyze_account(
    summary: dict,
    deals: list[dict],
    request_id: str | None = None,
    feedback: str | None = None,
) -> dict:
    """
    Pure analysis: takes account summary + historical deals, returns report.
    Doesn't know or care where the data came from.
    Returns: { content: str, proposition_type: str, success_percent: int, intervene: bool }
    """
    rid = request_id or new_request_id()
    account_id = summary.get("id", "unknown")
    lf_config = get_langfuse_config()

    # If raw_data is present, pass text directly to prompt; otherwise use structured JSON
    is_raw = "raw_data" in summary
    account_data_str = summary["raw_data"] if is_raw else json.dumps(summary, indent=2)

    relevant_deals = deals[:5] if is_raw else _filter_relevant_deals(deals, summary)

    model = ChatOpenAI(model=MODEL_NAME)

    # Pass 1: analytical report
    with trace_operation("llm_report", rid, account_id=account_id) as ctx:
        prompt = REPORT_ANALYZER_PROMPT.format(
            account_data=account_data_str,
            historical_deals=json.dumps(relevant_deals, indent=2),
        )
        if feedback:
            prompt += (
                f"\n\n## Feedback from Quality Review\n"
                f"The previous version of this report was rejected. Fix these issues:\n"
                f"{feedback}\n\n"
                f"Generate the complete report again with these issues addressed."
            )
        response = await invoke_with_retry(model, prompt, request_id=rid, config=lf_config)
        llm_text = response.content

    metadata = await _parse_metadata_with_fallback(llm_text, model, request_id=rid, config=lf_config)
    report_body_md = _extract_report_body(llm_text)

    # Section validation: check for required headers and re-prompt if missing
    missing = _validate_report_sections(report_body_md)
    if missing:
        log_event("missing_report_sections", rid,
                  account_id=account_id, missing=missing)
        reprompt = (
            f"The report is missing these required sections: {', '.join(missing)}. "
            f"Add ONLY the missing sections to the following report. "
            f"Keep everything else unchanged.\n\n{report_body_md}"
        )
        with trace_operation("llm_section_fix", rid, account_id=account_id):
            fix_response = await invoke_with_retry(model, reprompt, request_id=rid, config=lf_config)
            report_body_md = _extract_report_body(fix_response.content)

    # Pass 2: sales script
    with trace_operation("llm_script", rid, account_id=account_id):
        script_prompt = SALES_SCRIPT_PROMPT.format(
            report_content=report_body_md,
            account_data=account_data_str,
            proposition_type=metadata.proposition_type,
        )
        script_response = await invoke_with_retry(model, script_prompt, request_id=rid, config=lf_config)
        report_body_md = report_body_md + "\n\n---\n\n" + script_response.content.strip()

    meta_dict = metadata.model_dump()
    log_event("analysis_result", rid,
              account_id=account_id,
              proposition_type=meta_dict["proposition_type"],
              success_percent=meta_dict["success_percent"],
              intervene=meta_dict["intervene"],
              priority_score=meta_dict["priority_score"])

    return {
        "content": report_body_md,
        **meta_dict,
    }


async def process_account(state: ProcessAccountState) -> dict:
    """
    Process a single account: fetch data, analyze with LLM, evaluate, save report.
    On evaluation failure, re-analyzes once with feedback before saving.
    Returns dict merged into parent state via reducers.
    """
    account_id = state["account_id"]
    rid = new_request_id()
    lf_config = get_langfuse_config()

    with trace_operation("report", rid, account_id=account_id) as ctx:
        # 1. Fetch account summary
        summary = await _fetch_account_summary(account_id)
        if not summary:
            return {
                "results": [],
                "errors": [f"Could not fetch data for account {account_id}"],
            }

        # 2. Fetch historical deals
        all_deals = await _fetch_historical_deals()
        is_raw = "raw_data" in summary
        relevant_deals = all_deals[:5] if is_raw else _filter_relevant_deals(all_deals, summary)

        # 3. Run analysis
        result = await analyze_account(summary, all_deals, request_id=rid)

        # 4. Evaluate report quality via LLM rubric (skip for raw/demo data)
        if not is_raw:
            metadata = ReportMetadata(**{
                k: result[k] for k in ReportMetadata.model_fields if k in result
            })
            evaluation = await evaluate_report(
                result["content"], metadata, summary, relevant_deals,
                request_id=rid, config=lf_config,
            )

            if evaluation.overall_quality == "fail":
                log_event("report_evaluation_fail", rid,
                          account_id=account_id,
                          issues=evaluation.issues)
                # Re-analyze with feedback (max 1 retry)
                feedback = "\n".join(f"- {issue}" for issue in evaluation.issues)
                result = await analyze_account(
                    summary, all_deals, request_id=rid, feedback=feedback,
                )

                # Re-evaluate the retry
                metadata = ReportMetadata(**{
                    k: result[k] for k in ReportMetadata.model_fields if k in result
                })
                retry_eval = await evaluate_report(
                    result["content"], metadata, summary, relevant_deals,
                    request_id=rid, config=lf_config,
                )
                if retry_eval.overall_quality == "fail":
                    log_event("report_evaluation_fail_after_retry", rid,
                              account_id=account_id,
                              issues=retry_eval.issues)
                    # Save anyway with warning

            elif evaluation.overall_quality == "marginal":
                log_event("report_evaluation_marginal", rid,
                          account_id=account_id,
                          issues=evaluation.issues)

        # 5. Save via API (raw markdown)
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

        ctx["proposition_type"] = result["proposition_type"]
        ctx["success_percent"] = result["success_percent"]

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
