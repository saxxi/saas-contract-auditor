# Contracts Auditor

**[View the project website](https://saxxi.github.io/contracts_auditor/)**

An AI-powered tool that helps SaaS companies identify revenue opportunities hidden in their client contracts. It compares contract limits against actual usage data to surface accounts that are ready for upsell, need renegotiation, or show signs of churn risk.

Built for account executives, customer success teams, and revenue operations at any B2B SaaS company managing a portfolio of client contracts.

### Homepage
![Homepage](docs/images/app_homepage.png)

### Demo Dashboard
![Demo Dashboard](docs/images/main_screen.png)

### Report Detail
![Report Detail](docs/images/report_popup.png)

## What It Does

- **Paste or load account data** (usage metrics, contract terms, billing info) and get a consulting-grade report with strategic recommendations
- **Analyze accounts in bulk** across your portfolio to find the best opportunities
- **Generate reports** that include situation analysis, risk assessment, objection handlers, and next steps
- **Chat with the AI** about any account or report to refine the analysis
- **Edit reports interactively** before sharing with your team

Reports classify each account into categories like "upsell proposition", "requires negotiation", "poor usage", "at capacity", or "healthy" with a success probability score and a flag for whether immediate intervention is needed.

## Tech Stack

- **Frontend**: Next.js 16 (Turbopack), React 19, Tailwind CSS 4, Recharts
- **AI Agent**: LangGraph (Python) with CopilotKit integration
- **Database**: PostgreSQL with Drizzle ORM
- **Monorepo**: Turborepo with pnpm

## Prerequisites

- Node.js 18+
- Python 3.8+
- PostgreSQL
- pnpm
- OpenAI API key

## Getting Started

1. Install dependencies:
```bash
pnpm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your keys:
```
OPENAI_API_KEY=your-openai-api-key
DATABASE_URL=postgresql://postgres@localhost:5432/contracts_auditor
```

3. Set up the database:
```bash
psql -U postgres -c "CREATE DATABASE contracts_auditor"
pnpm --filter @repo/app db:push
pnpm --filter @repo/app db:seed
```

4. Start the development server:
```bash
pnpm dev
```

This starts both the Next.js UI (frontend) and the LangGraph agent (backend) concurrently.

## Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start both UI and agent servers |
| `pnpm dev:app` | Start only the Next.js UI |
| `pnpm dev:agent` | Start only the LangGraph agent |
| `pnpm build` | Build for production |
| `pnpm --filter @repo/app db:push` | Push schema to database |
| `pnpm --filter @repo/app db:seed` | Seed accounts and historical deals |

## Project Structure

```
apps/
  app/          # Next.js frontend
  agent/        # LangGraph Python agent
docs/           # Plans, lessons learned, reference material
```

## License

Dual-licensed under AGPL-3.0 and a commercial license. See [LICENSE](LICENSE) and [LICENSE-COMMERCIAL.md](LICENSE-COMMERCIAL.md) for details.

## Troubleshooting

**Agent connection issues**: Make sure the LangGraph agent is running on port 8000 and your OpenAI API key is set correctly.

**Database reset**:
```bash
psql -U postgres -c "DROP DATABASE contracts_auditor"
psql -U postgres -c "CREATE DATABASE contracts_auditor"
pnpm --filter @repo/app db:push
pnpm --filter @repo/app db:seed
```

**Python dependencies**:
```bash
cd apps/agent && pip install -e .
```
