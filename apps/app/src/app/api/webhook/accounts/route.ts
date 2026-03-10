import { NextResponse } from "next/server";
import { withWebhookAuth } from "@/lib/auth-middleware";
import {
  upsertAccount,
  upsertUsageMetrics,
  upsertBudget,
  replaceDocuments,
  writeAuditEvent,
} from "@/lib/db-queries";

interface WebhookAccountPayload {
  account_key: string;
  name: string;
  context?: string | null;
  usage_metrics?: { metric_name: string; current_value: number; limit_value: number; unit?: string | null }[];
  budget?: { mrr: number; contract_value: number; tier: string; renewal_in_days: number; payment_status: string };
  documents?: { document_type: string; title: string; content: string; metadata?: string | null }[];
}

/** POST /api/webhook/accounts - Upsert account + related data. See docs/api/openapi.yaml */
export const POST = withWebhookAuth(async (_req, body) => {
  let payload: WebhookAccountPayload;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!payload.account_key || typeof payload.account_key !== "string") {
    return NextResponse.json({ error: "account_key is required and must be a string" }, { status: 400 });
  }
  if (!payload.name || typeof payload.name !== "string") {
    return NextResponse.json({ error: "name is required and must be a string" }, { status: 400 });
  }

  try {
    const accountId = payload.account_key;
    const upserted = { metrics: 0, budget: false, documents: 0 };

    await upsertAccount(accountId, payload.name, payload.context);

    if (payload.usage_metrics && payload.usage_metrics.length > 0) {
      upserted.metrics = await upsertUsageMetrics(accountId, payload.usage_metrics);
    }

    if (payload.budget) {
      await upsertBudget(accountId, payload.budget);
      upserted.budget = true;
    }

    if (payload.documents) {
      upserted.documents = await replaceDocuments(accountId, payload.documents);
    }

    writeAuditEvent({
      event_type: "webhook.account.upserted",
      actor: "webhook:hmac",
      resource_type: "account",
      resource_id: accountId,
      detail: JSON.stringify(upserted),
    });

    return NextResponse.json({ account_key: accountId, upserted }, { status: 201 });
  } catch (err) {
    console.error("Webhook account upsert failed:", err);
    return NextResponse.json({ error: "Failed to upsert account" }, { status: 500 });
  }
});
