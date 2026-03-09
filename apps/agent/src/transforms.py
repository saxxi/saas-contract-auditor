def _raw_json_to_summary(data: dict) -> dict:
    """Transform landing page JSON shape -> AccountSummary dict.

    Accepts arbitrary usage metrics. If the input has a `usage_metrics` array,
    pass it through. Otherwise, scan `usage` dict for paired current/limit
    fields (e.g. active_users + seat_limit) and build metrics dynamically.
    """
    # If already in the new format, pass through
    if "usage_metrics" in data:
        return {
            "id": "DEMO",
            "name": data.get("account", "Demo Account"),
            "usage_metrics": data["usage_metrics"],
            "budget_report": data.get("contract", data.get("budget_report", {})),
            "context": data.get("context"),
        }

    # Legacy format: scan usage dict for value/limit pairs
    usage = data.get("usage", {})
    metrics = []

    # Known paired fields (old format)
    known_pairs = [
        ("active_users", "seat_limit", "seats", "users"),
        ("monthly_invoices", "invoice_limit", "invoices", "invoices/mo"),
        ("active_integrations", "integration_limit", "integrations", "active"),
    ]

    matched_keys = set()
    for current_key, limit_key, metric_name, unit in known_pairs:
        if current_key in usage:
            metrics.append({
                "metric_name": metric_name,
                "current_value": usage[current_key],
                "limit_value": usage.get(limit_key, usage[current_key]),
                "unit": unit,
            })
            matched_keys.add(current_key)
            matched_keys.add(limit_key)

    # Pick up any remaining key/value pairs as generic metrics
    for key, value in usage.items():
        if key in matched_keys:
            continue
        if isinstance(value, (int, float)):
            metrics.append({
                "metric_name": key,
                "current_value": value,
                "limit_value": value,
                "unit": None,
            })

    return {
        "id": "DEMO",
        "name": data.get("account", "Demo Account"),
        "usage_metrics": metrics,
        "budget_report": data.get("contract", data.get("budget_report", {})),
        "context": data.get("context"),
    }
