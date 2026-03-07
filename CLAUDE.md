# Contracts Auditor

We need to create a simple application which allow our saas users to check which of their clients are eligible for upsell proposition, requires contract renegotiation (eg. approached usage limits), likelyhood of churning.

Right side: chatbox, always open
Left side:
  - small table list with "selected" accounts (shows 10 and scrolls if more are needed)
  - larger table (fill the rest of vertical space) with accounts list
  - each table has a checkbox, when marked to 'goes on top', eg.

    ```
    Selected accounts
    |            | Report     | id   | name        | proposition type     | % of success | intervene? |
    |------------|------|------|-------------|----------------------|--------------|------------|
    | [checkbox] | Generated [open] | AC-1 | TechCorp    | requires negotiation | 90           | yes        |
    | [checkbox] | Generated [open] | AC-2 | ABC ltd     | upsell proposition   | 30           |            |
    | [checkbox] | [Generate...] | AC-3 | QQQ Company | poor usage           | 70           |            |
    |------------|------|------|-------------|----------------------|--------------|------------|

    [Generate missing plans]


    Accounts
    |            | id   | name        |
    |------------|------|-------------|
    | [checkbox] | AC-4 | RRR Corp    |
    | [checkbox] | AC-5 | TTT     |
    | [checkbox] | AC-6 | UUU |

    [Find Opportunities]  <- asks the agent to analyze unselected accounts and auto-select the best opportunities
    ```

  - On "selected accounts"
    - User can generate report
    - User can open generated reports

      Once open we can see the generated report, chat with llm about it and update the report with user adjustments

      eg. upon opening account id `AC-2` we should see:
        - left side: a dialog opening with the proposition eg. "we should really upsell because ..."
        - right side: the chat should 'update' and understand we're now talking about that specific contract and we need to allow user to interact with the contract.

  - On "accounts" (lower table)
    - "Find Opportunities" button: sends unselected accounts data to the agent
    - Agent analyzes for upsell, renegotiation, churn risk
    - Agent calls `select_accounts` frontend tool to auto-select the best opportunities
    - Agent explains reasoning in the chat

# HOW TO OPERATE

- Always read and keep updated `docs/lessons_learned` so we know why we took a decision instead of another.
  - each line should be a bullet point, no fillers, be succint eg. "- we decided to use library X as we first tried library Y but found difficulties in doing [...]" or `- when testing if a python feature works use script scripts/script.py`
- Always generate and update plans in `docs/plans` before writing any code
- use `docs/material` folder as source

# WHEN SESSION IS CONCLUDED

- cleanup `docs/lessons_learned` (remove what will never be useful in future)
- Ensure `CLAUDE.md` small, concise, useful
