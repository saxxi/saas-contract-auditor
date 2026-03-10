import dotenv from "dotenv";
dotenv.config({ path: "../../.env" });
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  accounts,
  accountUsageMetrics,
  accountBudgets,
  accountDocuments,
  auditEvents,
  historicalDeals,
  reports,
} from "./schema";
import { accountSeedData } from "../../components/contracts/accounts-data";
import { historicalDealsData } from "./historical-deals-data";

function timestamps() {
  const now = new Date().toISOString();
  return { created_at: now, updated_at: now };
}

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const client = postgres(connectionString);
  const db = drizzle(client);

  console.log("Clearing existing data...");
  await db.delete(reports);
  await db.delete(accountDocuments);
  await db.delete(accountUsageMetrics);
  await db.delete(accountBudgets);
  await db.delete(accounts);
  await db.delete(auditEvents);
  await db.delete(historicalDeals);

  console.log(`Seeding ${accountSeedData.length} accounts...`);
  await db.insert(accounts).values(
    accountSeedData.map((a) => ({ id: a.id, name: a.name, context: a.context, ...timestamps() }))
  );

  console.log("Seeding account_usage_metrics...");
  const metricRows = accountSeedData.flatMap((a) =>
    a.usage_metrics.map((m) => ({
      id: crypto.randomUUID(),
      account_id: a.id,
      metric_name: m.metric_name,
      current_value: String(m.current_value),
      limit_value: String(m.limit_value),
      unit: m.unit,
      ...timestamps(),
    }))
  );
  await db.insert(accountUsageMetrics).values(metricRows);

  console.log("Seeding account_budgets...");
  await db.insert(accountBudgets).values(
    accountSeedData.map((a) => ({
      id: crypto.randomUUID(),
      account_id: a.id,
      mrr: a.budget_report.mrr,
      contract_value: a.budget_report.contract_value,
      tier: a.budget_report.tier,
      renewal_in_days: a.budget_report.renewal_in_days,
      payment_status: a.budget_report.payment_status,
      ...timestamps(),
    }))
  );

  console.log(`Seeding ${historicalDealsData.length} historical deals...`);
  await db.insert(historicalDeals).values(
    historicalDealsData.map((d) => ({
      id: crypto.randomUUID(),
      ...d,
      ...timestamps(),
    }))
  );

  console.log("Seed complete.");
  await client.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
