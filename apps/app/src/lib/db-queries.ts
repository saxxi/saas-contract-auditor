import { desc, eq, inArray } from "drizzle-orm";
import { db } from "./db";
import {
  accounts as accountsTable,
  accountUsageMetrics,
  accountBudgets,
  accountDocuments,
  auditEvents,
  historicalDeals as historicalDealsTable,
  reports as reportsTable,
} from "./db/schema";
import { Account, AccountDocument, AccountSummary, AuditEvent, PropositionType, Report, UsageMetric } from "@/components/contracts/types";

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

  const budgetRows = await db
    .select({
      id: accountsTable.id,
      context: accountsTable.context,
      mrr: accountBudgets.mrr,
      contract_value: accountBudgets.contract_value,
      tier: accountBudgets.tier,
      renewal_in_days: accountBudgets.renewal_in_days,
      payment_status: accountBudgets.payment_status,
    })
    .from(accountsTable)
    .innerJoin(accountBudgets, eq(accountsTable.id, accountBudgets.account_id))
    .where(inArray(accountsTable.id, ids));

  const metricRows = await db
    .select({
      account_id: accountUsageMetrics.account_id,
      metric_name: accountUsageMetrics.metric_name,
      current_value: accountUsageMetrics.current_value,
      limit_value: accountUsageMetrics.limit_value,
      unit: accountUsageMetrics.unit,
    })
    .from(accountUsageMetrics)
    .where(inArray(accountUsageMetrics.account_id, ids));

  const metricsByAccount = new Map<string, UsageMetric[]>();
  for (const row of metricRows) {
    const metrics = metricsByAccount.get(row.account_id) ?? [];
    metrics.push({
      metric_name: row.metric_name,
      current_value: Number(row.current_value),
      limit_value: Number(row.limit_value),
      unit: row.unit,
    });
    metricsByAccount.set(row.account_id, metrics);
  }

  const docRows = await db
    .select({
      account_id: accountDocuments.account_id,
      document_type: accountDocuments.document_type,
      title: accountDocuments.title,
      content: accountDocuments.content,
      metadata: accountDocuments.metadata,
    })
    .from(accountDocuments)
    .where(inArray(accountDocuments.account_id, ids));

  const docsByAccount = new Map<string, AccountDocument[]>();
  for (const row of docRows) {
    const docs = docsByAccount.get(row.account_id) ?? [];
    docs.push({
      document_type: row.document_type,
      title: row.title,
      content: row.content,
      metadata: row.metadata,
    });
    docsByAccount.set(row.account_id, docs);
  }

  return budgetRows.map((r) => {
    const summary: AccountSummary = {
      id: r.id,
      usage_metrics: metricsByAccount.get(r.id) ?? [],
      budget_report: { mrr: r.mrr, contract_value: r.contract_value, tier: r.tier, renewal_in_days: r.renewal_in_days, payment_status: r.payment_status },
      context: r.context,
    };
    const docs = docsByAccount.get(r.id);
    if (docs && docs.length > 0) {
      summary.documents = docs;
    }
    return summary;
  });
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
  context: string | null;
  usage_metrics: UsageMetric[];
  mrr: number;
  contract_value: number;
  tier: string;
  renewal_in_days: number;
  payment_status: string;
}

async function getAccountFull(accountId: string): Promise<AccountFullRow | undefined> {
  const accountRows = await db
    .select({
      id: accountsTable.id,
      name: accountsTable.name,
      context: accountsTable.context,
      mrr: accountBudgets.mrr,
      contract_value: accountBudgets.contract_value,
      tier: accountBudgets.tier,
      renewal_in_days: accountBudgets.renewal_in_days,
      payment_status: accountBudgets.payment_status,
    })
    .from(accountsTable)
    .innerJoin(accountBudgets, eq(accountsTable.id, accountBudgets.account_id))
    .where(eq(accountsTable.id, accountId));

  if (!accountRows[0]) return undefined;

  const metricRows = await db
    .select({
      metric_name: accountUsageMetrics.metric_name,
      current_value: accountUsageMetrics.current_value,
      limit_value: accountUsageMetrics.limit_value,
      unit: accountUsageMetrics.unit,
    })
    .from(accountUsageMetrics)
    .where(eq(accountUsageMetrics.account_id, accountId));

  const r = accountRows[0];
  return {
    ...r,
    usage_metrics: metricRows.map((m) => ({
      metric_name: m.metric_name,
      current_value: Number(m.current_value),
      limit_value: Number(m.limit_value),
      unit: m.unit,
    })),
  };
}

