import { pgTable, text, integer, boolean } from "drizzle-orm/pg-core";

export const accounts = pgTable("accounts", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull(),
});

export const accountActiveUsers = pgTable("account_active_users", {
  id: text("id").primaryKey(),
  account_id: text("account_id")
    .notNull()
    .unique()
    .references(() => accounts.id),
  active_users: integer("active_users").notNull(),
  seat_limit: integer("seat_limit").notNull(),
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull(),
});

export const accountInvoicingUsages = pgTable("account_invoicing_usages", {
  id: text("id").primaryKey(),
  account_id: text("account_id")
    .notNull()
    .unique()
    .references(() => accounts.id),
  monthly_invoices: integer("monthly_invoices").notNull(),
  invoice_limit: integer("invoice_limit").notNull(),
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull(),
});

export const accountIntegrationsUsages = pgTable("account_integrations_usages", {
  id: text("id").primaryKey(),
  account_id: text("account_id")
    .notNull()
    .unique()
    .references(() => accounts.id),
  active_integrations: integer("active_integrations").notNull(),
  integration_limit: integer("integration_limit").notNull(),
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull(),
});

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

export const reports = pgTable("reports", {
  id: text("id").primaryKey(),
  account_id: text("account_id")
    .notNull()
    .references(() => accounts.id),
  proposition_type: text("proposition_type").notNull(),
  success_percent: integer("success_percent").notNull(),
  intervene: boolean("intervene").notNull(),
  content: text("content").notNull(),
  generated_at: text("generated_at").notNull(),
  created_at: text("created_at").notNull(),
  updated_at: text("updated_at").notNull(),
});
