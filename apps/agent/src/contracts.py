import json
import os

import httpx
from langchain.tools import ToolRuntime, tool
from langchain.messages import ToolMessage
from langchain_openai import ChatOpenAI
from langgraph.types import Command

from src.prompts import REPORT_UPDATE_PROMPT
from src.report_graph import build_report_graph, _parse_report_metadata, _extract_report_body, analyze_account, _fetch_historical_deals
from src.opportunities_graph import build_opportunities_graph
from src.types import AgentState, Report, AccountReport
from src.transforms import _raw_json_to_summary

API_BASE = os.getenv("NEXT_PUBLIC_API_URL", "http://localhost:3000")
MODEL_NAME = os.getenv("REPORT_MODEL", "gpt-5-mini")


@tool
def select_accounts(account_ids: list[str], runtime: ToolRuntime) -> Command:
    """
    Select accounts by their IDs to mark them as selected in the accounts table.
    Call this with the account IDs you want to recommend as opportunities.
    Each selected account gets a 'pending' status until a report is generated.
    After selecting, tell the user to review the selection and click
    'Generate reports for selected' when they are ready.
    """
    if not account_ids:
        return Command(update={
            "messages": [
                ToolMessage(
                    content="No account IDs provided.",
                    tool_call_id=runtime.tool_call_id
                )
            ]
        })

    existing = runtime.state.get("account_reports", [])
    existing_ids = {ar["id"] for ar in existing}

    new_entries = [
        AccountReport(id=aid, status="pending", report=None)
        for aid in account_ids
        if aid not in existing_ids
    ]

    return Command(update={
        "account_reports": existing + new_entries,
        "messages": [
            ToolMessage(
                content=f"Selected {len(new_entries)} new accounts: {', '.join(a['id'] for a in new_entries)}",
                tool_call_id=runtime.tool_call_id
            )
        ]
    })


@tool
def get_account_reports(runtime: ToolRuntime):
    """
    Get the current account reports from state.
    """
    return runtime.state.get("account_reports", [])


@tool
async def generate_reports(account_ids: list[str], runtime: ToolRuntime) -> Command:
    """
    Generate LLM-powered reports for the given account IDs in parallel.
    This fetches account data, analyzes with LLM, and saves reports to the database.
    Use this when the user asks to generate reports for selected accounts.
    After generation, summarize results conversationally, do NOT open any modal.
    """
    if not account_ids:
        return Command(update={
            "messages": [
                ToolMessage(
                    content="No account IDs provided.",
                    tool_call_id=runtime.tool_call_id
                )
            ]
        })

    report_graph = build_report_graph()
    final_state = await report_graph.ainvoke({
        "account_ids": account_ids,
        "results": [],
        "errors": [],
    })

    results = final_state.get("results", [])
    errors = final_state.get("errors", [])

    existing = runtime.state.get("account_reports", [])
    existing_map = {ar["id"]: ar for ar in existing}

    summary_lines = []
    for r in results:
        aid = r["account_id"]
        report = r.get("report", {})
        prop_type = report.get("proposition_type", "unknown")
        success = report.get("success_percent", "?")
        intervene = report.get("intervene", False)
        intervene_str = ", intervention needed" if intervene else ""
        summary_lines.append(f"- **{aid}**, {prop_type}, {success}% success{intervene_str}")
        existing_map[aid] = AccountReport(id=aid, status="generated", report=None)

    for err in errors:
        summary_lines.append(f"- {err}")

    updated_reports = list(existing_map.values())

    n_success = len(results)
    n_intervene = sum(1 for r in results if r.get("report", {}).get("intervene", False))
    header = f"Generated reports for {n_success} account(s):\n\n"
    footer = ""
    if n_intervene > 0:
        footer = f"\n\n{n_intervene} account(s) need immediate attention. Want me to walk you through the recommendations?"
    elif n_success > 0:
        footer = "\n\nAll accounts look stable. Want to review any of these in detail?"

    summary = header + "\n".join(summary_lines) + footer

    update: dict = {
        "account_reports": updated_reports,
        "messages": [
            ToolMessage(
                content=summary,
                tool_call_id=runtime.tool_call_id,
            )
        ],
    }

    # Auto-open modal for single report generation
    if len(account_ids) == 1 and len(results) == 1:
        update["focused_account_id"] = account_ids[0]

    return Command(update=update)


@tool
async def get_report_content(account_id: str, runtime: ToolRuntime) -> str:
    """
    Fetch the latest report content for an account from the API.
    Use this before modifying a report to ensure you have the latest version
    (including any manual edits the user may have made in the editor).
    """
    if not account_id:
        return "Error: account_id is required"

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{API_BASE}/api/account_reports/{account_id}",
            timeout=30,
        )
        if resp.status_code != 200:
            return f"No report found for account {account_id}"
        report = resp.json()
        return json.dumps(report)


