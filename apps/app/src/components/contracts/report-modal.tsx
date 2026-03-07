"use client";

import { Account, Report } from "./types";

interface ReportModalProps {
  account: Account;
  report: Report;
  onClose: () => void;
}

export function ReportModal({ account, report, onClose }: ReportModalProps) {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 rounded-lg" onClick={onClose}>
      <div
        className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-[calc(100%-2rem)] max-h-[calc(100%-2rem)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-700">
          <div>
            <h2 className="text-lg font-semibold">{account.name}</h2>
            <span className="text-sm text-zinc-500">{account.id} &middot; {account.budget_report.tier}</span>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-2xl leading-none px-2"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 min-h-0 flex overflow-hidden">
          {/* Left: Report content */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  report.propositionType === "requires negotiation" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" :
                  report.propositionType === "upsell proposition" ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" :
                  report.propositionType === "poor usage" ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" :
                  report.propositionType === "at capacity" ? "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300" :
                  "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                }`}>
                  {report.propositionType}
                </span>
                <span className="text-sm text-zinc-500">
                  Success: <strong className={report.successPercent >= 70 ? "text-green-600" : report.successPercent >= 40 ? "text-amber-600" : "text-red-600"}>
                    {report.successPercent}%
                  </strong>
                </span>
                {report.intervene && (
                  <span className="text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded">
                    INTERVENTION NEEDED
                  </span>
                )}
              </div>

              <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-zinc-600 dark:text-zinc-300 mb-2">Analysis</h3>
                <p className="text-sm leading-relaxed">{report.content}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
                  <div className="text-zinc-500 text-xs mb-1">Users</div>
                  <div className="font-semibold">{account.active_users_report.active_users} / {account.active_users_report.seat_limit}</div>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
                  <div className="text-zinc-500 text-xs mb-1">Invoices</div>
                  <div className="font-semibold">{account.invoicing_usage_report.monthly_invoices} / {account.invoicing_usage_report.invoice_limit}</div>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
                  <div className="text-zinc-500 text-xs mb-1">Integrations</div>
                  <div className="font-semibold">{account.integrations_usage_report.active_integrations} / {account.integrations_usage_report.integration_limit}</div>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
                  <div className="text-zinc-500 text-xs mb-1">MRR</div>
                  <div className="font-semibold">${account.budget_report.mrr.toLocaleString()}</div>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
                  <div className="text-zinc-500 text-xs mb-1">Renewal</div>
                  <div className={`font-semibold ${account.budget_report.renewal_in_days <= 30 ? "text-red-600" : ""}`}>
                    {account.budget_report.renewal_in_days} days
                  </div>
                </div>
                <div className="bg-zinc-50 dark:bg-zinc-800 rounded-lg p-3">
                  <div className="text-zinc-500 text-xs mb-1">Payment</div>
                  <div className={`font-semibold ${account.budget_report.payment_status === "overdue" ? "text-red-600" : "text-green-600"}`}>
                    {account.budget_report.payment_status}
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
