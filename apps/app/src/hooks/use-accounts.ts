import { useQuery } from "@tanstack/react-query";
import { Account } from "@/components/contracts/types";

export function useAccounts() {
  return useQuery<Account[]>({
    queryKey: ["accounts"],
    queryFn: async () => {
      const res = await fetch("/api/accounts");
      if (!res.ok) throw new Error(`Failed to fetch accounts: ${res.status}`);
      return res.json();
    },
    staleTime: Infinity,
    meta: { onError: (err: Error) => console.error("[useAccounts]", err.message) },
  });
}
