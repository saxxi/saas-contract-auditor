import dotenv from "dotenv";
dotenv.config({ path: "../../.env" });
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  accounts,
  accountActiveUsers,
  accountInvoicingUsages,
  accountIntegrationsUsages,
  accountBudgets,
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
  await db.delete(accountActiveUsers);
  await db.delete(accountInvoicingUsages);
  await db.delete(accountIntegrationsUsages);
  await db.delete(accountBudgets);
  await db.delete(accounts);
  await db.delete(historicalDeals);

  console.log(`Seeding ${accountSeedData.length} accounts...`);
  await db.insert(accounts).values(
    accountSeedData.map((a) => ({ id: a.id, name: a.name, ...timestamps() }))
  );

  console.log("Seeding account_active_users...");
  await db.insert(accountActiveUsers).values(
    accountSeedData.map((a) => ({
      id: crypto.randomUUID(),
      account_id: a.id,
      active_users: a.active_users_report.active_users,
      seat_limit: a.active_users_report.seat_limit,
      ...timestamps(),
    }))
  );

  console.log("Seeding account_invoicing_usages...");
  await db.insert(accountInvoicingUsages).values(
    accountSeedData.map((a) => ({
      id: crypto.randomUUID(),
      account_id: a.id,
      monthly_invoices: a.invoicing_usage_report.monthly_invoices,
      invoice_limit: a.invoicing_usage_report.invoice_limit,
      ...timestamps(),
    }))
  );

  console.log("Seeding account_integrations_usages...");
  await db.insert(accountIntegrationsUsages).values(
    accountSeedData.map((a) => ({
      id: crypto.randomUUID(),
      account_id: a.id,
      active_integrations: a.integrations_usage_report.active_integrations,
      integration_limit: a.integrations_usage_report.integration_limit,
      ...timestamps(),
    }))
  );

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
