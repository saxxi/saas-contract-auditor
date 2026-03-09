#!/usr/bin/env python3
"""Evaluation harness for the contract analysis agent.

Runs each case in evaluation/dataset.json through the agent's analysis pipeline
and compares the output classification against expected values.

Usage:
    cd apps/agent
    uv run python ../../evaluation/run_eval.py
    uv run python ../../evaluation/run_eval.py --mock   # Use recorded fixtures (no LLM)

Requires OPENAI_API_KEY in environment or .env file (unless --mock is used).
"""

import argparse
import asyncio
import json
import sys
import time
from pathlib import Path
from unittest.mock import MagicMock, patch

# Add agent src to path
agent_root = Path(__file__).resolve().parent.parent / "apps" / "agent"
sys.path.insert(0, str(agent_root))

from dotenv import load_dotenv
load_dotenv(agent_root / ".env")
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from src.report_graph import analyze_account

DATASET_PATH = Path(__file__).parent / "dataset.json"
FIXTURES_DIR = Path(__file__).parent / "fixtures"

# Accepted equivalent types for scoring
TYPE_EQUIVALENTS = {
    "upsell proposition": {"upsell proposition", "at capacity"},
    "at capacity": {"at capacity", "upsell proposition"},
}

# Required sections in a report
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


def load_dataset() -> list[dict]:
    with open(DATASET_PATH) as f:
        return json.load(f)


def score_report_quality(result: dict, case: dict) -> dict:
    """Score a generated report for quality metrics."""
    content = result.get("content", "")

    # Section completeness
    sections_present = sum(1 for s in REQUIRED_SECTIONS if s in content)
    section_score = sections_present / len(REQUIRED_SECTIONS)

    # Metric table coverage: check if input values appear in output
    metrics = case["account"].get("usage_metrics", [])
    metric_values = []
    for m in metrics:
        for key in ("current_value", "limit_value"):
            val = m.get(key)
            if val is not None:
                metric_values.append(str(val))

    if metric_values:
        found = sum(1 for v in metric_values if v in content)
        metric_coverage = found / len(metric_values)
    else:
        metric_coverage = 1.0  # No metrics to check (raw_data case)

    # ARR at Risk mentioned
    has_arr_at_risk = "ARR at Risk" in content or "ARR at risk" in content

    # Overall quality score (weighted)
    quality_score = (section_score * 0.5) + (metric_coverage * 0.3) + (0.2 if has_arr_at_risk else 0)

    return {
        "section_score": round(section_score, 2),
        "sections_present": sections_present,
        "sections_total": len(REQUIRED_SECTIONS),
        "metric_coverage": round(metric_coverage, 2),
        "has_arr_at_risk": has_arr_at_risk,
        "quality_score": round(quality_score, 2),
    }


def load_fixture(case_id: str) -> str | None:
    """Load a recorded LLM response fixture for mock mode."""
    fixture_path = FIXTURES_DIR / f"{case_id}.json"
    if not fixture_path.exists():
        return None
    with open(fixture_path) as f:
        data = json.load(f)
    return data.get("response", None)


