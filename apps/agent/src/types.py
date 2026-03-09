from langchain.agents import AgentState as BaseAgentState
from typing import TypedDict, Literal

from pydantic import BaseModel, Field


# --- Pydantic models for validated LLM output ---

PROPOSITION_TYPES = Literal[
    "requires negotiation",
    "upsell proposition",
    "poor usage",
    "at capacity",
    "healthy",
]

STRATEGIC_BUCKETS = Literal[
    "Adoption Recovery",
    "Upsell Opportunity",
    "Underpriced Account",
    "Overprovisioned Contract",
    "Churn Risk",
    "Healthy Growth",
]


class ReportMetadata(BaseModel):
    """Validated metadata extracted from LLM report output."""
    proposition_type: PROPOSITION_TYPES = "healthy"
    strategic_bucket: STRATEGIC_BUCKETS = "Healthy Growth"
    success_percent: int = Field(default=50, ge=0, le=100)
    intervene: bool = False
    priority_score: int = Field(default=5, ge=1, le=10)
    score_rationale: str = ""


class ReportEvaluation(BaseModel):
    """LLM-scored evaluation of a generated report against a quality rubric."""
    sections_complete: bool = Field(
        description="All 9 required sections are present and non-empty"
    )
    metrics_accurate: bool = Field(
        description="Input metric values (current_value, limit_value) appear correctly in the report"
    )
    classification_justified: bool = Field(
        description="The proposition_type classification is consistent with the data signals described"
    )
    evidence_grounded: bool = Field(
        description="Historical deals referenced in the report exist in the input data"
    )
    overall_quality: Literal["pass", "marginal", "fail"] = Field(
        description="Overall report quality: pass (good), marginal (acceptable with issues), fail (needs rewrite)"
    )
    issues: list[str] = Field(
        default_factory=list,
        description="Specific problems found in the report"
    )


class OpportunitiesResult(BaseModel):
    """Validated result from opportunities analysis."""
    recommended_ids: list[str] = Field(default_factory=list)


# --- TypedDict models for state ---

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
