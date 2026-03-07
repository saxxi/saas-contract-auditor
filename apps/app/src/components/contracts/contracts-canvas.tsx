"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useAgent } from "@copilotkit/react-core/v2";
import { useAccounts } from "@/hooks/use-accounts";
import { useAccountReport, useAccountReports, useGenerateReport, useGenerateReportsBatch } from "@/hooks/use-account-reports";
import { useAccountSummaries } from "@/hooks/use-account-summaries";
import { SelectedAccountsTable } from "./selected-accounts-table";
import { AccountsTable } from "./accounts-table";
import { ReportModal } from "./report-modal";

interface AccountReportEntry {
  id: string;
  status: "pending" | "generated";
}

export function ContractsCanvas() {
  const { agent } = useAgent();
  const { data: accounts = [] } = useAccounts();
  const { data: reports = [] } = useAccountReports();
  const generateReport = useGenerateReport();
  const generateBatch = useGenerateReportsBatch();

  const accountsById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const reportsById = useMemo(() => new Map(reports.map((r) => [r.account_id, r])), [reports]);

  // Selection derived from agent state
  const accountReports: AccountReportEntry[] = agent.state?.account_reports ?? [];
  const selectedIds = useMemo(() => new Set(accountReports.map((ar) => ar.id)), [accountReports]);
  const focusedAccountId: string | null = agent.state?.focused_account_id ?? null;

  // Fetch summaries for selected accounts
  const selectedIdList = useMemo(() => Array.from(selectedIds), [selectedIds]);
  const { data: summaries = [] } = useAccountSummaries(selectedIdList);
  const summariesById = useMemo(() => new Map(summaries.map((s) => [s.id, s])), [summaries]);

  // Log agent state changes
  useEffect(() => {
    console.log("[agent state]", agent.state);
  }, [agent.state]);

  const selectedAccounts = accounts.filter((a) => selectedIds.has(a.id));
  const unselectedAccounts = accounts.filter((a) => !selectedIds.has(a.id));

  const handleSelect = useCallback((id: string) => {
    const existing: AccountReportEntry[] = agent.state?.account_reports ?? [];
    if (existing.some((ar) => ar.id === id)) return;
    const status = reportsById.has(id) ? "generated" : "pending";
    agent.setState({
      account_reports: [...existing, { id, status }],
    });
  }, [agent, reportsById]);

  const handleDeselect = useCallback((id: string) => {
    const existing: AccountReportEntry[] = agent.state?.account_reports ?? [];
    agent.setState({
      account_reports: existing.filter((ar) => ar.id !== id),
    });
  }, [agent]);

  const handleGenerateReport = useCallback((id: string) => {
    generateReport.mutate(id, {
      onSuccess: () => {
        const existing: AccountReportEntry[] = agent.state?.account_reports ?? [];
        agent.setState({
          account_reports: existing.map((ar) =>
            ar.id === id ? { ...ar, status: "generated" as const } : ar
          ),
        });
      },
    });
  }, [generateReport, agent]);

  const handleGenerateMissing = useCallback(() => {
    const pendingIds = accountReports
      .filter((ar) => !reportsById.has(ar.id))
      .map((ar) => ar.id);
    if (pendingIds.length === 0) return;
    generateBatch.mutate(pendingIds, {
      onSuccess: () => {
        const existing: AccountReportEntry[] = agent.state?.account_reports ?? [];
        const generatedSet = new Set(pendingIds);
        agent.setState({
          account_reports: existing.map((ar) =>
            generatedSet.has(ar.id) ? { ...ar, status: "generated" as const } : ar
          ),
        });
      },
    });
  }, [accountReports, reportsById, generateBatch, agent]);

  const handleFindOpportunities = useCallback(async () => {
    const unselected = accounts.filter((a) => !selectedIds.has(a.id));
    if (unselected.length === 0) return;

    const unselectedIds = unselected.map((a) => a.id).join(",");
    const res = await fetch(`/api/account_summaries?account_ids=${unselectedIds}`);
    const unselectedSummaries = await res.json();

    const summary = unselected.map((a) => {
      const s = unselectedSummaries.find((us: { id: string }) => us.id === a.id);
      if (!s) return { id: a.id, name: a.name };
      return {
        id: a.id,
        name: a.name,
        tier: s.budget_report.tier,
        mrr: s.budget_report.mrr,
        renewal_in_days: s.budget_report.renewal_in_days,
        payment_status: s.budget_report.payment_status,
        user_utilization: `${s.active_users_report.active_users}/${s.active_users_report.seat_limit}`,
        invoice_utilization: `${s.invoicing_usage_report.monthly_invoices}/${s.invoicing_usage_report.invoice_limit}`,
        integration_utilization: `${s.integrations_usage_report.active_integrations}/${s.integrations_usage_report.integration_limit}`,
      };
    });

    agent.addMessage({
      role: "user",
      id: crypto.randomUUID(),
      content: `Analyze these unselected accounts and find the top opportunities for upsell, contract renegotiation, or accounts at risk of churning. Select the most promising ones using the select_accounts tool. Here are the accounts:\n\n${JSON.stringify(summary, null, 2)}`,
    });
    agent.runAgent();
  }, [accounts, selectedIds, agent]);

  const setFocusedAccount = useCallback((id: string | null) => {
    agent.setState({ focused_account_id: id });
  }, [agent]);

  // Fetch focused account's report and summary directly (handles data not yet in bulk queries)
  const { data: focusedReport } = useAccountReport(focusedAccountId);
  const focusedIdList = useMemo(() => focusedAccountId ? [focusedAccountId] : [], [focusedAccountId]);
  const { data: focusedSummaries = [] } = useAccountSummaries(focusedIdList);

  const openAccount = focusedAccountId ? accountsById.get(focusedAccountId) : null;
  const openReport = focusedAccountId ? (reportsById.get(focusedAccountId) ?? focusedReport ?? null) : null;
  const openSummary = focusedAccountId ? (summariesById.get(focusedAccountId) ?? focusedSummaries[0]) : undefined;

  return (
    <div className="relative h-full flex flex-col gap-3 p-4 overflow-hidden">
      <SelectedAccountsTable
        accounts={selectedAccounts}
        reports={reportsById}
        summaries={summariesById}
        onDeselect={handleDeselect}
        onGenerateReport={handleGenerateReport}
        onGenerateMissing={handleGenerateMissing}
        onOpenReport={setFocusedAccount}
      />
      <AccountsTable
        accounts={unselectedAccounts}
        onSelect={handleSelect}
        onFindOpportunities={handleFindOpportunities}
        isFinding={agent.isRunning}
      />
      {openAccount && openReport && (
        <ReportModal
          account={openAccount}
          report={openReport}
          summary={openSummary}
          onClose={() => setFocusedAccount(null)}
        />
      )}
    </div>
  );
}
