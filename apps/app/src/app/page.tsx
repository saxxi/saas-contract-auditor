"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LandingReportDialog } from "@/components/landing-report-dialog";
import { useAgent } from "@copilotkit/react-core/v2";
import { CopilotChat } from "@copilotkit/react-core/v2";
import type { PropositionType } from "@/components/contracts/types";

const EXAMPLE_1 = `CLIENT ACCOUNT DATASET

Client Overview
- Company: Northstar Logistics GmbH
- Industry: Mid-size European logistics and freight management
- Headquarters: Hamburg, Germany
- Employees: ~420
- SaaS Use Case: Workflow automation for shipment tracking, client reporting, and internal task orchestration
- Customer since: April 2023
- Account Tier: Professional Plan (custom contract)

Contract Details
- Contract Start: April 1, 2024
- Contract End: March 31, 2027
- Contract Length: 3 years
- Annual Contract Value (ACV): EUR 72,000
- Billing: Annual upfront
- Renewal Type: Auto-renew unless cancelled 90 days prior
- Discount Applied: 20% off list price for multi-year commitment
- Price Protection: Locked pricing until end of contract

Plan Limits (Professional Plan - Custom)
- Included Users: 150 seats
- Included API Calls: 8,000,000 per month
- Included Workflows: 2,000 active workflows
- Included Data Storage: 2 TB
- Included Automation Runs: 4,000,000 per month
- Support: Standard (24h response SLA)
- Integrations: Up to 25 active integrations

Overage Pricing
- Additional Users: EUR 22 / user / month
- Additional API Calls: EUR 0.0009 per call
- Additional Workflow Runs: EUR 0.002 per run
- Additional Storage: EUR 120 / TB / month
- Premium Support Upgrade: EUR 18,000 / year

Current Usage (Last 90-Day Average)
- Active Users: 138
- Total Provisioned Users: 147
- Monthly API Calls: ~10,900,000
- Active Workflows: 1,860
- Monthly Automation Runs: ~5,700,000
- Data Storage Used: 2.6 TB
- Active Integrations: 21

Overage Summary (Monthly Avg)
- API Overage: ~2,900,000 calls
- Automation Run Overage: ~1,700,000 runs
- Storage Overage: ~0.6 TB
- User Overage: none (still within included seats)

Estimated Monthly Overage Charges
- API Overage Cost: ~EUR 2,610
- Automation Run Overage Cost: ~EUR 3,400
- Storage Overage Cost: ~EUR 72
- Total Estimated Monthly Overage: ~EUR 6,082

Feature Adoption
- Workflow Automation: Heavy usage
- Reporting Module: Moderate usage
- AI Prediction Add-on: Not purchased
- Advanced Analytics Module: Not used
- Audit Compliance Module: Not used

Growth Trends (Last 12 Months)
- Users: +18%
- API Calls: +42%
- Automation Runs: +55%
- Storage: +36%
- Workflows Created: +27%

Operational Signals
- Support Tickets (last 6 months): 14
- Average CSAT: 8.1 / 10
- Escalations: 1 (performance issue in January)
- Product Feedback: Requests for better reporting dashboards
- Churn Risk Score (internal model): Medium-Low

Financial Indicators
- Effective Monthly Spend (including overages): ~EUR 12,082
- Contracted Monthly Equivalent: EUR 6,000
- Gross Margin Tier for Account: Medium
- Payment History: Always on time

Internal Notes from Customer Success
- Client expansion likely as they onboard two additional regional teams in 2026
- Engineering team heavily relies on API
- Finance team has asked twice for predictable billing instead of variable overage
- Procurement tends to negotiate aggressively near renewal
- Competitor evaluated in late 2024 but not pursued

Upcoming Events
- QBR scheduled: May 12, 2026
- Product roadmap demo requested: yes
- Contract midpoint review: April 2026`;

const EXAMPLE_2 = JSON.stringify(
  {
    account: "Velocity Logistics",
    contract: {
      tier: "Growth",
      mrr: 4500,
      contract_value: 54000,
      renewal_in_days: 5,
      payment_status: "current",
    },
    usage: {
      active_users: 105,
      seat_limit: 100,
      monthly_invoices: 510,
      invoice_limit: 500,
      active_integrations: 12,
      integration_limit: 10,
    },
    history: [
      {
        type: "upsell",
        date: "2024-06",
        from: "Starter",
        to: "Growth",
        delta_mrr: 2800,
      },
      {
        type: "renewal",
        date: "2025-01",
        outcome: "renewed",
        notes: "12-month term, no objections",
      },
    ],
  },
  null,
  2
);

