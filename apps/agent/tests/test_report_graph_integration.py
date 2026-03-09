from unittest.mock import AsyncMock, patch, MagicMock

import httpx
import respx

from src.report_graph import process_account, analyze_account, API_BASE


@respx.mock
async def test_process_account_success(
    tmp_cache_dir, sample_account_summary, sample_llm_report_output
):
    """Mock all APIs + LLM -> results has 1 entry, no errors."""
    # Mock account summary API
    respx.get(f"{API_BASE}/api/account_summaries").mock(
        return_value=httpx.Response(200, json=[sample_account_summary])
    )
    # Mock historical deals API
    respx.get(f"{API_BASE}/api/historical_deals").mock(
        return_value=httpx.Response(200, json=[])
    )
    # Mock save report API
    respx.post(f"{API_BASE}/api/accounts/AC-1/account_reports").mock(
        return_value=httpx.Response(
            201,
            json={
                "id": "report-1",
                "account_id": "AC-1",
                "proposition_type": "upsell proposition",
                "success_percent": 75,
                "intervene": False,
            },
        )
    )

    mock_response = MagicMock()
    mock_response.content = sample_llm_report_output

    with patch("src.report_graph.ChatOpenAI") as mock_cls:
        mock_model = AsyncMock()
        mock_model.ainvoke.return_value = mock_response
        mock_cls.return_value = mock_model

        result = await process_account({"account_id": "AC-1"})

    assert len(result["results"]) == 1
    assert result["errors"] == []
    assert result["results"][0]["account_id"] == "AC-1"


@respx.mock
async def test_process_account_fetch_fails(tmp_cache_dir):
    """API 500 -> error message returned."""
    respx.get(f"{API_BASE}/api/account_summaries").mock(
        return_value=httpx.Response(500)
    )

    result = await process_account({"account_id": "AC-FAIL"})

    assert result["results"] == []
    assert len(result["errors"]) == 1
    assert "AC-FAIL" in result["errors"][0]


@respx.mock
async def test_process_account_save_fails(
    tmp_cache_dir, sample_account_summary, sample_llm_report_output
):
    """Save POST 500 -> error about save failure."""
    respx.get(f"{API_BASE}/api/account_summaries").mock(
        return_value=httpx.Response(200, json=[sample_account_summary])
    )
    respx.get(f"{API_BASE}/api/historical_deals").mock(
        return_value=httpx.Response(200, json=[])
    )
    respx.post(f"{API_BASE}/api/accounts/AC-1/account_reports").mock(
        return_value=httpx.Response(500)
    )

    mock_response = MagicMock()
    mock_response.content = sample_llm_report_output

    with patch("src.report_graph.ChatOpenAI") as mock_cls:
        mock_model = AsyncMock()
        mock_model.ainvoke.return_value = mock_response
        mock_cls.return_value = mock_model

        result = await process_account({"account_id": "AC-1"})

    assert result["results"] == []
    assert any("save" in e.lower() or "Failed" in e for e in result["errors"])


async def test_analyze_account_two_llm_passes(
    sample_account_summary, sample_llm_report_output
):
    """LLM ainvoke called exactly 2x (report + sales script)."""
    mock_response = MagicMock()
    mock_response.content = sample_llm_report_output

    with patch("src.report_graph.ChatOpenAI") as mock_cls:
        mock_model = AsyncMock()
        mock_model.ainvoke.return_value = mock_response
        mock_cls.return_value = mock_model

        await analyze_account(sample_account_summary, [])

    assert mock_model.ainvoke.call_count == 2


async def test_analyze_account_raw_data_path(sample_llm_report_output):
    """Summary with raw_data -> deals sliced [:5], not filtered."""
    summary = {"id": "DEMO", "name": "Demo", "raw_data": "Some raw text data"}
    deals = [{"id": f"D-{i}", "original_tier": "X", "outcome": "won", "deal_size_usd": 100} for i in range(10)]

    mock_response = MagicMock()
    mock_response.content = sample_llm_report_output

    with patch("src.report_graph.ChatOpenAI") as mock_cls:
        mock_model = AsyncMock()
        mock_model.ainvoke.return_value = mock_response
        mock_cls.return_value = mock_model

        result = await analyze_account(summary, deals)

    # Verify the prompt used raw_data text
    call_args = mock_model.ainvoke.call_args_list[0]
    prompt_text = call_args[0][0]
    assert "Some raw text data" in prompt_text
    assert result["content"]  # Should have content
