# Plan: Add Playwright Integration Tests with GitHub CI

## Goal
Add frontend integration tests using Playwright to verify page rendering, navigation, and key UI interactions. Run in GitHub Actions on every push/PR to `main`.

## Key Constraint
No database or Python agent in CI. Tests focus on frontend-only behavior: static rendering, navigation, UI elements. CopilotKit API calls may fail — tests verify pages load and core UI is present, not agent interactions.

## Changes
- `apps/app/playwright.config.ts` — Playwright config (Chromium only, `github` reporter in CI)
- `apps/app/e2e/homepage.spec.ts` — Hero heading, Generate/Open Report buttons, example switching, textarea pre-fill, demo link, chat sidebar
- `apps/app/e2e/demo.spec.ts` — Split layout, navbar, active link state
- `apps/app/e2e/navigation.spec.ts` — Cross-page navigation via links and navbar
- `apps/app/package.json` — Added `@playwright/test`, `test:e2e` and `test:e2e:ui` scripts
- `.github/workflows/ci.yml` — New `e2e` job (ubuntu, Node 22, Chromium only), uploads HTML report artifact

## Decisions
- Chromium only in CI for speed; can add Firefox/WebKit later
- Separate CI job from `smoke` (no Python/agent needed)
- `webServer` uses `pnpm start` (build runs as prior step in CI)
- Retries (2) in CI to handle flakiness
