#!/usr/bin/env python3
"""Evaluation harness for the contract analysis agent.

Runs each case in evaluation/dataset.json through the agent's analysis pipeline
and compares the output classification against expected values.

Usage:
    cd apps/agent
    uv run python ../../evaluation/run_eval.py

Requires OPENAI_API_KEY in environment or .env file.
"""

import asyncio
import json
import sys
import time
from pathlib import Path

# Add agent src to path
agent_root = Path(__file__).resolve().parent.parent / "apps" / "agent"
sys.path.insert(0, str(agent_root))

from dotenv import load_dotenv
load_dotenv(agent_root / ".env")
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from src.report_graph import analyze_account, _parse_report_metadata


DATASET_PATH = Path(__file__).parent / "dataset.json"

# Accepted equivalent types for scoring
TYPE_EQUIVALENTS = {
    "upsell proposition": {"upsell proposition", "at capacity"},
    "at capacity": {"at capacity", "upsell proposition"},
}


def load_dataset() -> list[dict]:
    with open(DATASET_PATH) as f:
        return json.load(f)


async def evaluate_case(case: dict) -> dict:
    """Run a single evaluation case and return results."""
    account = case["account"]
    expected_type = case["expected_type"]
    expected_intervene = case.get("expected_intervene")

    t0 = time.monotonic()
    try:
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
    }


async def run_evaluation():
    dataset = load_dataset()
    print(f"Running evaluation on {len(dataset)} cases...\n")

    results = []
    for case in dataset:
        print(f"  [{case['id']}] {case['description']}...", end=" ", flush=True)
        result = await evaluate_case(case)
        status = "PASS" if result["status"] == "pass" else (
            "ERROR" if result["status"] == "error" else "FAIL"
        )
        print(f"{status} ({result['duration_ms']}ms)")
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

    print(f"\n{'='*50}")
    print(f"Results: {passed}/{total} passed, {failed} failed, {errors} errors")
    print(f"Type accuracy:      {type_correct}/{total} ({100*type_correct//total}%)")
    print(f"Intervene accuracy: {intervene_correct}/{total} ({100*intervene_correct//total}%)")
    print(f"Avg latency:        {avg_ms}ms")
    print(f"{'='*50}")

    return 0 if failed == 0 and errors == 0 else 1


if __name__ == "__main__":
    exit_code = asyncio.run(run_evaluation())
    sys.exit(exit_code)
