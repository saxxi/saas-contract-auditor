import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { AccountsTable } from "../accounts-table";
import type { Account, Report, AccountSummary } from "../types";

function makeAccount(id: string, name: string): Account {
  return { id, name };
}

function makeReport(overrides: Partial<Report> = {}): Report {
  return {
    id: "r1",
    account_id: "1",
    proposition_type: "upsell proposition",
    strategic_bucket: null,
    success_percent: 75,
    intervene: false,
    priority_score: null,
    score_rationale: null,
    content: "report content",
    generated_at: "2026-01-15T10:00:00Z",
    created_at: "2026-01-15T10:00:00Z",
    updated_at: "2026-01-15T10:00:00Z",
    ...overrides,
  };
}

const defaultProps = {
  accounts: [] as Account[],
  selectedIds: new Set<string>(),
  reports: new Map<string, Report>(),
  summaries: new Map<string, AccountSummary>(),
  onSelect: vi.fn(),
  onDeselect: vi.fn(),
  onDeselectAll: vi.fn(),
  onGenerateReport: vi.fn(),
  onGenerateSelected: vi.fn(),
  onOpenReport: vi.fn(),
  onFindOpportunities: vi.fn(),
  generatingIds: new Set<string>(),
  isFinding: false,
};

afterEach(() => cleanup());

function renderTable(overrides: Partial<typeof defaultProps> = {}) {
  const props = { ...defaultProps, ...overrides };
  return render(<AccountsTable {...props} />);
}

