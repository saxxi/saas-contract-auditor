#!/usr/bin/env python3
"""Performance benchmark for the contract analysis pipeline.

Processes contracts from the evaluation dataset and reports latency statistics.

Usage:
    cd apps/agent
    uv run python ../../scripts/benchmark.py [--runs N]

Requires OPENAI_API_KEY in environment or .env file.
"""

import argparse
import asyncio
import json
import statistics
import sys
import time
from pathlib import Path

agent_root = Path(__file__).resolve().parent.parent / "apps" / "agent"
sys.path.insert(0, str(agent_root))

from dotenv import load_dotenv
load_dotenv(agent_root / ".env")
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

from src.report_graph import analyze_account


DATASET_PATH = Path(__file__).resolve().parent.parent / "evaluation" / "dataset.json"


def load_cases() -> list[dict]:
    with open(DATASET_PATH) as f:
        return json.load(f)


async def benchmark_case(account: dict) -> float | None:
    """Run analysis and return duration in ms, or None on error."""
    t0 = time.monotonic()
    try:
        await analyze_account(account, deals=[])
        return (time.monotonic() - t0) * 1000
    except Exception as exc:
        print(f"  ERROR: {exc}")
        return None


async def run_benchmark(runs: int):
    cases = load_cases()
    print(f"Benchmark: {len(cases)} contracts x {runs} run(s) = {len(cases) * runs} analyses\n")

    all_durations: list[float] = []

    for run_idx in range(runs):
        if runs > 1:
            print(f"--- Run {run_idx + 1}/{runs} ---")
        for case in cases:
            aid = case["id"]
            account = case["account"]
            print(f"  [{aid}]...", end=" ", flush=True)
            duration = await benchmark_case(account)
            if duration is not None:
                all_durations.append(duration)
                print(f"{int(duration)}ms")
            else:
                print("FAILED")

    if not all_durations:
        print("\nNo successful runs.")
        return 1

    all_durations.sort()
    n = len(all_durations)
    avg = statistics.mean(all_durations)
    median = statistics.median(all_durations)
    p95_idx = min(int(n * 0.95), n - 1)
    p99_idx = min(int(n * 0.99), n - 1)

    print(f"\n{'='*50}")
    print(f"Analyzed {n} contracts")
    print(f"Average latency:  {int(avg)}ms")
    print(f"Median latency:   {int(median)}ms")
    print(f"95th percentile:  {int(all_durations[p95_idx])}ms")
    print(f"99th percentile:  {int(all_durations[p99_idx])}ms")
    print(f"Min:              {int(all_durations[0])}ms")
    print(f"Max:              {int(all_durations[-1])}ms")
    print(f"{'='*50}")

    return 0


def main():
    parser = argparse.ArgumentParser(description="Benchmark contract analysis pipeline")
    parser.add_argument("--runs", type=int, default=1, help="Number of full runs (default: 1)")
    args = parser.parse_args()
    exit_code = asyncio.run(run_benchmark(args.runs))
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
