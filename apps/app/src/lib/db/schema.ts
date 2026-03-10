import { pgTable, text, integer, boolean, numeric, unique } from "drizzle-orm/pg-core";

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  context: text("context"),
  tenant_id: text("tenant_id"),
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull(),
});

export const accountUsageMetrics = pgTable(
  "account_usage_metrics",
  {
    id: text("id").primaryKey(),
    account_id: text("account_id")
      .notNull()
      .references(() => accounts.id),
    metric_name: text("metric_name").notNull(),
    current_value: numeric("current_value").notNull(),
    limit_value: numeric("limit_value").notNull(),
    unit: text("unit"),
    created_at: text("created_at").notNull(),
    updated_at: text("updated_at").notNull(),
  },
  (t) => [unique().on(t.account_id, t.metric_name)]
);

export const accountBudgets = pgTable("account_budgets", {
  id: text("id").primaryKey(),
  account_id: text("account_id")
    .notNull()
    .unique()
    .references(() => accounts.id),
  mrr: integer("mrr").notNull(),
  contract_value: integer("contract_value").notNull(),
  tier: text("tier").notNull(),
  renewal_in_days: integer("renewal_in_days").notNull(),
  payment_status: text("payment_status").notNull(),
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull(),
});

export const historicalDeals = pgTable("historical_deals", {
  id: text("id").primaryKey(),
  deal_id: text("deal_id").notNull().unique(),
  industry: text("industry").notNull(),
  company_size: text("company_size").notNull(),
  original_tier: text("original_tier").notNull(),
  proposed_tier: text("proposed_tier").notNull(),
  deal_size_usd: integer("deal_size_usd").notNull(),
  pitch_type: text("pitch_type").notNull(),
  pitch_summary: text("pitch_summary").notNull(),
  main_objections: text("main_objections").notNull(),
  objection_handling: text("objection_handling").notNull(),
  outcome: text("outcome").notNull(),
  time_to_close_days: integer("time_to_close_days").notNull(),
  notes: text("notes").notNull(),
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull(),
});

export const accountDocuments = pgTable(
  "account_documents",
  {
    id: text("id").primaryKey(),
    account_id: text("account_id")
      .notNull()
      .references(() => accounts.id),
    document_type: text("document_type").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    metadata: text("metadata"),
    created_at: text("created_at").notNull(),
    updated_at: text("updated_at").notNull(),
  },
  (t) => [unique().on(t.account_id, t.document_type, t.title)]
);

export const auditEvents = pgTable("audit_events", {
  id: text("id").primaryKey(),
  event_type: text("event_type").notNull(),
  actor: text("actor").notNull(),
  resource_type: text("resource_type").notNull(),
  resource_id: text("resource_id").notNull(),
  detail: text("detail"),
  created_at: text("created_at").notNull(),
});

export const reports = pgTable("reports", {
  id: text("id").primaryKey(),
  account_id: text("account_id")
    .notNull()
    .references(() => accounts.id),
  proposition_type: text("proposition_type").notNull(),
  strategic_bucket: text("strategic_bucket"),
  success_percent: integer("success_percent").notNull(),
  intervene: boolean("intervene").notNull(),
  priority_score: integer("priority_score"),
  score_rationale: text("score_rationale"),
  content: text("content").notNull(),
  generated_at: text("generated_at").notNull(),
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull(),
});
