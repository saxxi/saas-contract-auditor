# Plan 011: Sales Script Generation

## Problem

Reports tell the account manager **what** the situation is but not **what to say**. Sellers need a ready-to-use conversation framework. The risk: mass standardization kills quality for high-value clients. A $450/mo Starter account and a $300K/yr Enterprise account need fundamentally different conversations.

## Key Design Principle: Make It Loved by Salespeople

The script must feel like something a good sales manager would write for a specific deal, not an AI template. Salespeople will ignore it if it reads like a blog post. What makes them use it:

1. **Sounds like a real person talking** — no analyst jargon ("platform convergence", "AI-driven efficiency mandates"). Use plain operational language. Enterprise conversations are short and direct.
2. **Discovery questions uncover problems, not promote features** — never ask about a feature before understanding the gap. Ask about friction, bottlenecks, process breakdowns first.
3. **Value framing leads with business outcomes, not pricing** — faster invoice processing, fewer manual reconciliations, reduced approval bottlenecks. Cost savings are secondary proof, not the headline.
4. **Objection handlers are short reframes, not essays** — 1-2 sentences max. In a live call you have 10 seconds to respond. No trend lectures.
5. **Social proof is quantified and specific** — "a similar-sized finance team cut invoice reconciliation time by 40%" beats "companies like D-012 made this move". Reference outcomes not deal IDs.
6. **Closing creates real urgency** — tie to procurement timelines, budget cycles, capacity projections. Not soft suggestions.
7. **Script earns credibility** — don't assume the rep has trust. The script should help them build it through benchmarks, examples, and outcome data.
8. **Upsell should feel like problem-solving** — the retention/poor-usage scripts naturally sound more authentic because they lead with empathy. The upsell script must match that tone: "here's a problem heading your way, here's how to get ahead of it."

## Approach: Two-Pass LLM Generation

**Pass 1** (existing): Generate the analytical report (Situation, Complication, Resolution, Metrics, etc.)
**Pass 2** (new): Generate the sales script using the report as context. Separate LLM call keeps token limits manageable.

Script markdown is concatenated to report content before saving. Same DB row, same modal. No schema changes.

LLM decides depth freely based on account data. No rigid tier templates.

## Script Section Structure (markdown output)

```markdown
### Opening Hook
2-3 sentences. Reference a specific operational data point. Conversational, not scripted-sounding.

### Discovery Questions
3-5 numbered questions. Start with friction/bottleneck questions, end with strategic ones.
Never lead toward a feature. Uncover problems first.

### Value Framing
2-4 sentences. Lead with the business outcome (operational improvement), then support with numbers.
Cost savings are supporting evidence, not the headline.
Quantify outcomes: "cut X by Y%", "reduce Z from A days to B days".

### Objection Handlers
4-5 pairs. Format:

**"[Objection in client's natural words]"**
[1-2 sentence reframe. Short. Operational. No trend lectures. Reference a concrete workflow impact or benchmark when possible.]

### Closing Framework
2-3 sentences. Tie urgency to a specific timing driver (renewal date, budget cycle, projected capacity hit).
End with a concrete next step and ask.
```

## What We Took from the Alternative Proposal

The alternative AI's version was better in several specific ways we should adopt:

- **Conversational opener tone**: "Teams usually start feeling that constraint before they actually hit the limit" reads like a real person. Our original "growth signal" language does not.
- **Discovery questions that uncover friction**: "Where in the invoice workflow do things slow down today?" is better than "Which integrations are driving the most value?" because it finds pain first.
- **Value framing structure**: Leading with the operational benefit ("avoiding the mid-year capacity problem"), then supporting with cost math, then adding a business outcome ("advanced reporting your finance team can use for forecasting").
- **Short objection responses**: "The reason most companies upgrade around this point isn't because they're out of seats, it's because expansion approvals start happening under time pressure. This avoids that." is one reframe, no trend language, directly operational.
- **Closing that asks for a specific action**: "Could you send me the names of a few teammates?" is concrete and low-friction.

We did NOT adopt: the "low adoption / churn risk" label (we keep our existing proposition type names), and the slightly longer closing format (we keep it tight).

## Prompt Design Notes

The `SALES_SCRIPT_PROMPT` must enforce:

- **Writing style**: No em dashes. No emojis. No filler phrases. No analyst jargon. Plain spoken business English. Short sentences. Numbers support claims but don't lead them.
- **Anti-patterns to explicitly ban**: "platform convergence", "AI-driven mandates", "market trends suggest", "in today's landscape". Never reference macro trends as persuasion. Always reference operational impact.
- **Discovery question rule**: First 2 questions must be about the client's current workflow friction. Feature questions only after pain is established.
- **Objection handler rule**: Max 2 sentences per rebuttal. Reframe, don't justify. Use a benchmark or workflow example, never a market narrative.
- **Social proof rule**: Quantify outcomes. "A similar-sized team reduced X by Y%" not "companies like D-012".
- **Credibility building**: Include at least one benchmark or operational comparison the rep can cite to establish authority.

---

## Implementation: Exact Code Changes

### Step 1: `apps/agent/src/prompts.py` — Add `SALES_SCRIPT_PROMPT`

Add after `REPORT_UPDATE_PROMPT` (line ~133). Three format placeholders: `{report_content}`, `{account_data}`, `{proposition_type}`.

```python
SALES_SCRIPT_PROMPT = """You are a senior sales manager writing a call script for one specific deal. You have just read the strategy brief below. Now produce a practical conversation framework the account rep can use on the call.

## Strategy Brief
{report_content}

## Account Data
{account_data}

## Proposition Classification
{proposition_type}

## Instructions

Write a sales script in markdown. Adapt depth and length to the account: high-value Enterprise accounts need longer, more strategic scripts with stakeholder awareness. Small Starter accounts need shorter, direct conversations. Do not follow a word count. Let the account's complexity and contract value guide you.

Match the tone to the proposition type:
- "upsell proposition": Problem-solving tone. Lead with a capacity or operational problem heading their way. Frame the upgrade as getting ahead of it, not a sales pitch.
- "requires negotiation": Partnership tone. Acknowledge the tension directly. Show flexibility. Offer multiple paths.
- "poor usage": Empathetic tone. Focus on unlocking value they already paid for. Never accusatory.
- "at capacity": Proactive tone. Position as planning ahead and cost optimization, not crisis.
- "healthy": Lightweight tone. Relationship deepening. Explore future opportunities briefly.

Use these exact sections:

### Opening Hook
2-3 sentences to open the call. Reference one specific operational data point from the account. Sound like a person having a conversation, not reading a script.

### Discovery Questions
3-5 numbered questions. The first 2 MUST be about the client's current workflow friction, bottlenecks, or process pain. Never ask about a product feature before understanding their problem. Order from rapport-building to strategic.

### Value Framing
The core pitch in 2-4 sentences. Lead with the business outcome (operational improvement: faster processing, fewer manual steps, reduced bottlenecks). Support with cost numbers as secondary proof. Include at least one quantified benchmark the rep can cite to build credibility (e.g. "teams your size typically reduce X by Y%").

### Objection Handlers
Exactly 4-5 objection-rebuttal pairs. Format each as:

**"[Likely objection in the client's natural words]"**
[1-2 sentence reframe. Maximum 2 sentences. Reframe the concern, do not over-justify. Reference a concrete workflow impact or operational benchmark. Never reference macro market trends, industry narratives, or analyst language.]

### Closing Framework
2-3 sentences that create urgency through a specific timing driver: renewal date, budget cycle, projected capacity hit date, or procurement window. End with a concrete, low-friction next step and a direct ask.

## Writing rules
- No em dashes. Use commas, periods, or semicolons.
- No emojis.
- Plain spoken business English. Short, direct sentences. Sound like a person, not a document.
- BANNED phrases: "platform convergence", "AI-driven", "market trends suggest", "in today's landscape", "It is worth noting", "Importantly", "Notably", "In essence", "Crucially". Never reference macro trends as persuasion.
- Numbers support claims but do not lead them. "Avoiding a mid-year capacity scramble" before "$X savings".
- Use "you" (addressing the rep) and "they/their" (the client).
- Social proof must quantify outcomes: "similar-sized teams reduced X by Y%" not "companies like D-012 did this".
- Bullet points use - (not *).
"""
```

Also add one line to `REPORT_UPDATE_PROMPT` (after line 120, inside the Instructions section):

