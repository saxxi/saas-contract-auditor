"use client";

import { Account, AccountSummary, Report } from "./types";

interface SelectedAccountsTableProps {
  accounts: Account[];
  reports: Map<string, Report>;
  summaries: Map<string, AccountSummary>;
  onDeselect: (id: string) => void;
  onGenerateReport: (id: string) => void;
  onGenerateMissing: () => void;
  onOpenReport: (id: string) => void;
  generatingIds: Set<string>;
}

function PropositionBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    "requires negotiation": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    "upsell proposition": "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    "poor usage": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
    "at capacity": "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
    "healthy": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colors[type] || "bg-zinc-100 text-zinc-600"}`}>
      {type}
    </span>
  );
}

export function SelectedAccountsTable({
  accounts,
  reports,
  summaries,
  onDeselect,
  onGenerateReport,
  onGenerateMissing,
  onOpenReport,
  generatingIds,
}: SelectedAccountsTableProps) {
  const hasUngenerated = accounts.some((a) => !reports.has(a.id));
  const isAnyGenerating = generatingIds.size > 0;

  return (
    <div className="flex flex-col" style={{ maxHeight: "40%" }}>
      <div className="flex items-center justify-between px-1 py-2">
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">
          Selected Accounts ({accounts.length})
        </h2>
        {hasUngenerated && (
          <button
            onClick={onGenerateMissing}
            disabled={isAnyGenerating}
            className="text-xs px-3 py-1 rounded bg-zinc-800 text-white hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
          >
            {isAnyGenerating ? (
              <>
                <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              "Generate missing reports"
            )}
          </button>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-lg">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
            <tr>
              <th className="w-10 px-3 py-2"></th>
              <th className="px-3 py-2 text-left font-medium text-zinc-600 dark:text-zinc-300">Report</th>
              <th className="px-3 py-2 text-left font-medium text-zinc-600 dark:text-zinc-300">ID</th>
              <th className="px-3 py-2 text-left font-medium text-zinc-600 dark:text-zinc-300">Name</th>
              <th className="px-3 py-2 text-left font-medium text-zinc-600 dark:text-zinc-300">Proposition</th>
              <th className="px-3 py-2 text-right font-medium text-zinc-600 dark:text-zinc-300">% Success</th>
              <th className="px-3 py-2 text-center font-medium text-zinc-600 dark:text-zinc-300">Intervene?</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => {
              const report = reports.get(account.id);
              return (
                <tr
                  key={account.id}
                  className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                >
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={true}
                      onChange={() => onDeselect(account.id)}
                      className="rounded border-zinc-300 cursor-pointer"
                    />
                  </td>
                  <td className="px-3 py-2">
                    {report ? (
                      <button
                        onClick={() => onOpenReport(account.id)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        title={report.generated_at}
                      >
                        {new Date(report.generated_at).toLocaleDateString()}
                      </button>
                    ) : (
                      <button
                        onClick={() => onGenerateReport(account.id)}
                        disabled={isAnyGenerating}
                        className="text-xs px-2 py-0.5 rounded border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {generatingIds.has(account.id) ? "Generating..." : "Generate..."}
                      </button>
                    )}
                  </td>
                  <td className="px-3 py-2 text-zinc-500 font-mono text-xs">{account.id}</td>
                  <td className="px-3 py-2 font-medium">{account.name}</td>
                  <td className="px-3 py-2">
                    {report ? <PropositionBadge type={report.proposition_type} /> : <span className="text-zinc-300">--</span>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {report ? (
                      <span className={report.success_percent >= 70 ? "text-green-600" : report.success_percent >= 40 ? "text-amber-600" : "text-red-600"}>
                        {report.success_percent}%
                      </span>
                    ) : (
                      <span className="text-zinc-300">--</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {report ? (
                      report.intervene ? (
                        <span className="text-red-600 font-semibold text-xs">YES</span>
                      ) : (
                        <span className="text-zinc-400 text-xs">no</span>
                      )
                    ) : (
                      <span className="text-zinc-300">--</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {accounts.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-zinc-400">
                  Select accounts from the table below
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
