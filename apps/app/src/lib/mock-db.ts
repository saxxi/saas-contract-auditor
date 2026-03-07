import { desc, eq, inArray } from "drizzle-orm";
import { db } from "./db";
import {
  accounts as accountsTable,
  accountActiveUsers,
  accountInvoicingUsages,
  accountIntegrationsUsages,
  accountBudgets,
  reports as reportsTable,
} from "./db/schema";
import { Account, AccountSummary, PropositionType, Report } from "@/components/contracts/types";

export async function getAccounts(): Promise<Account[]> {
  const rows = await db.select({ id: accountsTable.id, name: accountsTable.name }).from(accountsTable);
  return rows;
}

export async function getAccount(id: string): Promise<Account | undefined> {
  const rows = await db
    .select({ id: accountsTable.id, name: accountsTable.name })
    .from(accountsTable)
    .where(eq(accountsTable.id, id));
  return rows[0];
}

export async function getAccountSummaries(ids: string[]): Promise<AccountSummary[]> {
  if (ids.length === 0) return [];
  const rows = await db
    .select({
      id: accountsTable.id,
      active_users: accountActiveUsers.active_users,
      seat_limit: accountActiveUsers.seat_limit,
      monthly_invoices: accountInvoicingUsages.monthly_invoices,
      invoice_limit: accountInvoicingUsages.invoice_limit,
      active_integrations: accountIntegrationsUsages.active_integrations,
      integration_limit: accountIntegrationsUsages.integration_limit,
      mrr: accountBudgets.mrr,
      contract_value: accountBudgets.contract_value,
      tier: accountBudgets.tier,
      renewal_in_days: accountBudgets.renewal_in_days,
      payment_status: accountBudgets.payment_status,
    })
    .from(accountsTable)
    .innerJoin(accountActiveUsers, eq(accountsTable.id, accountActiveUsers.account_id))
    .innerJoin(accountInvoicingUsages, eq(accountsTable.id, accountInvoicingUsages.account_id))
    .innerJoin(accountIntegrationsUsages, eq(accountsTable.id, accountIntegrationsUsages.account_id))
    .innerJoin(accountBudgets, eq(accountsTable.id, accountBudgets.account_id))
    .where(inArray(accountsTable.id, ids));
  return rows.map((r) => ({
    id: r.id,
    active_users_report: { active_users: r.active_users, seat_limit: r.seat_limit },
    invoicing_usage_report: { monthly_invoices: r.monthly_invoices, invoice_limit: r.invoice_limit },
    integrations_usage_report: { active_integrations: r.active_integrations, integration_limit: r.integration_limit },
    budget_report: { mrr: r.mrr, contract_value: r.contract_value, tier: r.tier, renewal_in_days: r.renewal_in_days, payment_status: r.payment_status },
  }));
}

export async function getReports(): Promise<Report[]> {
  const rows = await db.select().from(reportsTable).orderBy(desc(reportsTable.generated_at));
  return rows as Report[];
}

export async function getReport(accountId: string): Promise<Report | undefined> {
  const rows = await db
    .select()
    .from(reportsTable)
    .where(eq(reportsTable.account_id, accountId))
    .orderBy(desc(reportsTable.generated_at))
    .limit(1);
  return rows[0] as Report | undefined;
}

interface AccountFullRow {
  id: string;
  name: string;
  active_users: number;
  seat_limit: number;
  monthly_invoices: number;
  invoice_limit: number;
  active_integrations: number;
  integration_limit: number;
  mrr: number;
  contract_value: number;
  tier: string;
  renewal_in_days: number;
  payment_status: string;
}

async function getAccountFull(accountId: string): Promise<AccountFullRow | undefined> {
  const rows = await db
    .select({
      id: accountsTable.id,
      name: accountsTable.name,
      active_users: accountActiveUsers.active_users,
      seat_limit: accountActiveUsers.seat_limit,
      monthly_invoices: accountInvoicingUsages.monthly_invoices,
      invoice_limit: accountInvoicingUsages.invoice_limit,
      active_integrations: accountIntegrationsUsages.active_integrations,
      integration_limit: accountIntegrationsUsages.integration_limit,
      mrr: accountBudgets.mrr,
      contract_value: accountBudgets.contract_value,
      tier: accountBudgets.tier,
      renewal_in_days: accountBudgets.renewal_in_days,
      payment_status: accountBudgets.payment_status,
    })
    .from(accountsTable)
    .innerJoin(accountActiveUsers, eq(accountsTable.id, accountActiveUsers.account_id))
    .innerJoin(accountInvoicingUsages, eq(accountsTable.id, accountInvoicingUsages.account_id))
    .innerJoin(accountIntegrationsUsages, eq(accountsTable.id, accountIntegrationsUsages.account_id))
    .innerJoin(accountBudgets, eq(accountsTable.id, accountBudgets.account_id))
    .where(eq(accountsTable.id, accountId));
  return rows[0];
}

