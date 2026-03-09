"""Tests for the LLM-based report evaluator."""

import asyncio
from unittest.mock import AsyncMock, patch, MagicMock

import pytest

from src.report_graph import evaluate_report
from src.types import ReportMetadata, ReportEvaluation


@pytest.fixture
def good_evaluation():
    return ReportEvaluation(
        sections_complete=True,
        metrics_accurate=True,
        classification_justified=True,
        evidence_grounded=True,
        overall_quality="pass",
        issues=[],
    )


@pytest.fixture
def marginal_evaluation():
    return ReportEvaluation(
        sections_complete=True,
        metrics_accurate=False,
        classification_justified=True,
        evidence_grounded=True,
        overall_quality="marginal",
        issues=["Key Metrics table missing API call values"],
    )


@pytest.fixture
def bad_evaluation():
    return ReportEvaluation(
        sections_complete=False,
        metrics_accurate=False,
        classification_justified=False,
        evidence_grounded=False,
        overall_quality="fail",
        issues=[
            "Missing sections: Risks and Mitigants, Key Question",
            "Report shows 180/200 seats but input has 150/200",
            "Classified as upsell but utilization is 25%",
            "References D-099 which is not in historical deals",
        ],
    )


async def test_evaluate_report_pass(
    sample_account_summary,
    sample_historical_deals,
    sample_llm_report_output,
    good_evaluation,
):
    """Evaluator returns pass for a well-formed report."""
    metadata = ReportMetadata(
        proposition_type="upsell proposition",
        success_percent=75,
        priority_score=7,
        score_rationale="High utilization near renewal",
    )

    with patch("src.report_graph.ChatOpenAI") as mock_cls:
        mock_model = MagicMock()
        mock_structured = AsyncMock()
        mock_structured.ainvoke.return_value = good_evaluation
        mock_model.with_structured_output.return_value = mock_structured
        mock_cls.return_value = mock_model

        with patch("src.resilience.llm_semaphore", asyncio.Semaphore(10)):
            result = await evaluate_report(
                sample_llm_report_output,
                metadata,
                sample_account_summary,
                sample_historical_deals,
            )

    assert result.overall_quality == "pass"
    assert result.sections_complete is True
    assert result.metrics_accurate is True
    assert result.issues == []


async def test_evaluate_report_marginal(
    sample_account_summary,
    sample_historical_deals,
    sample_llm_report_output,
    marginal_evaluation,
):
    """Evaluator returns marginal with specific issues."""
    metadata = ReportMetadata(
        proposition_type="upsell proposition",
        success_percent=75,
    )

    with patch("src.report_graph.ChatOpenAI") as mock_cls:
        mock_model = MagicMock()
        mock_structured = AsyncMock()
        mock_structured.ainvoke.return_value = marginal_evaluation
        mock_model.with_structured_output.return_value = mock_structured
        mock_cls.return_value = mock_model

        with patch("src.resilience.llm_semaphore", asyncio.Semaphore(10)):
            result = await evaluate_report(
                sample_llm_report_output,
                metadata,
                sample_account_summary,
                sample_historical_deals,
            )

    assert result.overall_quality == "marginal"
    assert result.metrics_accurate is False
    assert len(result.issues) == 1


async def test_evaluate_report_fail(
    sample_account_summary,
    sample_historical_deals,
    sample_llm_report_output,
    bad_evaluation,
):
    """Evaluator returns fail with multiple issues."""
    metadata = ReportMetadata(
        proposition_type="upsell proposition",
        success_percent=75,
    )

    with patch("src.report_graph.ChatOpenAI") as mock_cls:
        mock_model = MagicMock()
        mock_structured = AsyncMock()
        mock_structured.ainvoke.return_value = bad_evaluation
        mock_model.with_structured_output.return_value = mock_structured
        mock_cls.return_value = mock_model

        with patch("src.resilience.llm_semaphore", asyncio.Semaphore(10)):
            result = await evaluate_report(
                sample_llm_report_output,
                metadata,
                sample_account_summary,
                sample_historical_deals,
            )

    assert result.overall_quality == "fail"
    assert result.sections_complete is False
    assert result.metrics_accurate is False
    assert result.classification_justified is False
    assert result.evidence_grounded is False
    assert len(result.issues) == 4


async def test_evaluate_report_uses_structured_output(
    sample_account_summary,
    good_evaluation,
):
    """Verify evaluator calls with_structured_output(ReportEvaluation)."""
    metadata = ReportMetadata()

    with patch("src.report_graph.ChatOpenAI") as mock_cls:
        mock_model = MagicMock()
        mock_structured = AsyncMock()
        mock_structured.ainvoke.return_value = good_evaluation
        mock_model.with_structured_output.return_value = mock_structured
        mock_cls.return_value = mock_model

        with patch("src.resilience.llm_semaphore", asyncio.Semaphore(10)):
            await evaluate_report(
                "report text", metadata, sample_account_summary, [],
            )

    mock_model.with_structured_output.assert_called_once_with(ReportEvaluation)


async def test_evaluate_report_prompt_contains_data(
    sample_account_summary,
    sample_historical_deals,
    good_evaluation,
):
    """Verify the evaluator prompt includes account data and report text."""
    metadata = ReportMetadata(proposition_type="upsell proposition")
    report_text = "### Executive Summary\nTest report content"

    with patch("src.report_graph.ChatOpenAI") as mock_cls:
        mock_model = MagicMock()
        mock_structured = AsyncMock()
        mock_structured.ainvoke.return_value = good_evaluation
        mock_model.with_structured_output.return_value = mock_structured
        mock_cls.return_value = mock_model

        with patch("src.resilience.llm_semaphore", asyncio.Semaphore(10)):
            await evaluate_report(
                report_text, metadata,
                sample_account_summary, sample_historical_deals,
            )

    # Check the prompt sent to the model
    call_args = mock_structured.ainvoke.call_args
    prompt = call_args[0][0]
    assert "Test report content" in prompt
    assert "AC-1" in prompt  # account ID from summary
    assert "upsell proposition" in prompt  # metadata