```python
# Add after "Only change what the user asked for. Keep everything else intact."
"The report may include a Sales Script section at the end. Preserve it unless the user specifically asks to modify it."
```

### Step 2: `apps/agent/src/report_graph.py` — Add second LLM call

**Import change** (line 18):
```python
# Before:
from src.prompts import REPORT_ANALYZER_PROMPT
# After:
from src.prompts import REPORT_ANALYZER_PROMPT, SALES_SCRIPT_PROMPT
```

**In `process_account` function**, insert between step 4 (parse metadata + body, line 200) and step 5 (save, line 203):

```python
    # 4.5  Generate sales script (second LLM pass)
    script_prompt = SALES_SCRIPT_PROMPT.format(
        report_content=report_body_md,
        account_data=json.dumps(summary, indent=2),
        proposition_type=metadata["proposition_type"],
    )
    script_response = await model.ainvoke(script_prompt)
    script_md = script_response.content.strip()

    # 4.6  Concatenate script to report body
    report_body_md = report_body_md + "\n\n---\n\n" + script_md
```

This runs sequentially within the same `process_account` node. The Send() fan-out still parallelizes across accounts. No new graph nodes needed.

### Step 3: `apps/app/src/components/contracts/report-preview/parse-report.ts` — Add objection parser

Add at end of file (after `parseEvidence`, line ~181):

```typescript
export interface ObjectionHandler {
  objection: string;
  rebuttal: string;
}

export function parseObjectionHandlers(body: string): ObjectionHandler[] {
  const items: ObjectionHandler[] = [];
  const lines = body.split("\n");
  let currentObjection = "";
  let currentRebuttal: string[] = [];

  const flush = () => {
    if (currentObjection) {
      items.push({
        objection: currentObjection,
        rebuttal: currentRebuttal.join(" ").trim(),
      });
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const objMatch = trimmed.match(/^\*\*"(.+?)"\*\*$/);
    if (objMatch) {
      flush();
      currentObjection = objMatch[1];
      currentRebuttal = [];
    } else if (trimmed && currentObjection) {
      currentRebuttal.push(trimmed);
    }
  }
  flush();
  return items;
}
```

### Step 4: `apps/app/src/components/contracts/report-preview/objection-card.tsx` — New file

Follow exact pattern from `evidence-card.tsx` (same color lookup maps, same border-left accent, same `themeColor` prop):

```tsx
import type { ObjectionHandler } from "./parse-report";

interface ObjectionCardProps {
  item: ObjectionHandler;
  themeColor?: string;
}

const borderColors: Record<string, string> = {
  "red-600": "border-red-500 dark:border-red-400",
  "red-500": "border-red-500 dark:border-red-400",
  "blue-600": "border-blue-500 dark:border-blue-400",
  "blue-500": "border-blue-500 dark:border-blue-400",
  "amber-500": "border-amber-500 dark:border-amber-400",
  "orange-500": "border-orange-500 dark:border-orange-400",
  "emerald-600": "border-emerald-500 dark:border-emerald-400",
  "emerald-500": "border-emerald-500 dark:border-emerald-400",
};

const bgColors: Record<string, string> = {
  "red-600": "bg-red-50/50 dark:bg-red-900/10",
  "blue-600": "bg-blue-50/50 dark:bg-blue-900/10",
  "amber-500": "bg-amber-50/50 dark:bg-amber-900/10",
  "orange-500": "bg-orange-50/50 dark:bg-orange-900/10",
  "emerald-600": "bg-emerald-50/50 dark:bg-emerald-900/10",
};

export function ObjectionCard({ item, themeColor = "blue-600" }: ObjectionCardProps) {
  return (
    <div className={`border-l-3 ${borderColors[themeColor] ?? "border-blue-500 dark:border-blue-400"} ${bgColors[themeColor] ?? "bg-blue-50/50 dark:bg-blue-900/10"} rounded-r-lg px-4 py-3`}>
      <div className="text-sm font-medium italic text-zinc-800 dark:text-zinc-200">
        &ldquo;{item.objection}&rdquo;
      </div>
      <div className="text-sm text-zinc-600 dark:text-zinc-400 mt-1.5">
        {item.rebuttal}
      </div>
    </div>
  );
}
```

