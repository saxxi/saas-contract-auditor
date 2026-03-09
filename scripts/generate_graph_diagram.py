"""Generate LangGraph architecture diagrams as PNG for the landing page.

Usage: cd apps/agent && uv run ../../scripts/generate_graph_diagram.py
Output: docs/images/report_graph.png, docs/images/opportunities_graph.png
"""

import pathlib
import sys

# Add agent root to path so `from src.xxx` imports work
agent_root = pathlib.Path(__file__).resolve().parent.parent / "apps" / "agent"
sys.path.insert(0, str(agent_root))

from src.report_graph import build_report_graph
from src.opportunities_graph import build_opportunities_graph

out_dir = pathlib.Path(__file__).resolve().parent.parent / "docs" / "images"
out_dir.mkdir(parents=True, exist_ok=True)

for name, builder in [
    ("report_graph", build_report_graph),
    ("opportunities_graph", build_opportunities_graph),
]:
    graph = builder()
    png = graph.get_graph().draw_mermaid_png()
    path = out_dir / f"{name}.png"
    with open(path, "wb") as f:
        f.write(png)
    print(f"Saved: {path}")
