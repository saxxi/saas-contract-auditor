import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Report } from "@/components/contracts/types";

export function useAccountReports() {
  return useQuery<Report[]>({
    queryKey: ["account-reports"],
    queryFn: async () => {
      const res = await fetch("/api/account_reports");
      if (!res.ok) throw new Error(`Failed to fetch reports: ${res.status}`);
      return res.json();
    },
    meta: { onError: (err: Error) => console.error("[useAccountReports]", err.message) },
  });
}

export function useAccountReport(id: string | null) {
  return useQuery<Report>({
    queryKey: ["account-reports", id],
    queryFn: async () => {
      const res = await fetch(`/api/account_reports/${id}`);
      if (!res.ok) throw new Error(`Failed to fetch report ${id}: ${res.status}`);
      return res.json();
    },
    enabled: !!id,
    meta: { onError: (err: Error) => console.error("[useAccountReport]", err.message) },
  });
}

export function useUpdateReportContent() {
  const queryClient = useQueryClient();
  return useMutation<Report, Error, { reportId: string; content: string }>({
    mutationFn: async ({ reportId, content }) => {
      const res = await fetch(`/api/account_reports/${reportId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error(`Failed to update report: ${res.status}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account-reports"] });
    },
    onError: (err) => {
      console.error("[useUpdateReportContent]", err.message);
    },
  });
}

export function useGenerateReport() {
  const queryClient = useQueryClient();
  return useMutation<Report, Error, string>({
    mutationFn: async (accountId: string) => {
      const res = await fetch(`/api/accounts/${accountId}/account_reports`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(`Failed to generate report: ${res.status}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account-reports"] });
    },
    onError: (err) => {
      console.error("[useGenerateReport]", err.message);
    },
  });
}

export function useGenerateReportsBatch() {
  const queryClient = useQueryClient();
  return useMutation<Report[], Error, string[]>({
    mutationFn: async (accountIds: string[]) => {
      const res = await fetch("/api/account_reports/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ account_ids: accountIds }),
      });
      if (!res.ok) throw new Error(`Failed to generate batch reports: ${res.status}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account-reports"] });
    },
    onError: (err) => {
      console.error("[useGenerateReportsBatch]", err.message);
    },
  });
}