### Step 5: `apps/app/src/components/contracts/report-preview/report-preview.tsx` — Add section renderers

**Add imports** (after existing imports, line ~14):

```typescript
import { ObjectionCard } from "./objection-card";
// Add to the existing parse-report import:
import {
  // ...existing imports...
  parseObjectionHandlers,
} from "./parse-report";
```

**Add `findSection` lookups** (after `const keyQuestion = findSection("key question");`, line ~57):

```typescript
  const openingHook = findSection("opening hook");
  const discoveryQuestions = findSection("discovery questions");
  const valueFraming = findSection("value framing");
  const objectionHandlers = findSection("objection handlers");
  const closingFramework = findSection("closing framework");
```

**Add to `knownHeadings` set** (line ~59, extend the existing array):

```typescript
  const knownHeadings = new Set(
    [situation, complication, resolution, keyMetrics, evidence, risks, nextSteps, keyQuestion,
     openingHook, discoveryQuestions, valueFraming, objectionHandlers, closingFramework]
      .filter(Boolean)
      .map((s) => s!.heading)
  );
```

**Parse objection data** (after `const evidenceItems`, line ~73):

```typescript
  const objectionItems = objectionHandlers ? parseObjectionHandlers(objectionHandlers.body) : [];
```

**Has script flag** (for the divider — only render if any script section exists):

```typescript
  const hasScript = !!(openingHook || discoveryQuestions || valueFraming || objectionHandlers || closingFramework);
```

**Add 6 new entries to `sectionRenderers`** (after `"key-question"` entry, line ~293):

```typescript
    "sales-script-divider": () =>
      hasScript ? (
        <div key="sales-script-divider" className="pt-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-zinc-300 dark:bg-zinc-600" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-500 font-semibold">
              Sales Script
            </span>
            <div className="flex-1 h-px bg-zinc-300 dark:bg-zinc-600" />
          </div>
        </div>
      ) : null,

    "opening-hook": () =>
      openingHook ? (
        <div key="opening-hook">
          {wrapEditable(openingHook.heading, openingHook, (
            <div>
              <SectionHeader title="Opening Hook" themeColor={theme.accent} />
              <div className="bg-zinc-50 dark:bg-zinc-800/40 rounded-lg px-5 py-4 border border-zinc-200 dark:border-zinc-700">
                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed italic font-serif">
                  {openingHook.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : null,

    "discovery-questions": () =>
      discoveryQuestions ? (
        <div key="discovery-questions">
          {wrapEditable(discoveryQuestions.heading, discoveryQuestions, (
            <div>
              <SectionHeader title="Discovery Questions" themeColor={theme.accent} />
              <ol className="space-y-2 list-decimal list-inside">
                {discoveryQuestions.body
                  .split("\n")
                  .filter((l) => l.trim().match(/^\d+\.\s/))
                  .map((l, i) => (
                    <li key={i} className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed pl-1">
                      {l.replace(/^\d+\.\s*/, "")}
                    </li>
                  ))}
              </ol>
            </div>
          ))}
        </div>
      ) : null,

    "value-framing": () =>
      valueFraming ? (
        <div key="value-framing">
          {wrapEditable(valueFraming.heading, valueFraming, (
            <div>
              <SectionHeader title="Value Framing" themeColor={theme.accent} />
              <div className={`bg-zinc-50 dark:bg-zinc-800/40 border-l-4 ${
                questionBorders[theme.accent] ?? "border-zinc-400"
              } rounded-r-lg px-5 py-4`}>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  {valueFraming.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : null,

    "objection-handlers": () =>
      objectionItems.length > 0 ? (
        <div key="objection-handlers">
          {wrapEditable(objectionHandlers!.heading, objectionHandlers, (
            <div>
              <SectionHeader title="Objection Handlers" themeColor={theme.accent} />
              <div className="space-y-2">
                {objectionItems.map((item, i) => (
                  <ObjectionCard key={i} item={item} themeColor={theme.accent} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null,

    "closing-framework": () =>
      closingFramework ? (
        <div key="closing-framework">
          {wrapEditable(closingFramework.heading, closingFramework, (
            <div>
              <SectionHeader title="Closing Framework" themeColor={theme.accent} />
              <div className="bg-zinc-50 dark:bg-zinc-800/40 rounded-lg px-5 py-4 border border-zinc-200 dark:border-zinc-700">
                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                  {closingFramework.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : null,
```