export async function createReport(accountId: string): Promise<Report | null> {
  const account = await getAccountFull(accountId);
  if (!account) return null;

  const report = generateMockReport(account);
  await db.insert(reportsTable).values(report);
  return report;
}

export async function createReportFromData(
  accountId: string,
  data: { content: string; proposition_type: string; strategic_bucket?: string; success_percent: number; intervene: boolean; priority_score?: number; score_rationale?: string }
): Promise<Report | null> {
  const account = await getAccount(accountId);
  if (!account) return null;

  const now = new Date().toISOString();
  const report: Report = {
    id: crypto.randomUUID(),
    account_id: accountId,
    proposition_type: data.proposition_type as PropositionType,
    strategic_bucket: data.strategic_bucket ?? null,
    success_percent: data.success_percent,
    intervene: data.intervene,
    priority_score: data.priority_score ?? null,
    score_rationale: data.score_rationale ?? null,
    content: data.content,
    generated_at: now,
    created_at: now,
    updated_at: now,
  };
  await db.insert(reportsTable).values(report);
  return report;
}

export async function updateReportContent(
  reportId: string,
  content: string,
  metadata?: { proposition_type?: string; strategic_bucket?: string; success_percent?: number; intervene?: boolean; priority_score?: number; score_rationale?: string }
): Promise<Report | undefined> {
  const now = new Date().toISOString();
  const updates: Record<string, unknown> = { content, updated_at: now };
  if (metadata?.proposition_type) updates.proposition_type = metadata.proposition_type;
  if (metadata?.strategic_bucket) updates.strategic_bucket = metadata.strategic_bucket;
  if (metadata?.success_percent !== undefined) updates.success_percent = metadata.success_percent;
  if (metadata?.intervene !== undefined) updates.intervene = metadata.intervene;
  if (metadata?.priority_score !== undefined) updates.priority_score = metadata.priority_score;
  if (metadata?.score_rationale !== undefined) updates.score_rationale = metadata.score_rationale;
  await db
    .update(reportsTable)
    .set(updates)
    .where(eq(reportsTable.id, reportId));
  const rows = await db.select().from(reportsTable).where(eq(reportsTable.id, reportId));
  return rows[0] as Report | undefined;
}

export async function getHistoricalDeals() {
  const rows = await db.select().from(historicalDealsTable);
  return rows;
}

// --- Webhook upsert/delete functions ---

export async function upsertAccount(id: string, name: string, context?: string | null): Promise<void> {
  const now = new Date().toISOString();
  await db
    .insert(accountsTable)
    .values({ id, name, context: context ?? null, created_at: now, updated_at: now })
    .onConflictDoUpdate({
      target: accountsTable.id,
      set: { name, context: context ?? null, updated_at: now },
    });
}

export async function upsertUsageMetrics(
  accountId: string,
  metrics: { metric_name: string; current_value: number; limit_value: number; unit?: string | null }[]
): Promise<number> {
  const now = new Date().toISOString();
  for (const m of metrics) {
    await db
      .insert(accountUsageMetrics)
      .values({
        id: crypto.randomUUID(),
        account_id: accountId,
        metric_name: m.metric_name,
        current_value: String(m.current_value),
        limit_value: String(m.limit_value),
        unit: m.unit ?? null,
        created_at: now,
        updated_at: now,
      })
      .onConflictDoUpdate({
        target: [accountUsageMetrics.account_id, accountUsageMetrics.metric_name],
        set: {
          current_value: String(m.current_value),
          limit_value: String(m.limit_value),
          unit: m.unit ?? null,
          updated_at: now,
        },
      });
  }
  return metrics.length;
}

export async function upsertBudget(
  accountId: string,
  budget: { mrr: number; contract_value: number; tier: string; renewal_in_days: number; payment_status: string }
): Promise<void> {
  const now = new Date().toISOString();
  await db
    .insert(accountBudgets)
    .values({
      id: crypto.randomUUID(),
      account_id: accountId,
      ...budget,
      created_at: now,
      updated_at: now,
    })
    .onConflictDoUpdate({
      target: accountBudgets.account_id,
      set: { ...budget, updated_at: now },
    });
}