@tool
async def update_report(account_id: str, changes: str, runtime: ToolRuntime) -> Command:
    """
    Update an existing report based on user-requested changes.
    Fetches the current report, applies changes via LLM, and saves the updated version.
    Use when the user asks to modify a report (e.g. "increase success estimate", "expand pitch strategy").
    The frontend will open the report modal when focused_account_id is set.
    Args:
        account_id: The account ID whose report to update
        changes: Description of what changes to make
    """
    if not account_id:
        return Command(update={
            "messages": [
                ToolMessage(
                    content="Error: account_id is required",
                    tool_call_id=runtime.tool_call_id,
                )
            ]
        })

    # Fetch current report
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{API_BASE}/api/account_reports/{account_id}",
            timeout=30,
        )
        if resp.status_code != 200:
            return Command(update={
                "messages": [
                    ToolMessage(
                        content=f"No report found for account {account_id}",
                        tool_call_id=runtime.tool_call_id,
                    )
                ]
            })
        current_report = resp.json()

    # Use LLM to apply changes
    prompt = REPORT_UPDATE_PROMPT.format(
        current_content=current_report.get("content", ""),
        user_changes=changes,
    )
    model = ChatOpenAI(model=MODEL_NAME)
    response = await model.ainvoke(prompt)
    llm_text = response.content

    # Parse metadata from last line
    metadata = _parse_report_metadata(llm_text)
    report_body_md = _extract_report_body(llm_text)

    # Update via API (raw markdown)
    report_id = current_report["id"]
    async with httpx.AsyncClient() as client:
        resp = await client.put(
            f"{API_BASE}/api/account_reports/{report_id}",
            json={
                "content": report_body_md,
                "proposition_type": metadata["proposition_type"],
                "strategic_bucket": metadata.get("strategic_bucket", "Healthy Growth"),
                "success_percent": metadata["success_percent"],
                "intervene": metadata["intervene"],
                "priority_score": metadata.get("priority_score", 5),
                "score_rationale": metadata.get("score_rationale", ""),
            },
            timeout=30,
        )
        if resp.status_code != 200:
            return Command(update={
                "messages": [
                    ToolMessage(
                        content=f"Failed to update report for {account_id}",
                        tool_call_id=runtime.tool_call_id,
                    )
                ]
            })

    return Command(update={
        "focused_account_id": account_id,
        "report_manually_edited": False,
        "messages": [
            ToolMessage(
                content=f"Report for {account_id} has been updated. I've opened it so you can review the changes. Looks good? Should I apply similar changes to the other reports?",
                tool_call_id=runtime.tool_call_id,
            )
        ],
    })


@tool
async def find_opportunities(account_ids: list[str], runtime: ToolRuntime) -> Command:
    """
    Analyze unselected accounts to find the best opportunities for upsell,
    renegotiation, or churn risk. Fetches data, runs LLM analysis, and
    pre-selects the top candidates.
    The frontend calls this with the IDs of unselected accounts.
    Do NOT ask for confirmation before calling this tool.
    """
    if not account_ids:
        return Command(update={
            "messages": [
                ToolMessage(
                    content="No account IDs provided for opportunity analysis.",
                    tool_call_id=runtime.tool_call_id,
                )
            ]
        })

    graph = build_opportunities_graph()
    result = await graph.ainvoke({
        "account_ids": account_ids,
        "analysis": "",
        "recommended_ids": [],
    })

    analysis = result.get("analysis", "No analysis produced.")
    recommended_ids = result.get("recommended_ids", [])

    # Replace selection with only the recommended accounts
    new_entries = [
        AccountReport(id=aid, status="pending", report=None)
        for aid in recommended_ids
    ]

    n_selected = len(new_entries)
    footer = ""
    if n_selected > 0:
        ids_str = ", ".join(a["id"] for a in new_entries)
        footer = f"\n\nI've pre-selected {n_selected} accounts: {ids_str}. Review the selection, adjust if needed, then click **Generate reports for selected** when you're ready."

    return Command(update={
        "account_reports": new_entries,
        "messages": [
            ToolMessage(
                content=analysis + footer,
                tool_call_id=runtime.tool_call_id,
            )
        ],
    })


@tool
async def analyze_raw_data(account_data: str, runtime: ToolRuntime) -> Command:
    """
    Generate a report from raw account data (no DB lookup).
    Used for the landing page demo where users paste arbitrary data.
    Accepts EITHER a JSON string with account/contract/usage fields,
    OR free-form text (e.g. bullet-point client dataset).
    Pass the user's data as-is, do not restructure or summarize it.
    """
    if not account_data or not account_data.strip():
        return Command(update={
            "messages": [
                ToolMessage(
                    content="No account data provided.",
                    tool_call_id=runtime.tool_call_id,
                )
            ]
        })

    # Try JSON first; fall back to raw text
    try:
        data = json.loads(account_data)
        summary = _raw_json_to_summary(data)
        account_name = data.get("account", "Demo Account")
    except (json.JSONDecodeError, ValueError):
        # Free text, pass directly to LLM prompt (it handles any format)
        summary = {
            "id": "DEMO",
            "name": "Demo Account",
            "raw_data": account_data,
        }
        account_name = "Demo Account"

    all_deals = await _fetch_historical_deals()
    result = await analyze_account(summary, all_deals)

    return Command(update={
        "demo_report": result,
        "messages": [
            ToolMessage(
                content=f"Report generated for {account_name}! The report is now displayed.",
                tool_call_id=runtime.tool_call_id,
            )
        ],
    })


contracts_tools = [
    select_accounts,
    find_opportunities,
    get_account_reports,
    generate_reports,
    get_report_content,
    update_report,
    analyze_raw_data,
]
