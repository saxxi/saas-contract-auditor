import pytest
from langchain.tools import ToolRuntime


@pytest.fixture
def tmp_cache_dir(tmp_path, monkeypatch):
    """Patch CACHE_DIR and TTL_SECONDS for deterministic cache tests."""
    cache_dir = tmp_path / ".cache"
    cache_dir.mkdir()
    import src.cache as cache_mod

    monkeypatch.setattr(cache_mod, "CACHE_DIR", cache_dir)
    monkeypatch.setattr(cache_mod, "TTL_SECONDS", 60)
    return cache_dir


@pytest.fixture
def mock_tool_runtime():
    """Factory returning a real ToolRuntime with .state dict and .tool_call_id."""

    def _make(state=None):
        return ToolRuntime(
            state=state or {},
            tool_call_id="call_test_123",
            config={},
            context=None,
            stream_writer=None,
            store=None,
        )

    return _make


@pytest.fixture
def sample_account_summary():
    return {
        "id": "AC-1",
        "name": "Acme Corp",
        "usage_metrics": [
            {
                "metric_name": "seats",
                "current_value": 180,
                "limit_value": 200,
                "unit": "users",
            },
            {
                "metric_name": "invoices",
                "current_value": 950,
                "limit_value": 1000,
                "unit": "invoices/mo",
            },
        ],
        "budget_report": {
            "tier": "Enterprise",
            "mrr": 4200,
            "renewal_in_days": 45,
            "payment_status": "current",
        },
        "context": "Key account, expanding usage.",
    }


@pytest.fixture
def sample_historical_deals():
    return [
        {
            "id": "D-001",
            "original_tier": "Enterprise",
            "outcome": "won",
            "deal_size_usd": 120000,
        },
        {
            "id": "D-002",
            "original_tier": "Growth",
            "outcome": "won",
            "deal_size_usd": 40000,
        },
        {
            "id": "D-003",
            "original_tier": "Enterprise",
            "outcome": "lost",
            "deal_size_usd": 200000,
        },
        {
            "id": "D-004",
            "original_tier": "Starter",
            "outcome": "won",
            "deal_size_usd": 8000,
        },
        {
            "id": "D-005",
            "original_tier": "Enterprise",
            "outcome": "won",
            "deal_size_usd": 50000,
        },
        {
            "id": "D-006",
            "original_tier": "Growth",
            "outcome": "lost",
            "deal_size_usd": 30000,
        },
        {
            "id": "D-007",
            "original_tier": "Enterprise",
            "outcome": "closed-won",
            "deal_size_usd": 60000,
        },
        {
            "id": "D-008",
            "original_tier": "Enterprise",
            "outcome": "won",
            "deal_size_usd": 55000,
        },
        {
            "id": "D-009",
            "original_tier": "Growth",
            "outcome": "won",
            "deal_size_usd": 35000,
        },
        {
            "id": "D-010",
            "original_tier": "Starter",
            "outcome": "lost",
            "deal_size_usd": 5000,
        },
    ]


@pytest.fixture
def sample_llm_report_output():
    return (
        "### Executive Summary\n"
        "- **Classification**: Upsell Opportunity | upsell proposition\n"
        "- **ARR at Risk**: $50,400\n"
        "- **Top Signal**: 90% seat utilization with 180/200 seats used\n"
        "- **Action**: Expand to next tier before renewal\n\n"
        "### Situation\n"
        "Acme Corp is on Enterprise tier at $4,200 MRR. 180/200 seats (90%), 950/1000 invoices (95%).\n\n"
        "### Complication\n"
        "Seats are at 90% utilization with renewal in 45 days.\n\n"
        "### Resolution\n"
        "| | Option A | Option B |\n|---|---|---|\n| Action | Upgrade | Restructure |\n\n"
        "### Key Metrics\n"
        "| Metric | Value | Limit | Utilization | Headroom |\n"
        "|--------|-------|-------|-------------|----------|\n"
        "| Seats | 180 | 200 | 90% | 20 |\n"
        "| Invoices | 950 | 1000 | 95% | 50 |\n\n"
        "### Evidence from Similar Engagements\n"
        "- D-001: Similar enterprise account upgraded successfully.\n\n"
        "### Risks and Mitigants\n"
        "| Risk | Likelihood | Mitigant |\n|------|-----------|----------|\n| Price pushback | Medium | Show ROI |\n\n"
        "### Next Steps\n"
        "| # | Action | Owner | Deadline |\n|---|--------|-------|----------|\n| 1 | Schedule call | AE | T-30d |\n\n"
        "### Key Question\n"
        "What would unlocking more capacity mean for your team?\n\n"
        '{"proposition_type": "upsell proposition", "strategic_bucket": "Upsell Opportunity", '
        '"success_percent": 75, "intervene": false, "priority_score": 7, '
        '"score_rationale": "High utilization near renewal"}'
    )
