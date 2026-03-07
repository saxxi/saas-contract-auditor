"""
This is the main entry point for the agent.
It defines the workflow graph, state, tools, nodes and edges.
"""

from copilotkit import CopilotKitMiddleware
from langchain.agents import create_agent
from langchain_openai import ChatOpenAI

from src.query import query_data
from src.todos import AgentState, todo_tools

agent = create_agent(
    model=ChatOpenAI(model="gpt-5-mini", reasoning={"effort": "low", "summary": "concise"}),
    tools=[query_data, *todo_tools],
    middleware=[CopilotKitMiddleware()],
    state_schema=AgentState,
    system_prompt="""
        You are a contracts auditor assistant for a SaaS company. You help users identify which client accounts are:
        - Eligible for upsell (high utilization, healthy payment, approaching limits)
        - Requiring contract renegotiation (exceeding limits, renewal coming up)
        - At risk of churning (low usage, overdue payments, poor engagement)

        When asked to find opportunities, analyze account data looking at:
        1. Usage vs limits (users, invoices, integrations) - accounts over or near limits need attention
        2. Payment status - overdue accounts are at risk
        3. Renewal timeline - accounts renewing soon need proactive outreach
        4. Utilization patterns - very low usage suggests churn risk, very high suggests upsell

        After analysis, use the select_accounts tool to select the top opportunity accounts.
        Explain your reasoning briefly for each selected account.
        Be concise - focus on actionable insights.
    """,
)

graph = agent
