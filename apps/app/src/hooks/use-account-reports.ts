import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Report } from "@/components/contracts/types";

export function useAccountReports() {
  return useQuery<Report[]>({
    queryKey: ["account-reports"],
    queryFn: async () => {
      const res = await fetch("/api/account_reports");
      return res.json();
    },
  });
}

export function useAccountReport(id: string | null) {
  return useQuery<Report>({
    queryKey: ["account-reports", id],
    queryFn: async () => {
      const res = await fetch(`/api/account_reports/${id}`);
      return res.json();
    },
    enabled: !!id,
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
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account-reports"] });
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
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account-reports"] });
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
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account-reports"] });
    },
  });
}
