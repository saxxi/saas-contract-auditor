from unittest.mock import AsyncMock, patch, MagicMock

import httpx
import respx

from src.opportunities_graph import fetch_and_analyze, API_BASE


@respx.mock
async def test_fetch_and_analyze_success():
    """Mock APIs + LLM with ["AC-1"] -> recommended_ids parsed."""
    respx.get(f"{API_BASE}/api/account_summaries").mock(
        return_value=httpx.Response(
            200,
            json=[
                {
                    "id": "AC-1",
                    "usage_metrics": [
                        {"metric_name": "seats", "current_value": 95, "limit_value": 100}
                    ],
                    "budget_report": {"tier": "Growth", "mrr": 2000},
                }
            ],
        )
    )
    respx.get(f"{API_BASE}/api/accounts").mock(
        return_value=httpx.Response(
            200, json=[{"id": "AC-1", "name": "TestCo"}]
        )
    )

    llm_text = "### ANALYSIS\n**AC-1** is near capacity.\n\n### SELECTED\n[\"AC-1\"]"
    mock_response = MagicMock()
    mock_response.content = llm_text

    with patch("src.opportunities_graph.ChatOpenAI") as mock_cls:
        mock_model = AsyncMock()
        mock_model.ainvoke.return_value = mock_response
        mock_cls.return_value = mock_model

        result = await fetch_and_analyze(
            {"account_ids": ["AC-1"], "analysis": "", "recommended_ids": []}
        )

    assert "AC-1" in result["recommended_ids"]
    assert "AC-1" in result["analysis"]


@respx.mock
async def test_fetch_and_analyze_no_json_array():
    """LLM has no array -> recommended_ids == []."""
    respx.get(f"{API_BASE}/api/account_summaries").mock(
        return_value=httpx.Response(200, json=[])
    )
    respx.get(f"{API_BASE}/api/accounts").mock(
        return_value=httpx.Response(200, json=[])
    )

    mock_response = MagicMock()
    mock_response.content = "No clear opportunities found in the current dataset."

    with patch("src.opportunities_graph.ChatOpenAI") as mock_cls:
        mock_model = AsyncMock()
        mock_model.ainvoke.return_value = mock_response
        mock_cls.return_value = mock_model

        result = await fetch_and_analyze(
            {"account_ids": ["AC-1"], "analysis": "", "recommended_ids": []}
        )

    assert result["recommended_ids"] == []


@respx.mock
async def test_fetch_and_analyze_api_failure():
    """APIs return 500 -> handles gracefully."""
    respx.get(f"{API_BASE}/api/account_summaries").mock(
        return_value=httpx.Response(500)
    )
    respx.get(f"{API_BASE}/api/accounts").mock(
        return_value=httpx.Response(500)
    )

    mock_response = MagicMock()
    mock_response.content = "No data available.\n[]"

    with patch("src.opportunities_graph.ChatOpenAI") as mock_cls:
        mock_model = AsyncMock()
        mock_model.ainvoke.return_value = mock_response
        mock_cls.return_value = mock_model

        result = await fetch_and_analyze(
            {"account_ids": ["AC-1"], "analysis": "", "recommended_ids": []}
        )

    # Should not crash; may have empty results
    assert isinstance(result["recommended_ids"], list)
