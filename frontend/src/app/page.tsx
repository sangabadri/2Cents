import dynamic from "next/dynamic";
import TopBar from "@/components/TopBar";

const OrderBook = dynamic(() => import("@/components/OrderBook"), {
  loading: () => (
    <div className="grid grid-cols-2 gap-6 mt-6">
      <div className="h-[520px] rounded-xl border bg-neutral-100 dark:bg-neutral-900 animate-pulse" />
      <div className="h-[520px] rounded-xl border bg-neutral-100 dark:bg-neutral-900 animate-pulse" />
    </div>
  ),
});

const RecentTrades = dynamic(() => import("@/components/RecentTrades"), {
  loading: () => (
    <div className="mt-8 h-[320px] rounded-xl border bg-neutral-100 dark:bg-neutral-900 animate-pulse" />
  ),
});

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-7xl p-4 sm:p-8">
        <TopBar />
        <OrderBook />
        <RecentTrades />
      </div>
    </main>
  );
}

