import { useQuery } from "@tanstack/react-query";
import { AccountSummary } from "@/components/contracts/types";

export function useAccountSummaries(accountIds: string[]) {
  const sorted = [...accountIds].sort().join(",");
  return useQuery<AccountSummary[]>({
    queryKey: ["account-summaries", sorted],
    queryFn: async () => {
      const res = await fetch(`/api/account_summaries?account_ids=${sorted}`);
      return res.json();
    },
    enabled: accountIds.length > 0,
  });
}
