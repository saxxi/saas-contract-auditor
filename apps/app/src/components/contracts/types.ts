export interface Account {
  id: string;
  name: string;
}

export interface UsageMetric {
  metric_name: string;
  current_value: number;
  limit_value: number;
  unit: string | null;
}

export interface AccountDocument {
  document_type: string;
  title: string;
  content: string;
  metadata?: string | null;
}

export interface AccountSummary {
  id: string;
  usage_metrics: UsageMetric[];
  budget_report: { mrr: number; contract_value: number; tier: string; renewal_in_days: number; payment_status: string };
  context: string | null;
  documents?: AccountDocument[];
}

export interface AuditEvent {
  id: string;
  event_type: string;
  actor: string;
  resource_type: string;
  resource_id: string;
  detail: string | null;
  created_at: string;
}

export type PropositionType =
  | "upsell proposition"
  | "requires negotiation"
  | "poor usage"
  | "at capacity"
  | "healthy";

export interface Report {
  id: string;
  account_id: string;
  proposition_type: PropositionType;
  strategic_bucket: string | null;
  success_percent: number;
  intervene: boolean;
  priority_score: number | null;
  score_rationale: string | null;
  content: string;
  generated_at: string;
  created_at: string;
  updated_at: string;
}
