import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Setup fetch mock
const mockFetch = vi.fn();
global.fetch = mockFetch;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("useAccounts", () => {
  it("fetches /api/accounts and returns data", async () => {
    const accounts = [{ id: "1", name: "Acme" }];
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(accounts) });

    const { useAccounts } = await import("@/hooks/use-accounts");
    const { result } = renderHook(() => useAccounts(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(accounts);
    expect(mockFetch).toHaveBeenCalledWith("/api/accounts");
  });
});

describe("useAccountSummaries", () => {
  it("fetches with sorted comma-joined IDs", async () => {
    const summaries = [{ id: "1" }];
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(summaries) });

    const { useAccountSummaries } = await import("@/hooks/use-account-summaries");
    const { result } = renderHook(() => useAccountSummaries(["b", "a"]), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith("/api/account_summaries?account_ids=a,b");
  });

  it("is disabled when accountIds is empty", async () => {
    const { useAccountSummaries } = await import("@/hooks/use-account-summaries");
    const { result } = renderHook(() => useAccountSummaries([]), {
      wrapper: createWrapper(),
    });

    // Should not fetch
    expect(result.current.fetchStatus).toBe("idle");
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe("useAccountReports", () => {
  it("fetches /api/account_reports", async () => {
    const reports = [{ id: "r1" }];
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(reports) });

    const { useAccountReports } = await import("@/hooks/use-account-reports");
    const { result } = renderHook(() => useAccountReports(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(reports);
  });
});

describe("useAccountReport", () => {
  it("fetches single report by ID", async () => {
    const report = { id: "r1", content: "test" };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(report) });

    const { useAccountReport } = await import("@/hooks/use-account-reports");
    const { result } = renderHook(() => useAccountReport("r1"), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith("/api/account_reports/r1");
  });

  it("is disabled when id is null", async () => {
    const { useAccountReport } = await import("@/hooks/use-account-reports");
    const { result } = renderHook(() => useAccountReport(null), { wrapper: createWrapper() });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe("useUpdateReportContent", () => {
  it("sends PUT with content", async () => {
    const updated = { id: "r1", content: "new" };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(updated) });

    const { useUpdateReportContent } = await import("@/hooks/use-account-reports");
    const { result } = renderHook(() => useUpdateReportContent(), { wrapper: createWrapper() });

    result.current.mutate({ reportId: "r1", content: "new" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith("/api/account_reports/r1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: "new" }),
    });
  });
});

describe("useGenerateReport", () => {
  it("sends POST to account reports endpoint", async () => {
    const report = { id: "r1" };
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(report) });

    const { useGenerateReport } = await import("@/hooks/use-account-reports");
    const { result } = renderHook(() => useGenerateReport(), { wrapper: createWrapper() });

    result.current.mutate("acc-1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith("/api/accounts/acc-1/account_reports", {
      method: "POST",
    });
  });
});

describe("useGenerateReportsBatch", () => {
  it("sends POST with account_ids array", async () => {
    const reports = [{ id: "r1" }];
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(reports) });

    const { useGenerateReportsBatch } = await import("@/hooks/use-account-reports");
    const { result } = renderHook(() => useGenerateReportsBatch(), { wrapper: createWrapper() });

    result.current.mutate(["1", "2"]);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith("/api/account_reports/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account_ids: ["1", "2"] }),
    });
  });
});
