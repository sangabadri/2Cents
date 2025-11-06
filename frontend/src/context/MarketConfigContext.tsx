"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { BinanceSocketOptions } from "@/types/market";

export type DepthInterval = NonNullable<BinanceSocketOptions["depthIntervalMs"]>;

interface MarketConfigState {
    symbol: string;
    depthIntervalMs: DepthInterval;
    setSymbol: (s: string) => void;
    setDepthIntervalMs: (i: DepthInterval) => void;
}

const MarketConfigContext = createContext<MarketConfigState | null>(null);

export function MarketConfigProvider({ children }: { children: React.ReactNode }) {
    const [symbol, setSymbol] = useState<string>("btcusdt");
    const [depthIntervalMs, setDepthIntervalMs] = useState<DepthInterval>(100);

    const value = useMemo(
        () => ({ symbol, depthIntervalMs, setSymbol, setDepthIntervalMs }),
        [symbol, depthIntervalMs]
    );

    return (
        <MarketConfigContext.Provider value={value}>{children}</MarketConfigContext.Provider>
    );
}

export function useMarketConfig(): MarketConfigState {
    const ctx = useContext(MarketConfigContext);
    if (!ctx) throw new Error("useMarketConfig must be used within MarketConfigProvider");
    return ctx;
}


