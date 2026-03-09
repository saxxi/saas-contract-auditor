"use client";

import { useRef, useState } from "react";
import { Account, AccountSummary, Report } from "./types";

const BATCH_SIZES = [5, 10, 20, 50, 100, 200] as const;

interface AccountsTableProps {
  accounts: Account[];
  selectedIds: Set<string>;
  reports: Map<string, Report>;
  summaries: Map<string, AccountSummary>;
  onSelect: (id: string) => void;
  onDeselect: (id: string) => void;
  onDeselectAll: () => void;
  onGenerateReport: (id: string) => void;
  onGenerateSelected: () => void;
  onOpenReport: (id: string) => void;
  onFindOpportunities: (batchSize: number) => void;
  generatingIds: Set<string>;
  isFinding: boolean;
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

function FindOpportunitiesButton({
  onFind,
  isFinding,
  unselectedCount,
}: {
  onFind: (batchSize: number) => void;
  isFinding: boolean;
  unselectedCount: number;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const defaultBatch = Math.min(5, unselectedCount);

  return (
    <div className="relative" ref={menuRef}>
      <div className="flex items-center">
        <button
          onClick={() => onFind(defaultBatch)}
          disabled={isFinding || unselectedCount === 0}
          className="text-xs px-3 py-1 rounded-l bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
        >
          {isFinding ? (
            <>
              <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Analyzing...
            </>
          ) : (
            `Find Opportunities (${defaultBatch})`
          )}
        </button>
        <button
          onClick={() => setShowMenu(!showMenu)}
          disabled={isFinding || unselectedCount === 0}
          className="text-xs px-1.5 py-1 rounded-r bg-blue-700 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border-l border-blue-500"
        >
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      {showMenu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg py-1 min-w-[120px]">
            {BATCH_SIZES.filter((size) => size <= unselectedCount).map((size) => (
              <button
                key={size}
                onClick={() => {
                  setShowMenu(false);
                  onFind(size);
                }}
                className="w-full text-left text-xs px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
              >
                Analyze {size} accounts
              </button>
            ))}
            {unselectedCount > 0 && !BATCH_SIZES.includes(unselectedCount as typeof BATCH_SIZES[number]) && (
              <button
                onClick={() => {
                  setShowMenu(false);
                  onFind(unselectedCount);
                }}
                className="w-full text-left text-xs px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors border-t border-zinc-200 dark:border-zinc-700"
              >
                All ({unselectedCount})
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function AccountsTable({
  accounts,
  selectedIds,
  reports,
  summaries,
  onSelect,
  onDeselect,
  onDeselectAll,
  onGenerateReport,
  onGenerateSelected,
  onOpenReport,
  onFindOpportunities,
  generatingIds,
  isFinding,
}: AccountsTableProps) {
  const isAnyGenerating = generatingIds.size > 0;
  const hasSelectedWithoutReport = accounts.some(
    (a) => selectedIds.has(a.id) && !reports.has(a.id)
  );
  const selectedCount = selectedIds.size;
  const unselectedCount = accounts.length - selectedCount;

  // Sort: selected first, then unselected. Stable within each group.
  const sorted = [...accounts].sort((a, b) => {
    const aSelected = selectedIds.has(a.id) ? 0 : 1;
    const bSelected = selectedIds.has(b.id) ? 0 : 1;
    return aSelected - bSelected;
  });

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex items-center justify-between px-1 py-2 gap-2">
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">
          Accounts ({accounts.length})
          {selectedCount > 0 && (
            <span className="ml-2 text-xs font-normal normal-case text-blue-600 dark:text-blue-400">
              {selectedCount} selected
              <button
                onClick={onDeselectAll}
                className="ml-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full text-zinc-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition-colors"
                title="Deselect all"
              >
                &times;
              </button>
            </span>
          )}
        </h2>
        <div className="flex items-center gap-2">
          <FindOpportunitiesButton
            onFind={onFindOpportunities}
            isFinding={isFinding}
            unselectedCount={unselectedCount}
          />
          {selectedCount > 0 && (
            <button
              onClick={onGenerateSelected}
              disabled={isAnyGenerating}
              className="text-xs px-3 py-1 rounded bg-zinc-800 text-white hover:bg-zinc-700 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
            >
              {isAnyGenerating ? (
                <>
                  <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate reports for selected"
              )}
            </button>
          )}
        </div>
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
            {sorted.map((account) => {
              const isSelected = selectedIds.has(account.id);
              const report = reports.get(account.id);
              return (
                <tr
                  key={account.id}
                  className={
                    isSelected
                      ? "border-b border-zinc-100 dark:border-zinc-800 bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      : "border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  }
                >
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => isSelected ? onDeselect(account.id) : onSelect(account.id)}
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
                    ) : isSelected ? (
                      <button
                        onClick={() => onGenerateReport(account.id)}
                        disabled={isAnyGenerating}
                        className="text-xs px-2 py-0.5 rounded border border-zinc-300 dark:border-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {generatingIds.has(account.id) ? "Generating..." : "Generate"}
                      </button>
                    ) : (
                      <span className="text-xs text-zinc-400">--</span>
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
                  No accounts found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
