"use client";

import { createContext, useContext } from "react";
import { useBinanceSocket } from "@/hooks/useBinanceSocket";
import { useMarketConfig } from "@/context/MarketConfigContext";
import type { ConnectionStatus, DepthDeltaEvent, TradeEvent } from "@/types/market";

interface SocketState {
    status: ConnectionStatus;
    lastDepth: DepthDeltaEvent | null;
    lastTrade: TradeEvent | null;
    reconnect: () => void;
}

const SocketContext = createContext<SocketState | null>(null);

export function SocketProvider({ children }: { children: React.ReactNode }) {
    const { symbol, depthIntervalMs } = useMarketConfig();
    const { status, lastDepth, lastTrade, reconnect } = useBinanceSocket({
        symbol,
        depthIntervalMs,
    });

    return (
        <SocketContext.Provider value={{ status, lastDepth, lastTrade, reconnect }}>
            {children}
        </SocketContext.Provider>
    );
}

export function useSocket(): SocketState {
    const ctx = useContext(SocketContext);
    if (!ctx) throw new Error("useSocket must be used within SocketProvider");
    return ctx;
}


