# Plan 024: Error Boundary + HTML Metadata (DONE)

Two small improvements: React error boundaries and proper `<head>` metadata.

## 1. Error Boundary

### Create `components/error-boundary.tsx`

React class component (error boundaries require class components) that:
- Catches render errors in children
- Shows a fallback UI with "Something went wrong" message and a "Try again" button
- Logs errors to console (no external error service for now)

### Where to wrap

- Around `ContractsCanvas` in `demo/page.tsx` (most complex component tree)
- Around `{children}` in `layout.tsx` (catch-all for any page crash)
- Around `CopilotChat` in both pages (third-party component, could throw)

### Fallback UI

Minimal: centered message with retry button that calls `window.location.reload()`. Styled with existing Tailwind classes. No external dependencies.

## 2. HTML Metadata

### Add `metadata` export to `layout.tsx`

Next.js supports a `metadata` export for `<head>` tags. Since layout is `"use client"`, use `<head>` directly in the JSX or extract metadata to a separate server layout wrapper.

Simplest approach: add a `<head>` block inside `<html>`:

```tsx
<html lang="en">
  <head>
    <title>Contract Auditor</title>
    <meta name="description" content="AI-powered SaaS contract analysis. Identify upsell opportunities, renegotiation needs, and churn risks." />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" href="/favicon.ico" />
  </head>
  <body>...</body>
</html>
```

### Per-page titles (optional, low priority)

- Home: "Contract Auditor"
- Demo: "Demo | Contract Auditor"

This requires either per-page `<title>` via `useEffect` or converting layout to server component. Low priority since the app is a SPA-style demo.

## Implementation Order

1. Add `<head>` metadata to `layout.tsx` (5 min)
2. Create `error-boundary.tsx` (10 min)
3. Wrap components in error boundaries (5 min)
