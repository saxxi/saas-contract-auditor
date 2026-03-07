export interface Account {
  id: string;
  name: string;
}

export interface AccountSummary {
  id: string;
  active_users_report: { active_users: number; seat_limit: number };
  invoicing_usage_report: { monthly_invoices: number; invoice_limit: number };
  integrations_usage_report: { active_integrations: number; integration_limit: number };
  budget_report: { mrr: number; contract_value: number; tier: string; renewal_in_days: number; payment_status: string };
}

export type PropositionType =
  | "upsell proposition"
  | "requires negotiation"
  | "poor usage"
  | "at capacity"
  | "healthy";

export interface Report {
  account_id: string;
  proposition_type: PropositionType;
  success_percent: number;
  intervene: boolean;
  content: string;
}
