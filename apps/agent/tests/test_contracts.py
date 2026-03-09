import json
from unittest.mock import AsyncMock, patch, MagicMock

import httpx
import respx

from src.contracts import (
    select_accounts,
    generate_reports,
    get_report_content,
    update_report,
    analyze_raw_data,
    _raw_json_to_summary,
    API_BASE,
)


def test_select_accounts_adds_new(mock_tool_runtime):
    rt = mock_tool_runtime(state={"account_reports": []})
    result = select_accounts.invoke(
        {"account_ids": ["AC-1", "AC-2"], "runtime": rt}
    )
    reports = result.update["account_reports"]
    assert len(reports) == 2
    assert all(r["status"] == "pending" for r in reports)


def test_select_accounts_skips_duplicates(mock_tool_runtime):
    existing = [{"id": "AC-1", "status": "generated", "report": None}]
    rt = mock_tool_runtime(state={"account_reports": existing})
    result = select_accounts.invoke(
        {"account_ids": ["AC-1", "AC-2"], "runtime": rt}
    )
    reports = result.update["account_reports"]
    ids = [r["id"] for r in reports]
    assert ids.count("AC-1") == 1
    assert "AC-2" in ids


async def test_generate_reports_invokes_graph(mock_tool_runtime):
    rt = mock_tool_runtime(state={"account_reports": []})

    mock_graph = AsyncMock()
    mock_graph.ainvoke.return_value = {
        "results": [
            {
                "account_id": "AC-1",
                "report": {
                    "proposition_type": "healthy",
                    "success_percent": 60,
                    "intervene": False,
                },
            }
        ],
        "errors": [],
    }

    with patch("src.contracts.build_report_graph", return_value=mock_graph):
        result = await generate_reports.ainvoke(
            {"account_ids": ["AC-1"], "runtime": rt}
        )

    mock_graph.ainvoke.assert_called_once()
    assert any(r["id"] == "AC-1" for r in result.update["account_reports"])


@respx.mock
async def test_get_report_content_success(mock_tool_runtime):
    rt = mock_tool_runtime()
    report_data = {"id": "rpt-1", "content": "# Report", "account_id": "AC-1"}
    respx.get(f"{API_BASE}/api/account_reports/AC-1").mock(
        return_value=httpx.Response(200, json=report_data)
    )

    result = await get_report_content.ainvoke(
        {"account_id": "AC-1", "runtime": rt}
    )
    parsed = json.loads(result)
    assert parsed["id"] == "rpt-1"


@respx.mock
async def test_update_report_full_flow(mock_tool_runtime):
    """Mock GET + LLM + PUT -> Command with focused_account_id."""
    rt = mock_tool_runtime()

    # GET current report
    respx.get(f"{API_BASE}/api/account_reports/AC-1").mock(
        return_value=httpx.Response(
            200,
            json={"id": "rpt-1", "content": "Old report", "account_id": "AC-1"},
        )
    )
    # PUT updated report
    respx.put(f"{API_BASE}/api/account_reports/rpt-1").mock(
        return_value=httpx.Response(200, json={"id": "rpt-1"})
    )

    mock_response = MagicMock()
    mock_response.content = (
        "Updated report body\n"
        '{"proposition_type": "upsell proposition", "success_percent": 85, "intervene": false}'
    )

    with patch("src.contracts.ChatOpenAI") as mock_cls:
        mock_model = AsyncMock()
        mock_model.ainvoke.return_value = mock_response
        mock_cls.return_value = mock_model

        result = await update_report.ainvoke(
            {"account_id": "AC-1", "changes": "increase success", "runtime": rt}
        )

    assert result.update["focused_account_id"] == "AC-1"


@respx.mock
async def test_analyze_raw_data_json(mock_tool_runtime):
    """Valid JSON -> demo_report in Command."""
    rt = mock_tool_runtime()

    respx.get(f"{API_BASE}/api/historical_deals").mock(
        return_value=httpx.Response(200, json=[])
    )

    raw_json = json.dumps({
        "account": "TestCo",
        "usage_metrics": [
            {"metric_name": "seats", "current_value": 10, "limit_value": 50}
        ],
        "contract": {"tier": "Growth"},
    })

    mock_response = MagicMock()
    mock_response.content = (
        "Report for TestCo\n"
        '{"proposition_type": "healthy", "success_percent": 70, "intervene": false}'
    )

    with patch("src.report_graph.ChatOpenAI") as mock_cls:
        mock_model = AsyncMock()
        mock_model.ainvoke.return_value = mock_response
        mock_cls.return_value = mock_model

        result = await analyze_raw_data.ainvoke(
            {"account_data": raw_json, "runtime": rt}
        )

    assert result.update["demo_report"] is not None
    assert "content" in result.update["demo_report"]


@respx.mock
async def test_analyze_raw_data_freetext(mock_tool_runtime):
    """Plain text -> summary has raw_data, demo_report set."""
    rt = mock_tool_runtime()

    respx.get(f"{API_BASE}/api/historical_deals").mock(
        return_value=httpx.Response(200, json=[])
    )

    mock_response = MagicMock()
    mock_response.content = (
        "Report for demo\n"
        '{"proposition_type": "poor usage", "success_percent": 30, "intervene": true}'
    )

    with patch("src.report_graph.ChatOpenAI") as mock_cls:
        mock_model = AsyncMock()
        mock_model.ainvoke.return_value = mock_response
        mock_cls.return_value = mock_model

        result = await analyze_raw_data.ainvoke(
            {"account_data": "Some freeform text about a client", "runtime": rt}
        )

    assert result.update["demo_report"] is not None

    # Verify LLM was called with the raw text
    call_args = mock_model.ainvoke.call_args_list[0]
    prompt_text = call_args[0][0]
    assert "Some freeform text about a client" in prompt_text