export async function replaceDocuments(
  accountId: string,
  documents: { document_type: string; title: string; content: string; metadata?: string | null }[]
): Promise<number> {
  const now = new Date().toISOString();
  await db.delete(accountDocuments).where(eq(accountDocuments.account_id, accountId));
  if (documents.length === 0) return 0;
  const LARGE_DOC_THRESHOLD = 100 * 1024;
  for (const doc of documents) {
    if (doc.content.length > LARGE_DOC_THRESHOLD) {
      console.warn(`Document "${doc.title}" (${doc.document_type}) for account ${accountId} is ${Math.round(doc.content.length / 1024)}KB`);
    }
  }
  await db.insert(accountDocuments).values(
    documents.map((d) => ({
      id: crypto.randomUUID(),
      account_id: accountId,
      document_type: d.document_type,
      title: d.title,
      content: d.content,
      metadata: d.metadata ?? null,
      created_at: now,
      updated_at: now,
    }))
  );
  return documents.length;
}

export async function getAccountDocuments(accountId: string): Promise<AccountDocument[]> {
  const rows = await db
    .select({
      document_type: accountDocuments.document_type,
      title: accountDocuments.title,
      content: accountDocuments.content,
      metadata: accountDocuments.metadata,
    })
    .from(accountDocuments)
    .where(eq(accountDocuments.account_id, accountId));
  return rows;
}

export async function deleteAccountCascade(accountId: string): Promise<boolean> {
  const account = await db
    .select({ id: accountsTable.id })
    .from(accountsTable)
    .where(eq(accountsTable.id, accountId));
  if (account.length === 0) return false;

  await db.delete(reportsTable).where(eq(reportsTable.account_id, accountId));
  await db.delete(accountDocuments).where(eq(accountDocuments.account_id, accountId));
  await db.delete(accountUsageMetrics).where(eq(accountUsageMetrics.account_id, accountId));
  await db.delete(accountBudgets).where(eq(accountBudgets.account_id, accountId));
  await db.delete(accountsTable).where(eq(accountsTable.id, accountId));
  return true;
}

export async function writeAuditEvent(event: Omit<AuditEvent, "id" | "created_at">): Promise<void> {
  try {
    await db.insert(auditEvents).values({
      id: crypto.randomUUID(),
      ...event,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Failed to write audit event:", err);
  }
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
  const metrics = account.usage_metrics;
  const utilizations = metrics
    .filter((m) => m.limit_value > 0)
    .map((m) => m.current_value / m.limit_value);

  const avgUtilization = utilizations.length > 0
    ? utilizations.reduce((a, b) => a + b, 0) / utilizations.length
    : 0;

  const overAnyLimit = utilizations.some((u) => u > 1);
  const nearAllLimits = utilizations.length > 0 && utilizations.every((u) => u > 0.9);
  const lowUsage = avgUtilization < 0.3;
  const isOverdue = account.payment_status === "overdue";
  const renewingSoon = account.renewal_in_days <= 30;

  const metricsStr = metrics
    .map((m) => `${m.metric_name}: ${m.current_value}/${m.limit_value}${m.unit ? ` ${m.unit}` : ""}`)
    .join(", ");

  let proposition_type: PropositionType;
  let success_percent: number;
  let intervene: boolean;
  let content: string;

  if (overAnyLimit) {
    proposition_type = "requires negotiation";
    success_percent = Math.round(70 + Math.random() * 25);
    intervene = true;
    content = `${account.name} has exceeded contract limits. ${metricsStr}. Renewal in ${account.renewal_in_days} days. Recommend immediate outreach to negotiate upgraded tier from ${account.tier}. Current MRR: $${account.mrr.toLocaleString()}.`;
  } else if (nearAllLimits) {
    proposition_type = "upsell proposition";
    success_percent = Math.round(60 + Math.random() * 30);
    intervene = renewingSoon;
    content = `${account.name} is approaching capacity across all dimensions (avg ${Math.round(avgUtilization * 100)}% utilization). Strong upsell candidate to next tier above ${account.tier}. Current MRR: $${account.mrr.toLocaleString()}, contract value: $${account.contract_value.toLocaleString()}. Renewal in ${account.renewal_in_days} days.`;
  } else if (lowUsage || isOverdue) {
    proposition_type = "poor usage";
    success_percent = Math.round(20 + Math.random() * 40);
    intervene = isOverdue || renewingSoon;
    content = `${account.name} shows low engagement (avg ${Math.round(avgUtilization * 100)}% utilization). ${isOverdue ? "Payment is OVERDUE. " : ""}${metricsStr}. Churn risk is elevated. ${renewingSoon ? `Renewal in ${account.renewal_in_days} days - urgent intervention needed.` : `Renewal in ${account.renewal_in_days} days.`} Consider success engagement program.`;
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
    strategic_bucket: null,
    success_percent,
    intervene,
    priority_score: null,
    score_rationale: null,
    content,
    generated_at: now,
    created_at: now,
    updated_at: now,
  };
}
