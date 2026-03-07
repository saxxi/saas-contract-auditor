import { useQuery } from "@tanstack/react-query";
import { Account } from "@/components/contracts/types";

export function useAccounts() {
  return useQuery<Account[]>({
    queryKey: ["accounts"],
    queryFn: async () => {
      const res = await fetch("/api/accounts");
      return res.json();
    },
    staleTime: Infinity,
  });
}
