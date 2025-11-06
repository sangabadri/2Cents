"use client";

import { useMemo } from "react";
import { useMarketConfig, type DepthInterval } from "@/context/MarketConfigContext";
import { useSocket } from "@/context/SocketContext";
import StatusPill from "@/components/StatusPill";

const SYMBOLS = ["btcusdt", "ethusdt", "bnbusdt", "solusdt"];
const INTERVALS = [100, 250, 500, 1000] as const;

export default function TopBar() {
    const { symbol, depthIntervalMs, setSymbol, setDepthIntervalMs } = useMarketConfig();
    const { status, reconnect } = useSocket();

    const title = useMemo(() => {
        const base = symbol.toUpperCase();
        return `Order Book: ${base}`;
    }, [symbol]);

    return (
        <div className="sticky top-0 z-30 -mx-4 sm:-mx-8 px-4 sm:px-8 pt-3 pb-4 mb-6 bg-white/70 dark:bg-neutral-950/60 backdrop-blur border-b shadow-md">
            <div className="mx-auto max-w-7xl flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">
                    {title}
                </h1>

                <div className="grid grid-cols-2 sm:flex sm:items-end gap-4">
                    <div className="flex flex-col">
                        <label className="text-[11px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Symbol</label>
                        <select
                            value={symbol}
                            onChange={(e) => setSymbol(e.target.value.toLowerCase())}
                            className="mt-1 px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white text-neutral-900 shadow-sm dark:bg-neutral-900 dark:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-sm"
                        >
                            {SYMBOLS.map((s) => (
                                <option key={s} value={s}>
                                    {s.toUpperCase()}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col">
                        <label className="text-[11px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Depth Interval</label>
                        <select
                            value={depthIntervalMs}
                            onChange={(e) => setDepthIntervalMs(Number(e.target.value) as DepthInterval)}
                            className="mt-1 px-3 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white text-neutral-900 shadow-sm dark:bg-neutral-900 dark:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800 text-sm"
                        >
                            {INTERVALS.map((i) => (
                                <option key={i} value={i}>{i} ms</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col">
                        <label className="text-[11px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Status</label>
                        <div className="mt-1 flex items-center gap-2">
                            <StatusPill status={status} size="md" className="w-[96px]" />
                            <button
                                onClick={reconnect}
                                title="Force reconnect"
                                className="px-3 py-2 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white text-neutral-900 shadow-sm dark:bg-neutral-900 dark:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800 whitespace-nowrap"
                            >
                                Reconnect
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}


