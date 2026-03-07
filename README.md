# Contracts Auditor

This is a starter template for building AI agents using [LangGraph](https://www.langchain.com/langgraph) and [CopilotKit](https://copilotkit.ai). It provides a modern Next.js application with an integrated LangGraph agent to be built on top of.

https://github.com/user-attachments/assets/47761912-d46a-4fb3-b9bd-cb41ddd02e34

## Prerequisites

- Node.js 18+
- Python 3.8+
- Any of the following package managers:
  - [pnpm](https://pnpm.io/installation) (recommended)
  - npm
  - [yarn](https://classic.yarnpkg.com/lang/en/docs/install/#mac-stable)
  - [bun](https://bun.sh/)
- OpenAI API Key (for the LangGraph agent)

> **Note:** This repository ignores lock files (package-lock.json, yarn.lock, pnpm-lock.yaml, bun.lockb) to avoid conflicts between different package managers. Each developer should generate their own lock file using their preferred package manager. After that, make sure to delete it from the .gitignore.

## Getting Started

1. Install dependencies:
```bash
pnpm install
```

2. Set up your environment variables:
```bash
cp .env.example .env
```

Then edit the `.env` file and add your OpenAI API key:

```bash
OPENAI_API_KEY=your-openai-api-key-here
DATABASE_URL=postgresql://postgres@localhost:5432/contracts_auditor
```

3. Set up the database (requires PostgreSQL running locally):
```bash
# Create the database
psql -U postgres -c "CREATE DATABASE contracts_auditor"

# Push the schema (creates tables)
pnpm --filter @repo/app db:push

# Seed with 50 accounts + 6 historical deals
pnpm --filter @repo/app db:seed
```

4. Start the development server:
```bash
pnpm dev
```

This will start both the UI and agent servers concurrently.

## Available Scripts

- `pnpm dev` - Starts both UI and agent servers in development mode
- `pnpm dev:app` - Starts only the Next.js UI server
- `pnpm dev:agent` - Starts only the LangGraph agent server
- `pnpm build` - Builds the Next.js application for production
- `pnpm lint` - Runs ESLint for code linting

### Database Scripts (run from `apps/app`)

- `pnpm --filter @repo/app db:push` - Push schema to database (dev)
- `pnpm --filter @repo/app db:generate` - Generate migrations
- `pnpm --filter @repo/app db:seed` - Seed accounts and historical deals

## Documentation

The main UI component is in `src/app/page.tsx`. You can:
- Modify the theme colors and styling
- Add new frontend actions
- Customize the CopilotKit sidebar appearance

## 📚 Documentation

- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/) - Learn more about LangGraph and its features
- [CopilotKit Documentation](https://docs.copilotkit.ai) - Explore CopilotKit's capabilities

## Contributing

Feel free to submit issues and enhancement requests! This starter is designed to be easily extensible.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Troubleshooting

### Agent Connection Issues
If you see "I'm having trouble connecting to my tools", make sure:
1. The LangGraph agent is running on port 8000
2. Your OpenAI API key is set correctly
3. Both servers started successfully

### Database Issues
If you need to reset the database:
```bash
psql -U postgres -c "DROP DATABASE contracts_auditor"
psql -U postgres -c "CREATE DATABASE contracts_auditor"
pnpm --filter @repo/app db:push
pnpm --filter @repo/app db:seed
```

### Python Dependencies
If you encounter Python import errors, install the agent dependencies:
```bash
cd apps/agent && pip install -e .
```
