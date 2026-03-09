from src.report_graph import build_report_graph, fan_out
from src.opportunities_graph import build_opportunities_graph
from langgraph.types import Send


def test_report_graph_compiles():
    graph = build_report_graph()
    assert graph is not None


def test_report_graph_has_expected_nodes():
    graph = build_report_graph()
    node_names = set(graph.get_graph().nodes.keys())
    for expected in ("process_account", "collect_results", "finalize"):
        assert expected in node_names, f"Missing node: {expected}"


def test_opportunities_graph_compiles():
    graph = build_opportunities_graph()
    assert graph is not None


def test_opportunities_graph_has_expected_nodes():
    graph = build_opportunities_graph()
    node_names = set(graph.get_graph().nodes.keys())
    assert "fetch_and_analyze" in node_names


def test_fan_out_returns_send_objects():
    state = {"account_ids": ["AC-1", "AC-2"]}
    result = fan_out(state)
    assert len(result) == 2
    assert all(isinstance(s, Send) for s in result)
    assert result[0].node == "process_account"
    assert result[0].arg == {"account_id": "AC-1"}
