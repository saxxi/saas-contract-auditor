import pytest
from pydantic import ValidationError

from src.report_graph import (
    _parse_report_metadata,
    _extract_report_body,
    _filter_relevant_deals,
    _validate_report_sections,
    REQUIRED_SECTIONS,
)
from src.types import ReportMetadata


# --- ReportMetadata Pydantic model ---


def test_report_metadata_valid():
    m = ReportMetadata(
        proposition_type="upsell proposition",
        strategic_bucket="Upsell Opportunity",
        success_percent=80,
        intervene=True,
        priority_score=8,
        score_rationale="high usage",
    )
    assert m.proposition_type == "upsell proposition"
    assert m.success_percent == 80


def test_report_metadata_defaults():
    m = ReportMetadata()
    assert m.proposition_type == "healthy"
    assert m.success_percent == 50
    assert m.intervene is False
    assert m.priority_score == 5


def test_report_metadata_invalid_type():
    with pytest.raises(ValidationError):
        ReportMetadata(proposition_type="invalid_type")


def test_report_metadata_success_percent_clamped():
    with pytest.raises(ValidationError):
        ReportMetadata(success_percent=150)
    with pytest.raises(ValidationError):
        ReportMetadata(success_percent=-10)


def test_report_metadata_priority_score_range():
    with pytest.raises(ValidationError):
        ReportMetadata(priority_score=0)
    with pytest.raises(ValidationError):
        ReportMetadata(priority_score=11)


def test_report_metadata_coerces_string_percent():
    """String success_percent should be coerced to int by Pydantic."""
    m = ReportMetadata(success_percent="75")
    assert m.success_percent == 75


# --- _parse_report_metadata (now returns ReportMetadata) ---


def test_parse_metadata_valid_json_last_line():
    text = "Report body\n" '{"proposition_type": "upsell proposition", "success_percent": 80, "intervene": true, "priority_score": 8, "score_rationale": "high usage"}'
    result = _parse_report_metadata(text)
    assert isinstance(result, ReportMetadata)
    assert result.proposition_type == "upsell proposition"
    assert result.success_percent == 80
    assert result.intervene is True
    assert result.priority_score == 8


def test_parse_metadata_trailing_blank():
    text = 'Report body\n{"proposition_type": "healthy", "success_percent": 60}\n  \n'
    result = _parse_report_metadata(text)
    assert result.proposition_type == "healthy"
    assert result.success_percent == 60


def test_parse_metadata_partial_fields():
    text = '{"proposition_type": "poor usage"}'
    result = _parse_report_metadata(text)
    assert result.proposition_type == "poor usage"
    assert result.success_percent == 50  # default
    assert result.intervene is False  # default


def test_parse_metadata_no_json():
    text = "Just a plain report with no JSON metadata line"
    result = _parse_report_metadata(text)
    assert result.proposition_type == "healthy"
    assert result.success_percent == 50


def test_parse_metadata_invalid_json():
    text = "Report\n{invalid json here}"
    result = _parse_report_metadata(text)
    assert result.proposition_type == "healthy"


def test_parse_metadata_invalid_enum_falls_through():
    """Invalid proposition_type in JSON -> Pydantic rejects, falls to defaults."""
    text = '{"proposition_type": "totally_wrong", "success_percent": 80}'
    result = _parse_report_metadata(text)
    # Pydantic validation fails on invalid enum, so defaults are returned
    assert result.proposition_type == "healthy"
    assert result.success_percent == 50


def test_parse_metadata_string_success_percent():
    text = '{"success_percent": "75", "proposition_type": "upsell proposition"}'
    result = _parse_report_metadata(text)
    assert result.success_percent == 75
    assert isinstance(result.success_percent, int)


# --- _extract_report_body ---


def test_extract_body_removes_json_line():
    text = "Report body here\nMore content\n" '{"proposition_type": "healthy"}'
    result = _extract_report_body(text)
    assert "proposition_type" not in result
    assert "Report body here" in result
    assert "More content" in result


def test_extract_body_preserves_non_json_braces():
    text = "Code: {foo: bar}\nSome text\n" '{"proposition_type": "healthy"}'
    result = _extract_report_body(text)
    assert "{foo: bar}" in result
    assert "proposition_type" not in result


def test_extract_body_no_json_returns_full():
    text = "Just a report\nWith multiple lines\nNo JSON"
    result = _extract_report_body(text)
    assert result == text


def test_extract_body_multiple_json_removes_last_valid():
    text = '{"first": true}\nMiddle text\n{"proposition_type": "healthy"}'
    result = _extract_report_body(text)
    # Should remove last valid JSON line only
    assert '{"first": true}' in result
    assert "Middle text" in result
    assert "proposition_type" not in result


# --- _validate_report_sections ---


def test_validate_sections_all_present():
    text = "\n".join(REQUIRED_SECTIONS)
    assert _validate_report_sections(text) == []


def test_validate_sections_some_missing():
    text = "### Executive Summary\n### Situation\n### Complication"
    missing = _validate_report_sections(text)
    assert "### Resolution" in missing
    assert "### Key Metrics" in missing
    assert "### Executive Summary" not in missing


def test_validate_sections_empty():
    assert len(_validate_report_sections("")) == len(REQUIRED_SECTIONS)


# --- _filter_relevant_deals ---


def test_filter_tier_match_scores_higher(sample_account_summary, sample_historical_deals):
    result = _filter_relevant_deals(sample_historical_deals, sample_account_summary)
    # Enterprise deals should be prioritized
    top_tiers = [d.get("original_tier") for d in result[:3]]
    assert top_tiers.count("Enterprise") >= 2


def test_filter_won_outcome_scores_higher(sample_account_summary):
    deals = [
        {"id": "D-1", "original_tier": "Enterprise", "outcome": "lost", "deal_size_usd": 50000},
        {"id": "D-2", "original_tier": "Enterprise", "outcome": "won", "deal_size_usd": 50000},
    ]
    result = _filter_relevant_deals(deals, sample_account_summary)
    assert result[0]["id"] == "D-2"


def test_filter_deal_size_ratio(sample_account_summary):
    # MRR is 4200, so annual is 50400. Ratio 0.5-3.0x = 25200-151200
    deals = [
        {"id": "D-in", "original_tier": "Other", "outcome": "pending", "deal_size_usd": 50000},
        {"id": "D-out", "original_tier": "Other", "outcome": "pending", "deal_size_usd": 500000},
    ]
    result = _filter_relevant_deals(deals, sample_account_summary)
    assert result[0]["id"] == "D-in"


def test_filter_returns_max_8(sample_account_summary):
    deals = [
        {"id": f"D-{i}", "original_tier": "Enterprise", "outcome": "won", "deal_size_usd": 50000}
        for i in range(20)
    ]
    result = _filter_relevant_deals(deals, sample_account_summary)
    assert len(result) <= 8