const CACHED_NORTHSTAR_REPORT: {
  content: string;
  proposition_type: PropositionType;
  success_percent: number;
  intervene: boolean;
} = {
  proposition_type: "requires negotiation",
  success_percent: 85,
  intervene: true,
  content: `### Situation

Northstar Logistics GmbH is on a Professional Plan (custom contract) with an ACV of EUR 72,000 (EUR 6,000/month contracted). The 3-year contract runs from April 2024 to March 2027 with auto-renewal. Current usage exceeds contracted limits on three dimensions: API calls at ~10.9M vs 8M limit (136%), automation runs at ~5.7M vs 4M limit (143%), and storage at 2.6 TB vs 2 TB limit (130%). Users remain within limits at 138/150 active seats. The client is generating an estimated EUR 6,082/month in overage charges, doubling their effective spend to ~EUR 12,082/month.

### Complication

Northstar's overage charges now exceed their base contract value, creating a situation where the client pays twice what they budgeted. Their finance team has explicitly asked for predictable billing twice. With a QBR scheduled for May 2026 and contract midpoint review in April 2026, this is the window to restructure before procurement engages in aggressive renewal negotiations. Growth trends are accelerating (+42% API, +55% automation runs), meaning overages will only increase. If left unaddressed, the billing unpredictability becomes a churn catalyst despite strong product adoption.

### Resolution

| | Option A: Enterprise Restructure | Option B: Custom Overage Cap |
|---|---|---|
| Action | Migrate to Enterprise tier: 300 seats, 15M API calls, 8M automation runs, 5 TB storage | Keep Professional plan, add overage cap at EUR 4,000/month with annual true-up |
| Upside | ACV to EUR 108,000 (+50%), predictable billing, 18-month growth headroom | ACV to EUR 96,000 (+33%), minimal disruption, addresses finance team concern |
| Risk | Procurement may push back on 50% increase at midpoint | Overages may exceed cap within 6 months given growth trajectory |
| Timeline | Present at April midpoint review, close before May QBR | Present at May QBR as interim solution |

Option A is recommended. Northstar's growth trajectory and the finance team's explicit request for predictable billing make a clean restructure more attractive than a band-aid overage cap. The 50% ACV increase is justified by the fact that they're already spending at that level through overages.

### Key Metrics

| Metric | Value | Limit | Utilization |
|--------|-------|-------|-------------|
| Active users | 138 | 150 | 92% |
| Monthly API calls | 10,900,000 | 8,000,000 | 136% |
| Automation runs | 5,700,000 | 4,000,000 | 143% |
| Data storage | 2.6 TB | 2 TB | 130% |
| Active workflows | 1,860 | 2,000 | 93% |
| Active integrations | 21 | 25 | 84% |
| MRR (contracted) | EUR 6,000 | -- | -- |
| MRR (effective w/ overages) | EUR 12,082 | -- | -- |
| Payment | on time | -- | -- |

### Evidence from Similar Engagements

- D-003: Mid-market logistics client with 140% API overage restructured to Enterprise at contract midpoint. ACV increased 45% but client CSAT improved from 7.8 to 9.1 due to billing predictability. Relevant because Northstar shares the same pain point.
- D-011: European manufacturing account with aggressive procurement team. Presenting restructure at QBR rather than renewal avoided adversarial negotiation dynamics. Closing rate 78% when framed as "cost optimization" vs 42% when framed as "upsell."
- D-007: Client with heavy automation usage (5M+ runs/month) who delayed restructure. Overages hit EUR 9,000/month within 8 months, triggering executive escalation and competitive RFP. Early intervention at Northstar avoids this trajectory.

### Risks and Mitigants

| Risk | Likelihood | Mitigant |
|------|-----------|----------|
| Procurement rejects 50% ACV increase | Medium | Frame as cost reduction: EUR 108K/year vs current run-rate of EUR 145K/year (contracted + overages) |
| Client uses midpoint review to push for discount | High | Lead with usage data showing they get 2x value vs contract; anchor on per-unit economics |
| Competitor re-evaluation triggered | Low | CSAT at 8.1, deep API integration, 21 active integrations create high switching costs |
| Two new regional teams inflate usage beyond Enterprise limits | Medium | Build expansion clause into Enterprise contract with pre-negotiated rates |

### Next Steps

| # | Action | Owner | Deadline |
|---|--------|-------|----------|
| 1 | Prepare usage trend analysis and cost comparison (contracted vs actual spend) | Account Executive | T-14 days (before April midpoint) |
| 2 | Schedule pre-QBR call with Northstar's finance lead to discuss billing predictability | Customer Success | T-10 days |
| 3 | Draft Enterprise restructure proposal with expansion clause for regional teams | Revenue Operations | T-7 days |
| 4 | Align internally on discount authority for procurement pushback scenarios | Sales Leadership | T-7 days |

### Key Question

"Your team's actual usage tells us you've outgrown your current plan. If we could lock in predictable billing that covers your real usage and the two new regional teams, would that be worth discussing at the midpoint review?"

---

### Opening Hook

"I've been looking at your usage data ahead of our midpoint review, and I wanted to flag something important: your team is getting tremendous value from the platform, but your billing structure no longer reflects how you actually use it. I think we can fix that in a way that saves you money compared to your current run-rate."

### Discovery Questions

1. How is the onboarding timeline looking for the two new regional teams you mentioned?
2. Has the finance team's concern about variable billing come up again since their last request?
3. Are there features on our roadmap (like the AI Prediction add-on or Advanced Analytics) that your team has been waiting to evaluate?
4. What does your procurement process look like for a mid-contract restructure vs waiting for renewal?

### Value Framing

Northstar is currently spending EUR 145,000 annually when you include overages, but only budgeted for EUR 72,000. An Enterprise restructure at EUR 108,000 actually saves the company EUR 37,000 per year compared to the current run-rate, while providing headroom for the two regional teams coming online in 2026. This is not an upsell; it is a cost optimization that aligns billing with reality.

### Objection Handlers

- "We're locked into a 3-year contract, why change now?" -> "You're right that the contract runs until 2027. The reason to act now is that your overages are already doubling your effective cost. Restructuring today locks in a lower total cost than what you're currently paying, and gives you predictability for the remaining 18 months."
- "A 50% increase is too aggressive." -> "I understand. Let me show it differently: you're spending EUR 12,082/month today. The Enterprise plan would be EUR 9,000/month. That's actually a 25% reduction in what you're currently paying, with room to grow."
- "We need to run this by procurement." -> "Absolutely. I can prepare a cost comparison document that shows the savings vs current run-rate. In our experience, procurement teams respond well when they see it framed as cost optimization rather than expansion."

### Closing Framework

Present the Enterprise restructure at the April midpoint review as a cost optimization story (EUR 145K current run-rate vs EUR 108K proposed). Lead with the finance team's billing predictability request as the trigger. If procurement engages, provide the per-unit economics comparison showing Enterprise is cheaper on every dimension. Fallback to the overage cap (Option B) only if procurement requires a phased approach, with a built-in review clause at 6 months to revisit Enterprise migration.`,
};

