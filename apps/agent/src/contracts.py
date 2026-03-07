from langchain.agents import AgentState as BaseAgentState
from langchain.tools import ToolRuntime, tool
from langchain.messages import ToolMessage
from langgraph.types import Command
from typing import TypedDict, Literal


class Report(TypedDict):
    proposition_type: str
    success_percent: int
    intervene: bool
    content: str


class AccountReport(TypedDict):
    id: str
    status: Literal["pending", "generated"]
    report: Report | None


class AgentState(BaseAgentState):
    account_reports: list[AccountReport]
    focused_account_id: str | None


@tool
def select_accounts(account_ids: list[str], runtime: ToolRuntime) -> Command:
    """
    Select accounts by their IDs to move them to the Selected Accounts table for review.
    Call this with the account IDs you want to recommend as opportunities.
    Each selected account gets a 'pending' status until a report is generated.
    """
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


contracts_tools = [
    select_accounts,
    get_account_reports,
]
