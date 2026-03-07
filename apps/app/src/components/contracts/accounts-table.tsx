"use client";

import { Account } from "./types";

interface AccountsTableProps {
  accounts: Account[];
  onSelect: (id: string) => void;
  onFindOpportunities: () => void;
  isFinding: boolean;
}

export function AccountsTable({ accounts, onSelect, onFindOpportunities, isFinding }: AccountsTableProps) {
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="flex items-center justify-between px-1 py-2">
        <h2 className="text-sm font-semibold text-zinc-500 uppercase tracking-wide">
          Accounts ({accounts.length})
        </h2>
        {accounts.length > 0 && (
          <button
            onClick={onFindOpportunities}
            disabled={isFinding}
            className="text-xs px-3 py-1 rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
          >
            {isFinding ? (
              <>
                <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Analyzing...
              </>
            ) : (
              "Find Opportunities"
            )}
          </button>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto border border-zinc-200 dark:border-zinc-700 rounded-lg">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
            <tr>
              <th className="w-10 px-3 py-2"></th>
              <th className="px-3 py-2 text-left font-medium text-zinc-600 dark:text-zinc-300">ID</th>
              <th className="px-3 py-2 text-left font-medium text-zinc-600 dark:text-zinc-300">Name</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((account) => (
              <tr
                key={account.id}
                className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
              >
                <td className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => onSelect(account.id)}
                    className="rounded border-zinc-300 cursor-pointer"
                  />
                </td>
                <td className="px-3 py-2 text-zinc-500 font-mono text-xs">{account.id}</td>
                <td className="px-3 py-2 font-medium">{account.name}</td>
              </tr>
            ))}
            {accounts.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-8 text-center text-zinc-400">
                  All accounts selected
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