const CACHED_VELOCITY_REPORT: typeof CACHED_NORTHSTAR_REPORT = {
  proposition_type: "requires negotiation",
  success_percent: 90,
  intervene: true,
  content: `### Situation

Velocity Logistics is on the Growth tier at $4,500 MRR ($54,000 annual contract value). The account has exceeded all three usage limits: 105/100 seats (105%), 510/500 monthly invoices (102%), and 12/10 integrations (120%). Payment status is current. Contract renewal is in 5 days.

### Complication

Velocity is operating above contracted capacity on every dimension, creating both a compliance risk and an immediate revenue opportunity. With renewal in 5 days, failure to renegotiate means either auto-renewing at below-market rates while absorbing overage costs, or risking a churn event if the client feels constrained. The 2024 upsell from Starter to Growth shows willingness to invest, but the current overages suggest the Growth tier no longer fits their trajectory.

### Resolution

| | Option A: Enterprise Upgrade | Option B: Growth+ Custom |
|---|---|---|
| Action | Migrate to Enterprise tier with expanded limits (200 seats, 1000 invoices, 25 integrations) | Negotiate custom Growth add-on: +20 seats, +100 invoices, +5 integrations |
| Upside | $8,500 MRR (+89%), locks in 18-month term, headroom for 12 months | $6,200 MRR (+38%), faster close, lower perceived risk |
| Risk | Sticker shock may delay signing past renewal | Bandaid solution, likely back at capacity in 6 months |
| Timeline | Close before renewal (5 days) | Close before renewal (5 days) |

Option A is recommended. Velocity's growth trajectory (Starter to Growth in 2024, now exceeding all Growth limits) suggests Enterprise is the natural next step. The 89% MRR uplift justifies a dedicated negotiation effort before renewal.

### Key Metrics

| Metric | Value | Limit | Utilization |
|--------|-------|-------|-------------|
| Active users | 105 | 100 | 105% |
| Monthly invoices | 510 | 500 | 102% |
| Active integrations | 12 | 10 | 120% |
| MRR | $4,500 | -- | -- |
| Contract (annual) | $54,000 | -- | -- |
| Renewal | 5d | -- | -- |
| Payment | current | -- | -- |

### Evidence from Similar Engagements

- D-001: Growth-tier client at 112% seat utilization upgraded to Enterprise within 2 weeks of renewal. Achieved 95% MRR uplift with 18-month commitment. This supports an aggressive upgrade timeline for Velocity.
- D-005: Similar overage situation but account manager waited past renewal. Client auto-renewed at Growth rate, then complained about overage fees. Took 3 months to renegotiate. Delay cost $12K in unrealized revenue.
- D-008: Client exceeded integration limits first, then seats. Enterprise migration included professional services bundle. Same growth pattern as Velocity, which suggests bundling onboarding support with the upgrade.

### Risks and Mitigants

| Risk | Likelihood | Mitigant |
|------|-----------|----------|
| Client balks at 89% price increase | Medium | Anchor on per-unit cost reduction; Enterprise is cheaper per seat/invoice |
| 5-day window too tight to close | High | Offer 30-day bridge at current rate while Enterprise contract is finalized |
| Competitor evaluation triggered by price discussion | Low | Lead with ROI data: their usage proves the product is mission-critical |

### Next Steps

| # | Action | Owner | Deadline |
|---|--------|-------|----------|
| 1 | Schedule executive call with Velocity decision-maker | Account Executive | T-4 days |
| 2 | Prepare Enterprise vs Growth+ comparison one-pager | Solutions Consultant | T-3 days |
| 3 | Draft custom pricing proposal with 18-month term incentive | Revenue Operations | T-3 days |
| 4 | Fallback: prepare 30-day bridge agreement | Legal | T-2 days |

### Key Question

"What would your team's workflow look like if you had no limits on seats, invoices, or integrations, and how much of that vision can we unlock with the right plan?"

---

### Opening Hook

"I noticed something important as your renewal approaches: your team has outgrown every limit on your current plan. That's actually a great sign for your business, and I want to make sure your contract reflects that growth rather than holding you back."

### Discovery Questions

1. How has your team's usage of our platform evolved since the upgrade to Growth last June?
2. Are there additional team members or departments waiting for seats that you haven't been able to onboard?
3. What new integrations would you prioritize if the limit weren't a constraint?
4. How critical is the invoicing volume to your monthly operations? Would a disruption impact your clients?

### Value Framing

Velocity's growth from Starter to Growth, and now beyond Growth limits, demonstrates that our platform is deeply embedded in your operations. Enterprise isn't just more capacity; it's removing the ceiling on your team's productivity. At the per-seat level, Enterprise actually costs 15% less than your current overage-adjusted rate. We're proposing to invest in your trajectory with an 18-month term that locks in today's pricing.

### Objection Handlers

- "The price increase is too steep." -> "I understand the concern. Let me reframe: you're currently paying $4,500/mo for 100 seats, but using 105. Enterprise at $8,500 gives you 200 seats, so that's $42.50/seat vs your current effective rate of $42.86/seat. You're actually paying less per unit while getting room to grow."
- "We need more time to decide." -> "Absolutely. I can extend your current terms for 30 days while we finalize the Enterprise agreement. That way there's no pressure on the renewal deadline and your team's service isn't interrupted."
- "We're evaluating competitors." -> "That's smart due diligence. One thing worth considering: your team is running 510 invoices/month and 12 integrations through our platform. The switching cost and ramp-up time for any alternative would likely exceed a full quarter of productivity."

### Closing Framework

Propose the Enterprise upgrade with an 18-month commitment and first-month discount as a signing incentive. If resistance, fall back to the Growth+ custom add-on as an interim step with a 6-month review clause for Enterprise migration. Secure agreement in principle before the 5-day renewal window closes; use the 30-day bridge only if decision-maker availability is the blocker.`,
};

