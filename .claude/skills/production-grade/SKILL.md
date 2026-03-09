---
name: production-grade
description: Review changed code for production readiness - SOLID, best practices, linting, security, resilience. Use when writing or reviewing significant code changes.
argument-hint: "[file or area to review]"
---

# Production Grade Code Review

Review code for production readiness. Check $ARGUMENTS (or all staged/recent changes if none specified).

## Checklist

### SOLID Principles
- Single Responsibility: each class/module/function does one thing
- Open/Closed: extend via composition, not modification
- Liskov Substitution: subtypes must be substitutable
- Interface Segregation: no fat interfaces, depend on what you use
- Dependency Inversion: depend on abstractions, inject dependencies

### Clean Code
- Meaningful names (no abbreviations, no generic `data`/`info`/`result`)
- Functions < 20 lines, max 3 params
- No dead code, no commented-out code
- DRY: extract shared logic, but don't over-abstract
- Cyclomatic complexity: flag functions with > 4 branches

### Error Handling
- No bare `except:` / `catch {}` — always specific
- Errors propagated with context (wrap, don't swallow)
- Fail fast at boundaries, graceful internally
- Async: all promises/awaiouts handled, no fire-and-forget

### Security (OWASP Top 10)
- Input validation at system boundaries
- No SQL/command injection (parameterized queries, no f-strings in SQL)
- No secrets in code or logs
- Auth/authz checks present where needed
- XSS prevention (sanitized outputs)

### Performance
- No N+1 queries or unbounded loops
- Pagination on list endpoints
- Connections pooled, resources cleaned up
- No blocking calls in async code

### Python Specific
- Type hints on all public functions
- Pydantic models for external data
- `async`/`await` used consistently (no sync in async context)
- Imports organized (stdlib / third-party / local)
- f-strings preferred over `.format()` or `%`

### TypeScript/React Specific
- Strict TypeScript: no `any`, no `as` casts unless justified
- React: no inline object/function props causing re-renders
- Effects have proper dependency arrays
- Server vs client components used correctly (Next.js)

### Testing
- New logic has tests or is covered by existing tests
- Edge cases handled (empty, null, boundary values)
- No flaky patterns (sleep, time-dependent, order-dependent)

### Resilience (this project)
- LLM calls use `invoke_with_retry()` from `src/resilience.py`
- Fan-out respects semaphore (`MAX_CONCURRENT_LLM`)
- Pydantic validation on all LLM structured output
- HTTP clients use shared pooled `httpx.AsyncClient`

## Output Format

For each issue found:
1. **File:line** — what's wrong
2. **Principle violated** — which checklist item
3. **Fix** — concrete suggestion

End with a summary: total issues by severity (critical / warning / nit).
