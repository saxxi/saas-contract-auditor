"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAgent } from "@copilotkit/react-core/v2";
import { useQueryClient } from "@tanstack/react-query";
import { useAccounts } from "@/hooks/use-accounts";
import { useAccountReport, useAccountReports } from "@/hooks/use-account-reports";
import { useAccountSummaries } from "@/hooks/use-account-summaries";
import { AccountsTable } from "./accounts-table";
import { ReportModal } from "./report-modal";

interface AccountReportEntry {
  id: string;
  status: "pending" | "generated";
}

export function ContractsCanvas() {
  const { agent } = useAgent();
  const queryClient = useQueryClient();
  const { data: accounts = [] } = useAccounts();
  const { data: reports = [] } = useAccountReports();
  const accountsById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  // Reports come sorted by generated_at desc; first entry per account is the latest
  const reportsById = useMemo(() => {
    const map = new Map<string, typeof reports[number]>();
    for (const r of reports) {
      if (!map.has(r.account_id)) map.set(r.account_id, r);
    }
    return map;
  }, [reports]);

  // Selection derived from agent state
  const accountReports: AccountReportEntry[] = agent.state?.account_reports ?? [];
  const selectedIds = useMemo(() => new Set(accountReports.map((ar) => ar.id)), [accountReports]);
  const focusedAccountId: string | null = agent.state?.focused_account_id ?? null;

  // Fetch summaries for selected accounts
  const selectedIdList = useMemo(() => Array.from(selectedIds), [selectedIds]);
  const { data: summaries = [] } = useAccountSummaries(selectedIdList);
  const summariesById = useMemo(() => new Map(summaries.map((s) => [s.id, s])), [summaries]);

  // Track button states separately from general agent activity
  const [isFindingOpportunities, setIsFindingOpportunities] = useState(false);
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const wasRunningRef = useRef(false);

  // Invalidate reports cache and reset button state when agent finishes
  useEffect(() => {
    if (wasRunningRef.current && !agent.isRunning) {
      queryClient.invalidateQueries({ queryKey: ["account-reports"] });
      setIsFindingOpportunities(false);
      setGeneratingIds(new Set());
    }
    wasRunningRef.current = agent.isRunning;
  }, [agent.isRunning, queryClient]);

  // Log agent state changes
  useEffect(() => {
    console.log("[agent state]", agent.state);
  }, [agent.state]);

  const handleSelect = useCallback((id: string) => {
    const existing: AccountReportEntry[] = agent.state?.account_reports ?? [];
    if (existing.some((ar) => ar.id === id)) return;
    const status = reportsById.has(id) ? "generated" : "pending";
    agent.setState({
      ...agent.state,
      account_reports: [...existing, { id, status }],
    });
  }, [agent, reportsById]);

  const handleDeselect = useCallback((id: string) => {
    const existing: AccountReportEntry[] = agent.state?.account_reports ?? [];
    agent.setState({
      ...agent.state,
      account_reports: existing.filter((ar) => ar.id !== id),
    });
  }, [agent]);

  const handleDeselectAll = useCallback(() => {
    agent.setState({
      ...agent.state,
      account_reports: [],
    });
  }, [agent]);

  const safeRunAgent = useCallback(() => {
    try {
      if (!agent.isRunning) agent.runAgent();
    } catch {
      // "Thread already running" — CopilotChat may have already triggered it
    }
  }, [agent]);

  const handleGenerateReport = useCallback((id: string) => {
    if (agent.isRunning) return;
    setGeneratingIds(new Set([id]));
    agent.setMessages([]);
    const accountName = accountsById.get(id)?.name ?? id;
    agent.addMessage({
      role: "user",
      id: crypto.randomUUID(),
      content: `Generate a report for account ${id} (${accountName}).`,
    });
    safeRunAgent();
  }, [agent, accountsById, safeRunAgent]);

  const handleGenerateSelected = useCallback(() => {
    if (agent.isRunning) return;
    const pendingIds = accountReports.map((ar) => ar.id);
    if (pendingIds.length === 0) return;
    setGeneratingIds(new Set(pendingIds));
    agent.setMessages([]);
    const names = pendingIds.map((id) => {
      const name = accountsById.get(id)?.name ?? id;
      return `${id} (${name})`;
    });
    agent.addMessage({
      role: "user",
      id: crypto.randomUUID(),
      content: `Generate reports for these accounts: ${names.join(", ")}.`,
    });
    safeRunAgent();
  }, [accountReports, reportsById, agent, accountsById, safeRunAgent]);

  const handleFindOpportunities = useCallback((batchSize: number) => {
    if (agent.isRunning) return;
    const unselected = accounts.filter((a) => !selectedIds.has(a.id));
    if (unselected.length === 0) return;
    setIsFindingOpportunities(true);

    // Clear existing selection — find_opportunities replaces it
    agent.setState({ ...agent.state, account_reports: [] });

    const batch = unselected.slice(0, batchSize).map((a) => a.id);
    agent.addMessage({
      role: "user",
      id: crypto.randomUUID(),
      content: `Find opportunities among these accounts: ${batch.join(", ")}`,
    });
    safeRunAgent();
  }, [accounts, selectedIds, agent, safeRunAgent]);

  const setFocusedAccount = useCallback((id: string | null) => {
    agent.setState({ ...agent.state, focused_account_id: id });
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
      <AccountsTable
        accounts={accounts}
        selectedIds={selectedIds}
        reports={reportsById}
        summaries={summariesById}
        onSelect={handleSelect}
        onDeselect={handleDeselect}
        onDeselectAll={handleDeselectAll}
        onGenerateReport={handleGenerateReport}
        onGenerateSelected={handleGenerateSelected}
        onOpenReport={setFocusedAccount}
        onFindOpportunities={handleFindOpportunities}
        generatingIds={generatingIds}
        isFinding={isFindingOpportunities}
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