async def evaluate_case(case: dict, mock: bool = False) -> dict:
    """Run a single evaluation case and return results."""
    account = case["account"]
    expected_type = case["expected_type"]
    expected_intervene = case.get("expected_intervene")

    t0 = time.monotonic()
    try:
        if mock:
            fixture = load_fixture(case["id"])
            if fixture is None:
                return {
                    "id": case["id"],
                    "status": "error",
                    "error": f"No fixture found for {case['id']}",
                    "duration_ms": 0,
                }

            mock_response = MagicMock()
            mock_response.content = fixture

            async def _mock_ainvoke(*a, **kw):
                return mock_response

            with patch("src.report_graph.ChatOpenAI") as mock_cls:
                mock_model = MagicMock()
                mock_model.ainvoke = _mock_ainvoke
                mock_cls.return_value = mock_model

                with patch("src.resilience.llm_semaphore", asyncio.Semaphore(100)):
                    result = await analyze_account(account, deals=[])
        else:
            result = await analyze_account(account, deals=[])

        duration_ms = int((time.monotonic() - t0) * 1000)
    except Exception as exc:
        return {
            "id": case["id"],
            "status": "error",
            "error": str(exc),
            "duration_ms": int((time.monotonic() - t0) * 1000),
        }

    actual_type = result.get("proposition_type", "unknown")
    actual_intervene = result.get("intervene", None)

    # Check type match (with equivalents)
    acceptable = TYPE_EQUIVALENTS.get(expected_type, {expected_type})
    type_match = actual_type in acceptable

    # Check intervene match
    intervene_match = (
        expected_intervene is None or actual_intervene == expected_intervene
    )

    # Quality scoring
    quality = score_report_quality(result, case)

    return {
        "id": case["id"],
        "description": case["description"],
        "status": "pass" if (type_match and intervene_match) else "fail",
        "expected_type": expected_type,
        "actual_type": actual_type,
        "type_match": type_match,
        "expected_intervene": expected_intervene,
        "actual_intervene": actual_intervene,
        "intervene_match": intervene_match,
        "success_percent": result.get("success_percent"),
        "priority_score": result.get("priority_score"),
        "duration_ms": duration_ms,
        **quality,
    }


async def run_evaluation(mock: bool = False):
    dataset = load_dataset()
    mode_str = " (MOCK MODE)" if mock else ""
    print(f"Running evaluation on {len(dataset)} cases{mode_str}...\n")

    results = []
    for case in dataset:
        print(f"  [{case['id']}] {case['description']}...", end=" ", flush=True)
        result = await evaluate_case(case, mock=mock)
        status = "PASS" if result["status"] == "pass" else (
            "ERROR" if result["status"] == "error" else "FAIL"
        )
        quality_str = f" quality={result.get('quality_score', '?')}" if result["status"] != "error" else ""
        print(f"{status} ({result['duration_ms']}ms){quality_str}")
        if result["status"] == "fail":
            print(f"         expected={result['expected_type']}, got={result['actual_type']}")
            if not result.get("intervene_match", True):
                print(f"         intervene: expected={result['expected_intervene']}, got={result['actual_intervene']}")
        results.append(result)

    # Summary
    total = len(results)
    passed = sum(1 for r in results if r["status"] == "pass")
    failed = sum(1 for r in results if r["status"] == "fail")
    errors = sum(1 for r in results if r["status"] == "error")

    type_correct = sum(1 for r in results if r.get("type_match", False))
    intervene_correct = sum(1 for r in results if r.get("intervene_match", True) and r["status"] != "error")

    durations = [r["duration_ms"] for r in results if r["status"] != "error"]
    avg_ms = int(sum(durations) / len(durations)) if durations else 0

    quality_scores = [r["quality_score"] for r in results if "quality_score" in r]
    avg_quality = round(sum(quality_scores) / len(quality_scores), 2) if quality_scores else 0

    section_scores = [r["section_score"] for r in results if "section_score" in r]
    avg_sections = round(sum(section_scores) / len(section_scores), 2) if section_scores else 0

    metric_coverages = [r["metric_coverage"] for r in results if "metric_coverage" in r]
    avg_metric_cov = round(sum(metric_coverages) / len(metric_coverages), 2) if metric_coverages else 0

    print(f"\n{'='*60}")
    print(f"Results:            {passed}/{total} passed, {failed} failed, {errors} errors")
    print(f"Type accuracy:      {type_correct}/{total} ({100*type_correct//total}%)")
    print(f"Intervene accuracy: {intervene_correct}/{total} ({100*intervene_correct//total}%)")
    print(f"Avg latency:        {avg_ms}ms")
    print(f"{'='*60}")
    print(f"Avg quality score:  {avg_quality}")
    print(f"  Section coverage: {avg_sections}")
    print(f"  Metric coverage:  {avg_metric_cov}")
    print(f"{'='*60}")

    return 0 if failed == 0 and errors == 0 else 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run evaluation harness")
    parser.add_argument("--mock", action="store_true",
                        help="Use recorded fixtures instead of live LLM calls")
    args = parser.parse_args()

    exit_code = asyncio.run(run_evaluation(mock=args.mock))
    sys.exit(exit_code)
