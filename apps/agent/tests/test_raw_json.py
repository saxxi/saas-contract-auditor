from src.contracts import _raw_json_to_summary


def test_new_format_passthrough():
    data = {
        "account": "TestCo",
        "usage_metrics": [
            {"metric_name": "seats", "current_value": 10, "limit_value": 50, "unit": "users"}
        ],
        "contract": {"tier": "Growth", "mrr": 1200},
    }
    result = _raw_json_to_summary(data)
    assert result["name"] == "TestCo"
    assert result["usage_metrics"] == data["usage_metrics"]
    assert result["budget_report"] == data["contract"]
    assert result["id"] == "DEMO"


def test_legacy_format_known_pairs():
    data = {
        "account": "LegacyCo",
        "usage": {
            "active_users": 45,
            "seat_limit": 50,
            "monthly_invoices": 800,
            "invoice_limit": 1000,
        },
        "contract": {"tier": "Pro"},
    }
    result = _raw_json_to_summary(data)
    metrics = result["usage_metrics"]
    names = [m["metric_name"] for m in metrics]
    assert "seats" in names
    assert "invoices" in names
    seats = next(m for m in metrics if m["metric_name"] == "seats")
    assert seats["current_value"] == 45
    assert seats["limit_value"] == 50


def test_generic_numeric_keys():
    data = {
        "usage": {
            "api_calls": 5000,
        },
    }
    result = _raw_json_to_summary(data)
    metrics = result["usage_metrics"]
    assert len(metrics) == 1
    assert metrics[0]["metric_name"] == "api_calls"
    assert metrics[0]["current_value"] == 5000


def test_missing_usage_key():
    data = {"account": "EmptyCo", "contract": {"tier": "Starter"}}
    result = _raw_json_to_summary(data)
    assert result["usage_metrics"] == []


def test_account_name_extraction():
    data = {"account": "Named Account", "usage": {}}
    result = _raw_json_to_summary(data)
    assert result["name"] == "Named Account"
    # Default when no account key
    result2 = _raw_json_to_summary({"usage": {}})
    assert result2["name"] == "Demo Account"
