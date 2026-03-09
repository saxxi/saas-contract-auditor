import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock mock-db module
vi.mock("@/lib/mock-db", () => ({
  getAccounts: vi.fn(),
  getAccount: vi.fn(),
  getAccountSummaries: vi.fn(),
  getReports: vi.fn(),
  getReport: vi.fn(),
  updateReportContent: vi.fn(),
  createReports: vi.fn(),
  createReport: vi.fn(),
  createReportFromData: vi.fn(),
  getHistoricalDeals: vi.fn(),
}));

import {
  getAccounts,
  getAccount,
  getAccountSummaries,
  getReports,
  getReport,
  updateReportContent,
  createReports,
  createReport,
  createReportFromData,
  getHistoricalDeals,
} from "@/lib/mock-db";

const mockGetAccounts = vi.mocked(getAccounts);
const mockGetAccount = vi.mocked(getAccount);
const mockGetAccountSummaries = vi.mocked(getAccountSummaries);
const mockGetReports = vi.mocked(getReports);
const mockGetReport = vi.mocked(getReport);
const mockUpdateReportContent = vi.mocked(updateReportContent);
const mockCreateReports = vi.mocked(createReports);
const mockCreateReport = vi.mocked(createReport);
const mockCreateReportFromData = vi.mocked(createReportFromData);
const mockGetHistoricalDeals = vi.mocked(getHistoricalDeals);

beforeEach(() => {
  vi.resetAllMocks();
});

describe("GET /api/accounts", () => {
  it("returns all accounts as JSON", async () => {
    const accounts = [{ id: "1", name: "Acme" }];
    mockGetAccounts.mockResolvedValue(accounts);

    const { GET } = await import("@/app/api/accounts/route");
    const res = await GET();
    const data = await res.json();

    expect(data).toEqual(accounts);
    expect(res.status).toBe(200);
  });
});

describe("GET /api/accounts/[account_id]", () => {
  it("returns account when found", async () => {
    const account = { id: "1", name: "Acme" };
    mockGetAccount.mockResolvedValue(account);

    const { GET } = await import("@/app/api/accounts/[account_id]/route");
    const res = await GET(new Request("http://localhost/api/accounts/1"), {
      params: Promise.resolve({ account_id: "1" }),
    });
    const data = await res.json();

    expect(data).toEqual(account);
  });

  it("returns 404 when not found", async () => {
    mockGetAccount.mockResolvedValue(undefined);

    const { GET } = await import("@/app/api/accounts/[account_id]/route");
    const res = await GET(new Request("http://localhost/api/accounts/999"), {
      params: Promise.resolve({ account_id: "999" }),
    });

    expect(res.status).toBe(404);
  });
});

describe("GET /api/account_summaries", () => {
  it("returns summaries for given IDs", async () => {
    const summaries = [{ id: "1", usage_metrics: [], budget_report: {}, context: null }];
    mockGetAccountSummaries.mockResolvedValue(summaries as any);

    const { GET } = await import("@/app/api/account_summaries/route");
    const req = new NextRequest("http://localhost/api/account_summaries?account_ids=1,2");
    const res = await GET(req);
    const data = await res.json();

    expect(mockGetAccountSummaries).toHaveBeenCalledWith(["1", "2"]);
    expect(data).toEqual(summaries);
  });

  it("returns 400 when account_ids missing", async () => {
    const { GET } = await import("@/app/api/account_summaries/route");
    const req = new NextRequest("http://localhost/api/account_summaries");
    const res = await GET(req);

    expect(res.status).toBe(400);
  });
});

describe("GET /api/account_reports", () => {
  it("returns all reports", async () => {
    const reports = [{ id: "r1", account_id: "1", content: "test" }];
    mockGetReports.mockResolvedValue(reports as any);

    const { GET } = await import("@/app/api/account_reports/route");
    const res = await GET();
    const data = await res.json();

    expect(data).toEqual(reports);
  });
});

describe("GET /api/account_reports/[id]", () => {
  it("returns report when found", async () => {
    const report = { id: "r1", account_id: "1", content: "test" };
    mockGetReport.mockResolvedValue(report as any);

    const { GET } = await import("@/app/api/account_reports/[id]/route");
    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "r1" }),
    });
    const data = await res.json();

    expect(data).toEqual(report);
  });

  it("returns 404 when not found", async () => {
    mockGetReport.mockResolvedValue(undefined);

    const { GET } = await import("@/app/api/account_reports/[id]/route");
    const res = await GET(new Request("http://localhost"), {
      params: Promise.resolve({ id: "missing" }),
    });

    expect(res.status).toBe(404);
  });
});

