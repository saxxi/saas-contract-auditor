import { describe, it, expect, vi, beforeEach } from "vitest";

// Create a chainable mock that resolves to configurable data
let resolveData: unknown[] = [];

function createChain(): unknown {
  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "then") {
          // Make the chain thenable — resolves with current resolveData
          return (resolve: (v: unknown) => void) => resolve(resolveData);
        }
        // Any method call returns the chain itself
        return () => createChain();
      },
    }
  );
}

const mockInsertValues = vi.fn().mockResolvedValue(undefined);
const mockInsert = vi.fn().mockReturnValue({ values: mockInsertValues });

const mockUpdateSetWhere = vi.fn().mockResolvedValue(undefined);
const mockUpdateSet = vi.fn().mockReturnValue({ where: mockUpdateSetWhere });
const mockUpdate = vi.fn().mockReturnValue({ set: mockUpdateSet });

vi.mock("@/lib/db", () => ({
  db: {
    select: () => createChain(),
    insert: (...args: unknown[]) => mockInsert(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
  },
}));

vi.mock("drizzle-orm", () => ({
  desc: vi.fn((col) => col),
  eq: vi.fn((a, b) => ({ op: "eq", a, b })),
  inArray: vi.fn((col, vals) => ({ op: "inArray", col, vals })),
}));

// Must import after mocks are set up
import {
  getAccounts,
  getAccount,
  getAccountSummaries,
  getReports,
  getReport,
  getHistoricalDeals,
  createReportFromData,
  updateReportContent,
} from "@/lib/db-queries";

beforeEach(() => {
  vi.clearAllMocks();
  resolveData = [];
});

describe("getAccounts", () => {
  it("returns array of accounts from DB", async () => {
    resolveData = [
      { id: "1", name: "Acme" },
      { id: "2", name: "Beta" },
    ];
    const result = await getAccounts();
    expect(result).toEqual(resolveData);
  });

  it("returns empty array when no accounts", async () => {
    resolveData = [];
    const result = await getAccounts();
    expect(result).toEqual([]);
  });
});

describe("getAccount", () => {
  it("returns account when found", async () => {
    resolveData = [{ id: "1", name: "Acme" }];
    const result = await getAccount("1");
    expect(result).toEqual({ id: "1", name: "Acme" });
  });

  it("returns undefined when not found", async () => {
    resolveData = [];
    const result = await getAccount("missing");
    expect(result).toBeUndefined();
  });
});

describe("getAccountSummaries", () => {
  it("returns empty array for empty input", async () => {
    const result = await getAccountSummaries([]);
    expect(result).toEqual([]);
  });
});

describe("getReports", () => {
  it("returns reports from DB", async () => {
    const reports = [{ id: "r1", account_id: "1", content: "test" }];
    resolveData = reports;
    const result = await getReports();
    expect(result).toEqual(reports);
  });
});

describe("getReport", () => {
  it("returns report when found", async () => {
    const report = { id: "r1", account_id: "1", content: "test" };
    resolveData = [report];
    const result = await getReport("1");
    expect(result).toEqual(report);
  });

  it("returns undefined when not found", async () => {
    resolveData = [];
    const result = await getReport("missing");
    expect(result).toBeUndefined();
  });
});

describe("getHistoricalDeals", () => {
  it("returns all deals from DB", async () => {
    const deals = [{ id: "d1", deal_id: "D-001" }];
    resolveData = deals;
    const result = await getHistoricalDeals();
    expect(result).toEqual(deals);
  });
});

describe("createReportFromData", () => {
  it("returns null when account not found", async () => {
    resolveData = [];
    const result = await createReportFromData("missing", {
      content: "test",
      proposition_type: "healthy",
      success_percent: 50,
      intervene: false,
    });
    expect(result).toBeNull();
  });

  it("inserts and returns report when account exists", async () => {
    resolveData = [{ id: "acc-1", name: "Acme" }];
    const result = await createReportFromData("acc-1", {
      content: "report text",
      proposition_type: "upsell proposition",
      success_percent: 75,
      intervene: true,
    });

    expect(result).not.toBeNull();
    expect(result!.account_id).toBe("acc-1");
    expect(result!.proposition_type).toBe("upsell proposition");
    expect(result!.content).toBe("report text");
    expect(result!.success_percent).toBe(75);
    expect(result!.intervene).toBe(true);
    expect(mockInsert).toHaveBeenCalled();
  });

  it("sets default values for optional fields", async () => {
    resolveData = [{ id: "acc-1", name: "Acme" }];
    const result = await createReportFromData("acc-1", {
      content: "text",
      proposition_type: "healthy",
      success_percent: 50,
      intervene: false,
    });

    expect(result!.strategic_bucket).toBeNull();
    expect(result!.priority_score).toBeNull();
    expect(result!.score_rationale).toBeNull();
  });
});

describe("updateReportContent", () => {
  it("returns report after update", async () => {
    const updated = { id: "r1", content: "new", updated_at: "2024-01-01" };
    resolveData = [updated];

    const result = await updateReportContent("r1", "new");
    expect(result).toEqual(updated);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("returns undefined when report not found", async () => {
    resolveData = [];
    const result = await updateReportContent("missing", "content");
    expect(result).toBeUndefined();
  });
});
