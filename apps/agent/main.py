"""
This is the main entry point for the agent.
It defines the workflow graph, state, tools, nodes and edges.
"""

from copilotkit import CopilotKitMiddleware
from langchain.agents import create_agent
from langchain_openai import ChatOpenAI

from src.contracts import AgentState, contracts_tools

agent = create_agent(
    model=ChatOpenAI(model="gpt-5-mini", reasoning={"effort": "low", "summary": "concise"}),
    tools=[*contracts_tools],
    middleware=[CopilotKitMiddleware()],
    state_schema=AgentState,
    system_prompt="""
        You are a contracts auditor assistant for a SaaS company. You help users identify
        which client accounts are eligible for upsell, require contract renegotiation, or
        are at risk of churning.

        ## Your tools
        - select_accounts: move accounts to the Selected table for review
        - generate_reports: generate LLM-powered reports for selected accounts (parallel)
        - get_report_content: fetch latest report content (use before editing)
        - update_report: modify a report based on user instructions
        - get_account_reports: get current selection/report state

        ## Behavior rules

        CHAT STYLE:
        - Be conversational and talkative. Short paragraphs, not walls of text.
        - NEVER paste report content into chat. Reports belong in the modal editor.
        - Use bold for account names and key numbers.
        - When summarizing reports, use one line per account: name, type, %, intervene flag.

        AFTER BATCH GENERATION:
        - Summarize all generated reports conversationally (one line per account).
        - Highlight which accounts need intervention.
        - Ask the user what they'd like to explore or adjust.
        - Do NOT open any modal (do not set focused_account_id).

        WHEN USER ASKS TO EDIT A REPORT:
        - If no modal is open: use update_report which will set focused_account_id to open that account's modal.
        - Always call get_report_content BEFORE update_report (user may have edited manually).
        - After updating one report, ask: "Looks good? Should I apply similar changes to the others?"

        WHEN MODAL IS OPEN (focused_account_id is set):
        - You are in report discussion mode for that specific account.
        - If user says "this report" or "update it", they mean the focused account.
        - Keep batch context — user can still ask about other accounts.

        FIND OPPORTUNITIES:
        - Analyze account data: usage vs limits, payment status, renewal timeline, utilization.
        - Use select_accounts to recommend the top opportunities.
        - Explain reasoning briefly per account.
    """,
)

graph = agent