const CACHED_REPORTS = { 1: CACHED_NORTHSTAR_REPORT, 2: CACHED_VELOCITY_REPORT };

export default function HomePage() {
  const { agent } = useAgent();
  const [activeExample, setActiveExample] = useState<1 | 2>(1);
  const [textareaValue, setTextareaValue] = useState(EXAMPLE_1);
  const [reportData, setReportData] = useState<typeof CACHED_NORTHSTAR_REPORT | null>(CACHED_NORTHSTAR_REPORT);
  const [showDialog, setShowDialog] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleExampleSwitch = (example: 1 | 2) => {
    setActiveExample(example);
    setTextareaValue(example === 1 ? EXAMPLE_1 : EXAMPLE_2);
    setReportData(CACHED_REPORTS[example]);
    setShowDialog(false);
  };

  // Watch agent state for demo_report
  useEffect(() => {
    if (agent.state?.demo_report) {
      setReportData(agent.state.demo_report);
      setShowDialog(true);
      setIsGenerating(false);
    }
  }, [agent.state?.demo_report]);

  // Reset generating state when agent stops
  useEffect(() => {
    if (!agent.isRunning && isGenerating && agent.state?.demo_report) {
      setIsGenerating(false);
    }
  }, [agent.isRunning, isGenerating, agent.state?.demo_report]);

  const handleGenerate = () => {
    setIsGenerating(true);
    agent.setMessages([]);
    agent.addMessage({
      role: "user",
      id: crypto.randomUUID(),
      content: `Analyze this account data and generate a report:\n${textareaValue}`,
    });
    try {
      if (!agent.isRunning) agent.runAgent();
    } catch {
      // Thread may already be running
    }
  };

  const handleOpenReport = () => {
    setShowDialog(true);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-6xl mx-auto px-8 py-12">
        {/* Section 1: Hero */}
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 mb-3">
          Are your SaaS clients still on the right contract?
        </h1>
        <p className="text-lg text-zinc-500 dark:text-zinc-400 mb-10 max-w-2xl">
          Compare contract limits with real usage across hundreds of accounts and identify where to upsell, renegotiate, or protect revenue.
        </p>

        {/* Section 2: Two columns */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6 mb-12">
          {/* Column 1: CTA + example buttons + textarea */}
          <div className="flex flex-col gap-4">
            {/* Row 1: CTA */}
            <div>
              <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-100 mb-2">
                See an example in action!
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                We&apos;ve pre-filled a sample account. Hit Generate to see the consulting-grade
                report our AI produces, or paste your own data.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer disabled:cursor-wait"
                >
                  {isGenerating ? "Generating..." : "Generate Report"}
                </button>
                {reportData && (
                  <button
                    onClick={handleOpenReport}
                    className="px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm font-semibold rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                  >
                    Open Report
                  </button>
                )}
              </div>
            </div>

            {/* Row 2: Example buttons + textarea */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                  Account data
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExampleSwitch(1)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                      activeExample === 1
                        ? "border border-zinc-400 dark:border-zinc-500 text-zinc-800 dark:text-zinc-200"
                        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                    }`}
                  >
                    Example 1
                  </button>
                  <button
                    onClick={() => handleExampleSwitch(2)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                      activeExample === 2
                        ? "border border-zinc-400 dark:border-zinc-500 text-zinc-800 dark:text-zinc-200"
                        : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300"
                    }`}
                  >
                    Example 2
                  </button>
                </div>
              </div>
              <textarea
                value={textareaValue}
                onChange={(e) => { setTextareaValue(e.target.value); setReportData(null); setShowDialog(false); }}
                className="w-full flex-1 min-h-48 font-mono text-xs bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-lg p-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-zinc-700 dark:text-zinc-300"
                spellCheck={false}
              />
            </div>
          </div>

          {/* Column 2: Chat */}
          <div className="min-h-[350px] max-h-[520px] overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-lg px-3">
            <CopilotChat />
          </div>
        </div>

        {/* Section 3: Secondary CTA */}
        <div className="border-t border-zinc-200 dark:border-zinc-800 pt-10 text-center">
          <h3 className="text-lg font-semibold text-zinc-800 dark:text-zinc-100 mb-2">
            Want to see the full experience?
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5">
            Explore multi-account analysis, opportunity finding, and interactive report editing.
          </p>
          <Link
            href="/demo"
            className="inline-block px-8 py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-semibold rounded-lg hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
          >
            See the full demo &rarr;
          </Link>
        </div>
      </div>

      {/* Report dialog */}
      {reportData && showDialog && (
        <LandingReportDialog
          accountName={activeExample === 1 ? "Northstar Logistics GmbH" : "Velocity Logistics"}
          report={reportData}
          onClose={() => setShowDialog(false)}
        />
      )}
    </div>
  );
}
