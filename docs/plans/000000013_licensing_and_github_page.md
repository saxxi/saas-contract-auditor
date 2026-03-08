# Plan 013: AGPL-3.0 Dual Licensing + GitHub Landing Page

## Goal
Establish a dual-license model (AGPL-3.0 + Commercial) and create a professional GitHub landing page.

## Licensing Strategy
- **Open source**: AGPL-3.0 — strongest copyleft, forces SaaS users to open-source or buy commercial license
- **Commercial**: Perpetual (one-time fee), two tiers:
  - Personal/Startup: $299 — single product use
  - Enterprise: $999 — unlimited products + resale rights
- Contact: a.saxena.email@gmail.com

## Files to Create/Modify
1. `LICENSE` — Replace MIT with full AGPL-3.0 text
2. `LICENSE-COMMERCIAL.md` — Commercial license terms, pricing, contact
3. `docs/index.html` — Single-page GitHub Pages landing site (professional, content-rich)

## Landing Page Structure
- Hero section with project name + tagline
- Key features (AI-powered contract analysis, report generation, sales scripts)
- How it works (visual flow)
- Pricing section (open source vs commercial tiers)
- Tech stack badges
- Contact/CTA
- Pure HTML+CSS (no build step, served via GitHub Pages from `/docs`)

## Notes
- GitHub Pages can serve from `/docs` folder on main branch — no separate gh-pages branch needed
- Landing page is static HTML, no dependencies
