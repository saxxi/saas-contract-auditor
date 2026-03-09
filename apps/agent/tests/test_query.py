from src.query import query_data


def test_query_data_returns_list():
    result = query_data.invoke({"query": "all"})
    assert isinstance(result, list)
    assert len(result) > 0


def test_query_data_rows_have_expected_columns():
    result = query_data.invoke({"query": "all"})
    row = result[0]
    expected_cols = {"date", "category", "subcategory", "amount", "type", "notes"}
    assert expected_cols.issubset(set(row.keys()))