describe("PUT /api/account_reports/[id]", () => {
  it("updates report content", async () => {
    const updated = { id: "r1", content: "new content" };
    mockUpdateReportContent.mockResolvedValue(updated as any);

    const { PUT } = await import("@/app/api/account_reports/[id]/route");
    const res = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "new content" }),
      }),
      { params: Promise.resolve({ id: "r1" }) }
    );
    const data = await res.json();

    expect(data).toEqual(updated);
    expect(mockUpdateReportContent).toHaveBeenCalledWith("r1", "new content", undefined);
  });

  it("passes metadata when proposition_type provided", async () => {
    mockUpdateReportContent.mockResolvedValue({ id: "r1" } as any);

    const { PUT } = await import("@/app/api/account_reports/[id]/route");
    await PUT(
      new Request("http://localhost", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "c",
          proposition_type: "upsell proposition",
          success_percent: 80,
          intervene: true,
        }),
      }),
      { params: Promise.resolve({ id: "r1" }) }
    );

    expect(mockUpdateReportContent).toHaveBeenCalledWith("r1", "c", expect.objectContaining({
      proposition_type: "upsell proposition",
      success_percent: 80,
      intervene: true,
    }));
  });

  it("returns 404 when report not found", async () => {
    mockUpdateReportContent.mockResolvedValue(undefined);

    const { PUT } = await import("@/app/api/account_reports/[id]/route");
    const res = await PUT(
      new Request("http://localhost", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "c" }),
      }),
      { params: Promise.resolve({ id: "missing" }) }
    );

    expect(res.status).toBe(404);
  });
});

describe("POST /api/account_reports/batch", () => {
  it("creates reports for given IDs", async () => {
    const reports = [{ id: "r1" }];
    mockCreateReports.mockResolvedValue(reports as any);

    const { POST } = await import("@/app/api/account_reports/batch/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_ids: ["1", "2"] }),
      })
    );

    expect(res.status).toBe(201);
    expect(mockCreateReports).toHaveBeenCalledWith(["1", "2"]);
  });

  it("returns 400 for non-array account_ids", async () => {
    const { POST } = await import("@/app/api/account_reports/batch/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_ids: "not-array" }),
      })
    );

    expect(res.status).toBe(400);
  });

  it("returns 400 for more than 5 IDs", async () => {
    const { POST } = await import("@/app/api/account_reports/batch/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_ids: ["1", "2", "3", "4", "5", "6"] }),
      })
    );

    expect(res.status).toBe(400);
  });
});

describe("POST /api/accounts/[account_id]/account_reports", () => {
  it("creates report from JSON body when content and proposition_type provided", async () => {
    const report = { id: "r1", content: "generated" };
    mockCreateReportFromData.mockResolvedValue(report as any);

    const { POST } = await import("@/app/api/accounts/[account_id]/account_reports/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "report text",
          proposition_type: "upsell proposition",
          success_percent: 75,
          intervene: false,
        }),
      }),
      { params: Promise.resolve({ account_id: "1" }) }
    );

    expect(res.status).toBe(201);
    expect(mockCreateReportFromData).toHaveBeenCalledWith("1", expect.objectContaining({
      content: "report text",
      proposition_type: "upsell proposition",
    }));
  });

  it("falls back to mock generation when no JSON body", async () => {
    const report = { id: "r1" };
    mockCreateReport.mockResolvedValue(report as any);

    const { POST } = await import("@/app/api/accounts/[account_id]/account_reports/route");
    const res = await POST(
      new Request("http://localhost", { method: "POST" }),
      { params: Promise.resolve({ account_id: "1" }) }
    );

    expect(res.status).toBe(201);
    expect(mockCreateReport).toHaveBeenCalledWith("1");
  });

  it("returns 404 when account not found (mock fallback)", async () => {
    mockCreateReport.mockResolvedValue(null);

    const { POST } = await import("@/app/api/accounts/[account_id]/account_reports/route");
    const res = await POST(
      new Request("http://localhost", { method: "POST" }),
      { params: Promise.resolve({ account_id: "999" }) }
    );

    expect(res.status).toBe(404);
  });

  it("returns 404 when account not found (agent body)", async () => {
    mockCreateReportFromData.mockResolvedValue(null);

    const { POST } = await import("@/app/api/accounts/[account_id]/account_reports/route");
    const res = await POST(
      new Request("http://localhost", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: "text",
          proposition_type: "healthy",
          success_percent: 50,
          intervene: false,
        }),
      }),
      { params: Promise.resolve({ account_id: "999" }) }
    );

    expect(res.status).toBe(404);
  });
});

describe("GET /api/historical_deals", () => {
  it("returns all deals", async () => {
    const deals = [{ id: "d1", deal_id: "D-001" }];
    mockGetHistoricalDeals.mockResolvedValue(deals as any);

    const { GET } = await import("@/app/api/historical_deals/route");
    const res = await GET();
    const data = await res.json();

    expect(data).toEqual(deals);
  });
});
