import { Account, PropositionType, Report } from "./types";

export function generateMockReport(account: Account): Report {
  const { active_users_report, invoicing_usage_report, integrations_usage_report, budget_report } = account;

  const userUtilization = active_users_report.active_users / active_users_report.seat_limit;
  const invoiceUtilization = invoicing_usage_report.monthly_invoices / invoicing_usage_report.invoice_limit;
  const integrationUtilization = integrations_usage_report.active_integrations / integrations_usage_report.integration_limit;
  const avgUtilization = (userUtilization + invoiceUtilization + integrationUtilization) / 3;

  const overAnyLimit =
    userUtilization > 1 || invoiceUtilization > 1 || integrationUtilization > 1;
  const nearAllLimits =
    userUtilization > 0.9 && invoiceUtilization > 0.9 && integrationUtilization > 0.9;
  const lowUsage = avgUtilization < 0.3;
  const isOverdue = budget_report.payment_status === "overdue";
  const renewingSoon = budget_report.renewal_in_days <= 30;

  let propositionType: PropositionType;
  let successPercent: number;
  let intervene: boolean;
  let content: string;

  if (overAnyLimit) {
    propositionType = "requires negotiation";
    successPercent = Math.round(70 + Math.random() * 25);
    intervene = true;
    content = `${account.name} has exceeded contract limits. Users: ${active_users_report.active_users}/${active_users_report.seat_limit}, Invoices: ${invoicing_usage_report.monthly_invoices}/${invoicing_usage_report.invoice_limit}, Integrations: ${integrations_usage_report.active_integrations}/${integrations_usage_report.integration_limit}. Renewal in ${budget_report.renewal_in_days} days. Recommend immediate outreach to negotiate upgraded tier from ${budget_report.tier}. Current MRR: $${budget_report.mrr.toLocaleString()}.`;
  } else if (nearAllLimits) {
    propositionType = "upsell proposition";
    successPercent = Math.round(60 + Math.random() * 30);
    intervene = renewingSoon;
    content = `${account.name} is approaching capacity across all dimensions (avg ${Math.round(avgUtilization * 100)}% utilization). Strong upsell candidate to next tier above ${budget_report.tier}. Current MRR: $${budget_report.mrr.toLocaleString()}, contract value: $${budget_report.contract_value.toLocaleString()}. Renewal in ${budget_report.renewal_in_days} days.`;
  } else if (lowUsage || isOverdue) {
    propositionType = "poor usage";
    successPercent = Math.round(20 + Math.random() * 40);
    intervene = isOverdue || renewingSoon;
    content = `${account.name} shows low engagement (avg ${Math.round(avgUtilization * 100)}% utilization). ${isOverdue ? "Payment is OVERDUE. " : ""}Users: ${active_users_report.active_users}/${active_users_report.seat_limit}. Churn risk is elevated. ${renewingSoon ? `Renewal in ${budget_report.renewal_in_days} days - urgent intervention needed.` : `Renewal in ${budget_report.renewal_in_days} days.`} Consider success engagement program.`;
  } else if (nearAllLimits || avgUtilization > 0.85) {
    propositionType = "at capacity";
    successPercent = Math.round(50 + Math.random() * 30);
    intervene = renewingSoon;
    content = `${account.name} is nearing capacity (avg ${Math.round(avgUtilization * 100)}% utilization) on ${budget_report.tier} plan. Good candidate for proactive tier discussion. MRR: $${budget_report.mrr.toLocaleString()}. Renewal in ${budget_report.renewal_in_days} days.`;
  } else {
    propositionType = "healthy";
    successPercent = Math.round(40 + Math.random() * 30);
    intervene = false;
    content = `${account.name} is healthy with balanced usage (avg ${Math.round(avgUtilization * 100)}% utilization) on ${budget_report.tier} plan. MRR: $${budget_report.mrr.toLocaleString()}. No immediate action required. Renewal in ${budget_report.renewal_in_days} days.`;
  }

  return {
    accountId: account.id,
    propositionType,
    successPercent,
    intervene,
    content,
  };
}
