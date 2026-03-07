"use client";

import { useState, useCallback, useMemo } from "react";
import { useAgent } from "@copilotkit/react-core/v2";
import { useFrontendTool } from "@copilotkit/react-core";
import { accounts } from "./accounts-data";
import { Account, Report } from "./types";
import { generateMockReport } from "./report-utils";
import { SelectedAccountsTable } from "./selected-accounts-table";
import { AccountsTable } from "./accounts-table";
import { ReportModal } from "./report-modal";

export function ContractsCanvas() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [reports, setReports] = useState<Map<string, Report>>(new Map());
  const [openReportId, setOpenReportId] = useState<string | null>(null);

  const { agent } = useAgent();

  const accountsById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), []);

  const selectedAccounts = accounts.filter((a) => selectedIds.has(a.id));
  const unselectedAccounts = accounts.filter((a) => !selectedIds.has(a.id));

  // Frontend tool: lets the agent select accounts by IDs
  useFrontendTool({
    name: "select_accounts",
    description: "Select accounts by their IDs to move them to the Selected Accounts table for review. Call this with the account IDs you want to recommend as opportunities.",
    parameters: [
      {
        name: "account_ids",
        type: "string[]",
        description: "Array of account IDs to select (e.g. ['AC-4', 'AC-6'])",
        required: true,
      },
    ],
    handler: async ({ account_ids }: { account_ids: string[] }) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of account_ids) {
          if (accountsById.has(id)) next.add(id);
        }
        return next;
      });
      return `Selected ${account_ids.length} accounts: ${account_ids.join(", ")}`;
    },
  });

  const handleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => new Set([...prev, id]));
  }, []);

  const handleDeselect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const handleGenerateReport = useCallback((id: string) => {
    const account = accountsById.get(id);
    if (!account) return;
    const report = generateMockReport(account);
    setReports((prev) => new Map([...prev, [id, report]]));
  }, [accountsById]);

  const handleGenerateMissing = useCallback(() => {
    setReports((prev) => {
      const next = new Map(prev);
      for (const id of selectedIds) {
        if (!next.has(id)) {
          const account = accountsById.get(id);
          if (account) next.set(id, generateMockReport(account));
        }
      }
      return next;
    });
  }, [selectedIds, accountsById]);

  const handleFindOpportunities = useCallback(() => {
    const unselected = accounts.filter((a) => !selectedIds.has(a.id));
    if (unselected.length === 0) return;

    const summary = unselected.map((a: Account) => ({
      id: a.id,
      name: a.name,
      tier: a.budget_report.tier,
      mrr: a.budget_report.mrr,
      renewal_in_days: a.budget_report.renewal_in_days,
      payment_status: a.budget_report.payment_status,
      user_utilization: `${a.active_users_report.active_users}/${a.active_users_report.seat_limit}`,
      invoice_utilization: `${a.invoicing_usage_report.monthly_invoices}/${a.invoicing_usage_report.invoice_limit}`,
      integration_utilization: `${a.integrations_usage_report.active_integrations}/${a.integrations_usage_report.integration_limit}`,
    }));

    agent.addMessage({
      role: "user",
      id: crypto.randomUUID(),
      content: `Analyze these unselected accounts and find the top opportunities for upsell, contract renegotiation, or accounts at risk of churning. Select the most promising ones using the select_accounts tool. Here are the accounts:\n\n${JSON.stringify(summary, null, 2)}`,
    });
    agent.runAgent();
  }, [selectedIds, agent]);

  const openAccount = openReportId ? accountsById.get(openReportId) : null;
  const openReport = openReportId ? reports.get(openReportId) : null;

  return (
    <div className="relative h-full flex flex-col gap-3 p-4 overflow-hidden">
      <SelectedAccountsTable
        accounts={selectedAccounts}
        reports={reports}
        onDeselect={handleDeselect}
        onGenerateReport={handleGenerateReport}
        onGenerateMissing={handleGenerateMissing}
        onOpenReport={setOpenReportId}
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
          onClose={() => setOpenReportId(null)}
        />
      )}
    </div>
  );
}