**Note**: The `"value-framing"` renderer references `questionBorders` from `key-question.tsx`. Either import it, or inline the same color map. Simpler: duplicate a small `accentBorders` map locally since it's just 5 entries.

### Step 6: `apps/app/src/components/contracts/report-preview/theme-config.ts` — Extend sectionOrder

Append 6 slugs to each `sectionOrder` array. The exact lines to edit:

**Line 25** (`requires negotiation`):
```
sectionOrder: ["executive-summary", "risks", "action-callout", "resolution", "metrics", "evidence", "next-steps", "key-question", "sales-script-divider", "opening-hook", "discovery-questions", "value-framing", "objection-handlers", "closing-framework"],
```

**Line 40** (`upsell proposition`):
```
sectionOrder: ["executive-summary", "action-callout", "resolution", "metrics", "evidence", "risks", "next-steps", "key-question", "sales-script-divider", "opening-hook", "discovery-questions", "value-framing", "objection-handlers", "closing-framework"],
```

**Line 55** (`poor usage`):
```
sectionOrder: ["executive-summary", "action-callout", "metrics", "resolution", "evidence", "risks", "next-steps", "key-question", "sales-script-divider", "opening-hook", "discovery-questions", "value-framing", "objection-handlers", "closing-framework"],
```

**Line 70** (`at capacity`):
```
sectionOrder: ["executive-summary", "action-callout", "metrics", "resolution", "evidence", "risks", "next-steps", "key-question", "sales-script-divider", "opening-hook", "discovery-questions", "value-framing", "objection-handlers", "closing-framework"],
```

**Line 85** (`healthy`):
```
sectionOrder: ["executive-summary", "resolution", "metrics", "evidence", "risks", "next-steps", "key-question", "sales-script-divider", "opening-hook", "discovery-questions", "value-framing", "objection-handlers", "closing-framework"],
```

### Step 7: Update `REPORT_UPDATE_PROMPT` in `apps/agent/src/prompts.py`

Insert after "Only change what the user asked for. Keep everything else intact." (line 131):

```
The report may include a Sales Script section at the end. Preserve it unless the user specifically asks to modify it.
```

---

## Files Summary

| File | Type | Change |
|------|------|--------|
| `apps/agent/src/prompts.py` | Edit | Add `SALES_SCRIPT_PROMPT` (~50 lines), add 1 line to `REPORT_UPDATE_PROMPT` |
| `apps/agent/src/report_graph.py` | Edit | Add import, add ~10 lines in `process_account` after line 200 |
| `apps/app/src/components/contracts/report-preview/parse-report.ts` | Edit | Add `ObjectionHandler` interface + `parseObjectionHandlers` function (~30 lines) |
| `apps/app/src/components/contracts/report-preview/objection-card.tsx` | **New** | ~45 lines, follows `evidence-card.tsx` pattern exactly |
| `apps/app/src/components/contracts/report-preview/report-preview.tsx` | Edit | Add imports, 5 findSection calls, extend knownHeadings, add 6 sectionRenderers entries (~100 lines) |
| `apps/app/src/components/contracts/report-preview/theme-config.ts` | Edit | Append 6 slugs to each of 5 sectionOrder arrays |

## Backward Compatibility

- Existing reports without script sections render normally. All new renderers null-check their section (`openingHook ?`) before rendering.
- The `"sales-script-divider"` only renders when `hasScript` is true.
- The parser already handles unknown `### ` headings via the fallback renderer, so even without the frontend changes, script sections would appear as raw markdown.

## Verification

1. Generate report for AC-14 (Enterprise, $25K MRR) — expect longer script, outcome-focused value framing, procurement-aware closing
2. Generate report for AC-37 (Starter, $450 MRR, poor usage) — expect short empathetic script, adoption-focused
3. Check objection handlers: max 2 sentences each, no macro trend language, operational reframes only
4. Check discovery questions: first 2 about workflow friction, not features
5. Verify existing reports (without scripts) still render correctly
6. Verify inline editing works on script sections
