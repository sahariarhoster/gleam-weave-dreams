import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Wallet } from "lucide-react";
import { getMyCreditTotal } from "@/lib/credit-total.functions";

export function CreditPill() {
  const fn = useServerFn(getMyCreditTotal);
  const q = useQuery({
    queryKey: ["my-credit-total"],
    queryFn: () => fn(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const total = q.data?.total ?? 0;
  const tone =
    total === 0
      ? "bg-red-50 text-red-700 border-red-200"
      : total < 100
        ? "bg-amber-50 text-amber-800 border-amber-200"
        : "bg-emerald-50 text-emerald-700 border-emerald-200";
  return (
    <Link
      to="/credits"
      className={`hidden sm:inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium hover:opacity-90 ${tone}`}
      title="Available credits across your brands"
    >
      <Wallet className="h-3.5 w-3.5" />
      <span>{total.toLocaleString()} credits</span>
    </Link>
  );
}
