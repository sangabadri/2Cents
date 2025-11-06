"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BinanceWebSocketManager } from "@/lib/BinanceWebSocketManager";
import type {
    ConnectionStatus,
    DepthDeltaEvent,
    TradeEvent,
    BinanceSocketOptions,
} from "@/types/market";

/**
 * Custom React hook to connect to Binance WebSocket API
 * 
 * This hook uses the BinanceWebSocketManager class (OOP) to handle
 * all WebSocket logic, while the hook itself manages React state.
 * 
 * This hybrid approach provides:
 * - Better code organization (OOP for WebSocket logic)
 * - React-friendly interface (hook for state management)
 * - Reusable WebSocket manager (can be used outside React)
 * - Easier testing (class can be tested independently)
 * 
 * @param options - Configuration options for the WebSocket connection
 * @returns Object containing connection status, latest trade, latest depth update, and control functions
 */
export function useBinanceSocket(options?: BinanceSocketOptions) {
    // State for connection status
    const [status, setStatus] = useState<ConnectionStatus>("connecting");

    // State for latest parsed data
    const [lastTrade, setLastTrade] = useState<TradeEvent | null>(null);
    const [lastDepth, setLastDepth] = useState<DepthDeltaEvent | null>(null);

    // Ref to store the WebSocket manager instance (persists across re-renders)
    const managerRef = useRef<BinanceWebSocketManager | null>(null);

    // Initialize or update manager when options change
    useEffect(() => {
        // Create new manager instance
        const manager = new BinanceWebSocketManager(options);

        // Set up callbacks that update React state
        manager.setOnStatusChange((newStatus) => {
            setStatus(newStatus);
        });

        manager.setOnTrade((trade) => {
            setLastTrade(trade);
        });

        manager.setOnDepth((depth) => {
            setLastDepth(depth);
        });

        // Store manager in ref
        managerRef.current = manager;

        // Connect to WebSocket
        manager.connect();

        // Cleanup: disconnect and destroy manager when component unmounts or options change
        return () => {
            manager.destroy();
            managerRef.current = null;
        };
    }, [options?.symbol, options?.depthIntervalMs]); // Recreate manager if options change

    // Manual reconnect function (memoized to prevent unnecessary re-renders)
    const reconnect = useCallback(() => {
        managerRef.current?.reconnect();
    }, []);

    // Manual disconnect function (memoized to prevent unnecessary re-renders)
    const disconnect = useCallback(() => {
        managerRef.current?.disconnect();
    }, []);

    // Return hook interface
    return {
        status, // Connection status: "connecting" | "open" | "closed" | "error"
        lastTrade, // Latest parsed trade event (null if none received yet)
        lastDepth, // Latest parsed depth update (null if none received yet)
        reconnect, // Manual reconnect function
        disconnect, // Manual disconnect function
    } as const;
}