export async function createReport(accountId: string): Promise<Report | null> {
  const account = await getAccountFull(accountId);
  if (!account) return null;

  const report = generateMockReport(account);
  await db.insert(reportsTable).values(report);
  return report;
}

export async function updateReportContent(reportId: string, content: string): Promise<Report | undefined> {
  const now = new Date().toISOString();
  await db
    .update(reportsTable)
    .set({ content, updated_at: now })
    .where(eq(reportsTable.id, reportId));
  const rows = await db.select().from(reportsTable).where(eq(reportsTable.id, reportId));
  return rows[0] as Report | undefined;
}

export async function createReports(accountIds: string[]): Promise<Report[]> {
  const created: Report[] = [];
  for (const id of accountIds.slice(0, 5)) {
    const report = await createReport(id);
    if (report) created.push(report);
  }
  return created;
}

function generateMockReport(account: AccountFullRow): Report {
  const userUtilization = account.active_users / account.seat_limit;
  const invoiceUtilization = account.monthly_invoices / account.invoice_limit;
  const integrationUtilization = account.active_integrations / account.integration_limit;
  const avgUtilization = (userUtilization + invoiceUtilization + integrationUtilization) / 3;

  const overAnyLimit =
    userUtilization > 1 || invoiceUtilization > 1 || integrationUtilization > 1;
  const nearAllLimits =
    userUtilization > 0.9 && invoiceUtilization > 0.9 && integrationUtilization > 0.9;
  const lowUsage = avgUtilization < 0.3;
  const isOverdue = account.payment_status === "overdue";
  const renewingSoon = account.renewal_in_days <= 30;

  let proposition_type: PropositionType;
  let success_percent: number;
  let intervene: boolean;
  let content: string;

  if (overAnyLimit) {
    proposition_type = "requires negotiation";
    success_percent = Math.round(70 + Math.random() * 25);
    intervene = true;
    content = `${account.name} has exceeded contract limits. Users: ${account.active_users}/${account.seat_limit}, Invoices: ${account.monthly_invoices}/${account.invoice_limit}, Integrations: ${account.active_integrations}/${account.integration_limit}. Renewal in ${account.renewal_in_days} days. Recommend immediate outreach to negotiate upgraded tier from ${account.tier}. Current MRR: $${account.mrr.toLocaleString()}.`;
  } else if (nearAllLimits) {
    proposition_type = "upsell proposition";
    success_percent = Math.round(60 + Math.random() * 30);
    intervene = renewingSoon;
    content = `${account.name} is approaching capacity across all dimensions (avg ${Math.round(avgUtilization * 100)}% utilization). Strong upsell candidate to next tier above ${account.tier}. Current MRR: $${account.mrr.toLocaleString()}, contract value: $${account.contract_value.toLocaleString()}. Renewal in ${account.renewal_in_days} days.`;
  } else if (lowUsage || isOverdue) {
    proposition_type = "poor usage";
    success_percent = Math.round(20 + Math.random() * 40);
    intervene = isOverdue || renewingSoon;
    content = `${account.name} shows low engagement (avg ${Math.round(avgUtilization * 100)}% utilization). ${isOverdue ? "Payment is OVERDUE. " : ""}Users: ${account.active_users}/${account.seat_limit}. Churn risk is elevated. ${renewingSoon ? `Renewal in ${account.renewal_in_days} days - urgent intervention needed.` : `Renewal in ${account.renewal_in_days} days.`} Consider success engagement program.`;
  } else if (avgUtilization > 0.85) {
    proposition_type = "at capacity";
    success_percent = Math.round(50 + Math.random() * 30);
    intervene = renewingSoon;
    content = `${account.name} is nearing capacity (avg ${Math.round(avgUtilization * 100)}% utilization) on ${account.tier} plan. Good candidate for proactive tier discussion. MRR: $${account.mrr.toLocaleString()}. Renewal in ${account.renewal_in_days} days.`;
  } else {
    proposition_type = "healthy";
    success_percent = Math.round(40 + Math.random() * 30);
    intervene = false;
    content = `${account.name} is healthy with balanced usage (avg ${Math.round(avgUtilization * 100)}% utilization) on ${account.tier} plan. MRR: $${account.mrr.toLocaleString()}. No immediate action required. Renewal in ${account.renewal_in_days} days.`;
  }

  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    account_id: account.id,
    proposition_type,
    success_percent,
    intervene,
    content,
    generated_at: now,
    created_at: now,
    updated_at: now,
  };
}