describe("AccountsTable", () => {
  it("renders all accounts in the table", () => {
    const accounts = [makeAccount("1", "Acme"), makeAccount("2", "Beta Corp"), makeAccount("3", "Gamma Inc")];
    renderTable({ accounts });

    expect(screen.getByText("Acme")).toBeDefined();
    expect(screen.getByText("Beta Corp")).toBeDefined();
    expect(screen.getByText("Gamma Inc")).toBeDefined();
    expect(screen.getByText("Accounts (3)")).toBeDefined();
  });

  it("selected accounts show highlighted row styling", () => {
    const accounts = [makeAccount("1", "Acme"), makeAccount("2", "Beta")];
    const { container } = renderTable({ accounts, selectedIds: new Set(["1"]) });

    const rows = container.querySelectorAll("tbody tr");
    // Selected row (sorted first) should have bg-blue class
    const selectedRow = rows[0];
    expect(selectedRow.className).toContain("bg-blue-50/50");

    // Unselected row should not have bg-blue class
    const unselectedRow = rows[1];
    expect(unselectedRow.className).not.toContain("bg-blue");
  });

  it("checkbox toggle calls onSelect for unselected account", () => {
    const onSelect = vi.fn();
    const accounts = [makeAccount("1", "Acme")];
    renderTable({ accounts, onSelect });

    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]);
    expect(onSelect).toHaveBeenCalledWith("1");
  });

  it("checkbox toggle calls onDeselect for selected account", () => {
    const onDeselect = vi.fn();
    const accounts = [makeAccount("1", "Acme")];
    renderTable({ accounts, selectedIds: new Set(["1"]), onDeselect });

    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[0]);
    expect(onDeselect).toHaveBeenCalledWith("1");
  });

  it("Generate button appears for selected accounts without reports", () => {
    const onGenerateReport = vi.fn();
    const accounts = [makeAccount("1", "Acme")];
    renderTable({ accounts, selectedIds: new Set(["1"]), onGenerateReport });

    // The per-row "Generate" button (not the batch one)
    const generateBtns = screen.getAllByRole("button", { name: "Generate" });
    expect(generateBtns.length).toBeGreaterThan(0);
    fireEvent.click(generateBtns[0]);
    expect(onGenerateReport).toHaveBeenCalledWith("1");
  });

  it("report date link appears for accounts with reports and calls onOpenReport", () => {
    const onOpenReport = vi.fn();
    const accounts = [makeAccount("1", "Acme")];
    const report = makeReport({ account_id: "1" });
    const reports = new Map([["1", report]]);

    renderTable({ accounts, selectedIds: new Set(["1"]), reports, onOpenReport });

    // The date should be rendered as a button
    const dateLink = screen.getByTitle(report.generated_at);
    expect(dateLink).toBeDefined();
    fireEvent.click(dateLink);
    expect(onOpenReport).toHaveBeenCalledWith("1");
  });

  it("PropositionBadge renders correct colors per type", () => {
    const accounts = [
      makeAccount("1", "A"),
      makeAccount("2", "B"),
      makeAccount("3", "C"),
      makeAccount("4", "D"),
      makeAccount("5", "E"),
    ];
    const reports = new Map<string, Report>([
      ["1", makeReport({ account_id: "1", proposition_type: "requires negotiation" })],
      ["2", makeReport({ account_id: "2", proposition_type: "upsell proposition" })],
      ["3", makeReport({ account_id: "3", proposition_type: "poor usage" })],
      ["4", makeReport({ account_id: "4", proposition_type: "at capacity" })],
      ["5", makeReport({ account_id: "5", proposition_type: "healthy" })],
    ]);
    renderTable({ accounts, reports, selectedIds: new Set(["1", "2", "3", "4", "5"]) });

    const negotiation = screen.getByText("requires negotiation");
    expect(negotiation.className).toContain("bg-red-100");

    const upsell = screen.getByText("upsell proposition");
    expect(upsell.className).toContain("bg-blue-100");

    const poorUsage = screen.getByText("poor usage");
    expect(poorUsage.className).toContain("bg-amber-100");

    const atCapacity = screen.getByText("at capacity");
    expect(atCapacity.className).toContain("bg-orange-100");

    const healthy = screen.getByText("healthy");
    expect(healthy.className).toContain("bg-green-100");
  });

  it("Generate reports for selected button disabled when generatingIds is non-empty", () => {
    const accounts = [makeAccount("1", "Acme")];
    renderTable({
      accounts,
      selectedIds: new Set(["1"]),
      generatingIds: new Set(["1"]),
    });

    // When generating, the batch button and per-row button both show "Generating..."
    const btns = screen.getAllByText("Generating...");
    // At least one should be disabled
    const disabledBtn = btns.find((el) => el.closest("button")?.hasAttribute("disabled"));
    expect(disabledBtn).toBeDefined();
  });

  it("Find Opportunities button disabled when isFinding is true", () => {
    const accounts = [makeAccount("1", "Acme")];
    renderTable({ accounts, isFinding: true });

    const btn = screen.getByText("Analyzing...");
    expect(btn.closest("button")!.hasAttribute("disabled")).toBe(true);
  });

  it("empty state shows 'No accounts found'", () => {
    renderTable({ accounts: [] });
    expect(screen.getByText("No accounts found")).toBeDefined();
  });

  it("success % color coding: green >=70, amber >=40, red <40", () => {
    const accounts = [makeAccount("1", "A"), makeAccount("2", "B"), makeAccount("3", "C")];
    const reports = new Map<string, Report>([
      ["1", makeReport({ account_id: "1", success_percent: 80 })],
      ["2", makeReport({ account_id: "2", success_percent: 50 })],
      ["3", makeReport({ account_id: "3", success_percent: 20 })],
    ]);
    renderTable({ accounts, reports, selectedIds: new Set(["1", "2", "3"]) });

    const green = screen.getByText("80%");
    expect(green.className).toContain("text-green-600");

    const amber = screen.getByText("50%");
    expect(amber.className).toContain("text-amber-600");

    const red = screen.getByText("20%");
    expect(red.className).toContain("text-red-600");
  });

  it("intervene column shows YES or no", () => {
    const accounts = [makeAccount("1", "A"), makeAccount("2", "B")];
    const reports = new Map<string, Report>([
      ["1", makeReport({ account_id: "1", intervene: true })],
      ["2", makeReport({ account_id: "2", intervene: false })],
    ]);
    renderTable({ accounts, reports, selectedIds: new Set(["1", "2"]) });

    expect(screen.getByText("YES")).toBeDefined();
    // "no" may appear multiple times, use getAllByText
    const noElements = screen.getAllByText("no");
    expect(noElements.length).toBeGreaterThan(0);
  });
});
