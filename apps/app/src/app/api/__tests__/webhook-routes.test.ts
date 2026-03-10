/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHmac } from "crypto";

const SECRET = "test-webhook-secret";

function sign(body: string, secret: string = SECRET): string {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}

// Mock db-queries
vi.mock("@/lib/db-queries", () => ({
  upsertAccount: vi.fn().mockResolvedValue(undefined),
  upsertUsageMetrics: vi.fn().mockResolvedValue(1),
  upsertBudget: vi.fn().mockResolvedValue(undefined),
  replaceDocuments: vi.fn().mockResolvedValue(1),
  deleteAccountCascade: vi.fn().mockResolvedValue(true),
  writeAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

import {
  upsertAccount,
  upsertUsageMetrics,
  upsertBudget,
  replaceDocuments,
  deleteAccountCascade,
  writeAuditEvent,
} from "@/lib/db-queries";

const mockUpsertAccount = vi.mocked(upsertAccount);
const mockUpsertUsageMetrics = vi.mocked(upsertUsageMetrics);
const mockUpsertBudget = vi.mocked(upsertBudget);
const mockReplaceDocuments = vi.mocked(replaceDocuments);
const mockDeleteAccountCascade = vi.mocked(deleteAccountCascade);
const mockWriteAuditEvent = vi.mocked(writeAuditEvent);

beforeEach(() => {
  vi.resetAllMocks();
  mockUpsertAccount.mockResolvedValue(undefined);
  mockUpsertUsageMetrics.mockResolvedValue(1);
  mockUpsertBudget.mockResolvedValue(undefined);
  mockReplaceDocuments.mockResolvedValue(1);
  mockDeleteAccountCascade.mockResolvedValue(true);
  mockWriteAuditEvent.mockResolvedValue(undefined);
  vi.stubEnv("WEBHOOK_SECRET", SECRET);
});

function makeRequest(body: string, signature?: string): Request {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (signature) headers["x-webhook-signature"] = signature;
  return new Request("http://localhost:3000/api/webhook/accounts", {
    method: "POST",
    headers,
    body,
  });
}

describe("POST /api/webhook/accounts", () => {
  it("upserts full account payload and returns 201", async () => {
    const body = JSON.stringify({
      account_key: "ext-001",
      name: "Test Corp",
      context: "Enterprise",
      usage_metrics: [{ metric_name: "seats", current_value: 80, limit_value: 100, unit: "users" }],
      budget: { mrr: 5000, contract_value: 60000, tier: "growth", renewal_in_days: 45, payment_status: "current" },
      documents: [{ document_type: "contract", title: "MSA", content: "text" }],
    });
    const { POST } = await import("@/app/api/webhook/accounts/route");
    const res = await (POST as any)(makeRequest(body, sign(body)));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.account_key).toBe("ext-001");
    expect(data.upserted.metrics).toBe(1);
    expect(data.upserted.budget).toBe(true);
    expect(data.upserted.documents).toBe(1);
    expect(mockUpsertAccount).toHaveBeenCalledWith("ext-001", "Test Corp", "Enterprise");
    expect(mockWriteAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: "webhook.account.upserted", resource_id: "ext-001" })
    );
  });

  it("upserts with only required fields (no metrics/budget/documents)", async () => {
    const body = JSON.stringify({ account_key: "ext-002", name: "Minimal Corp" });
    const { POST } = await import("@/app/api/webhook/accounts/route");
    const res = await (POST as any)(makeRequest(body, sign(body)));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.upserted).toEqual({ metrics: 0, budget: false, documents: 0 });
    expect(mockUpsertUsageMetrics).not.toHaveBeenCalled();
    expect(mockUpsertBudget).not.toHaveBeenCalled();
    expect(mockReplaceDocuments).not.toHaveBeenCalled();
  });

  it("returns 401 when signature header is missing", async () => {
    const body = JSON.stringify({ account_key: "ext-001", name: "Test" });
    const { POST } = await import("@/app/api/webhook/accounts/route");
    const res = await (POST as any)(makeRequest(body));
    expect(res.status).toBe(401);
  });

  it("returns 403 when signature is invalid", async () => {
    const body = JSON.stringify({ account_key: "ext-001", name: "Test" });
    const { POST } = await import("@/app/api/webhook/accounts/route");
    const res = await (POST as any)(makeRequest(body, "sha256=0000000000000000000000000000000000000000000000000000000000000000"));
    expect(res.status).toBe(403);
  });

  it("returns 400 for invalid JSON", async () => {
    const body = "not json";
    const { POST } = await import("@/app/api/webhook/accounts/route");
    const res = await (POST as any)(makeRequest(body, sign(body)));
    expect(res.status).toBe(400);
  });

  it("returns 400 when account_key is missing", async () => {
    const body = JSON.stringify({ name: "No Key Corp" });
    const { POST } = await import("@/app/api/webhook/accounts/route");
    const res = await (POST as any)(makeRequest(body, sign(body)));
    expect(res.status).toBe(400);
  });

  it("returns 503 when WEBHOOK_SECRET is not set", async () => {
    vi.stubEnv("WEBHOOK_SECRET", "");
    const body = JSON.stringify({ account_key: "ext-001", name: "Test" });
    const { POST } = await import("@/app/api/webhook/accounts/route");
    const res = await (POST as any)(makeRequest(body, sign(body)));
    expect(res.status).toBe(503);
  });
});

describe("DELETE /api/webhook/accounts/[account_key]", () => {
  function makeDeleteRequest(signature?: string): Request {
    const headers: Record<string, string> = {};
    if (signature) headers["x-webhook-signature"] = signature;
    return new Request("http://localhost:3000/api/webhook/accounts/ext-001", {
      method: "DELETE",
      headers,
      body: "",
    });
  }

  it("deletes account and returns 200", async () => {
    const body = "";
    const { DELETE } = await import("@/app/api/webhook/accounts/[account_key]/route");
    const res = await (DELETE as any)(
      makeDeleteRequest(sign(body)),
      { params: Promise.resolve({ account_key: "ext-001" }) }
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.deleted).toBe(true);
    expect(data.account_key).toBe("ext-001");
    expect(mockDeleteAccountCascade).toHaveBeenCalledWith("ext-001");
    expect(mockWriteAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ event_type: "webhook.account.deleted", resource_id: "ext-001" })
    );
  });

  it("returns 404 when account does not exist", async () => {
    mockDeleteAccountCascade.mockResolvedValue(false);
    const body = "";
    const { DELETE } = await import("@/app/api/webhook/accounts/[account_key]/route");
    const res = await (DELETE as any)(
      makeDeleteRequest(sign(body)),
      { params: Promise.resolve({ account_key: "nonexistent" }) }
    );
    expect(res.status).toBe(404);
  });

  it("returns 401 when signature is missing", async () => {
    const { DELETE } = await import("@/app/api/webhook/accounts/[account_key]/route");
    const res = await (DELETE as any)(
      makeDeleteRequest(),
      { params: Promise.resolve({ account_key: "ext-001" }) }
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 when signature is invalid", async () => {
    const { DELETE } = await import("@/app/api/webhook/accounts/[account_key]/route");
    const res = await (DELETE as any)(
      makeDeleteRequest("sha256=0000000000000000000000000000000000000000000000000000000000000000"),
      { params: Promise.resolve({ account_key: "ext-001" }) }
    );
    expect(res.status).toBe(403);
  });
});
