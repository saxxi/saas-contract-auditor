from langchain.agents import AgentState as BaseAgentState
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
    report_manually_edited: bool
    report_latest_content: str | None
    demo_report: Report | None
