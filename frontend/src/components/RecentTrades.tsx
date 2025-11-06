"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useSocket } from "@/context/SocketContext";
import StatusPill from "@/components/StatusPill";
import type { TradeEvent } from "@/types/market";

const MAX_TRADES = 50;

/**
 * Trade Row Component (Memoized)
 * 
 * Individual trade row to prevent unnecessary re-renders
 * Only re-renders when trade data or flash state changes
 */
const TradeRow = memo(function TradeRow({
    trade,
    isFlashing,
    formatTime,
}: {
    trade: TradeEvent;
    isFlashing: boolean;
    formatTime: (timestamp: number) => string;
}) {
    // Flash the price color briefly to indicate side
    const flashClass = useMemo(() => {
        if (!isFlashing) return "";
        return trade.side === "buy" ? "flash-green" : "flash-red";
    }, [isFlashing, trade.side]);

    return (
        <div className="grid grid-cols-3 px-4 py-2 text-sm border-b last:border-b-0 hover:bg-neutral-50 dark:hover:bg-neutral-900">
            <span className="font-mono tabular-nums text-neutral-600 dark:text-neutral-400">
                {formatTime(trade.time)}
            </span>
            <span
                className={`text-right font-mono tabular-nums font-semibold text-neutral-900 dark:text-neutral-100 ${flashClass}`}
            >
                {trade.price.toFixed(2)}
            </span>
            <span className="text-right font-mono tabular-nums text-neutral-700 dark:text-neutral-300">
                {trade.quantity.toFixed(6)}
            </span>
        </div>
    );
});

/**
 * Recent Trades Component
 * 
 * Displays the last 50 completed trades with:
 * - Trade time (formatted)
 * - Trade price
 * - Trade quantity
 * 
 * New trades appear at the top of the list.
 * 
 * Flash Effect:
 * - When a new trade arrives, it flashes with a background color
 * - Green flash for buy trades
 * - Red flash for sell trades
 * - Flash duration: 300ms
 */
export default function RecentTrades() {
    const { lastTrade, status: connectionStatus, reconnect } = useSocket();

    // State to store the list of trades (max 50)
    const [trades, setTrades] = useState<TradeEvent[]>([]);

    // State to track which trade should flash (identified by timestamp)
    const [flashingTradeId, setFlashingTradeId] = useState<number | null>(null);

    // Add new trades to the list when they arrive and trigger flash effect
    useEffect(() => {
        if (!lastTrade) return;

        setTrades((prev) => {
            // Add new trade at the beginning of the array
            const updated = [lastTrade, ...prev];
            // Keep only the last MAX_TRADES trades
            return updated.slice(0, MAX_TRADES);
        });

        // Trigger flash effect for the new trade
        setFlashingTradeId(lastTrade.time);

        // Clear flash effect after 300ms
        const flashTimeout = setTimeout(() => {
            setFlashingTradeId(null);
        }, 300);

        return () => clearTimeout(flashTimeout);
    }, [lastTrade]);

    // Format timestamp to readable time (memoized to prevent recreation)
    const formatTime = useCallback((timestamp: number): string => {
        return new Date(timestamp).toLocaleTimeString("en-US", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            fractionalSecondDigits: 3,
        });
    }, []);

    return (
        <div className="w-full mt-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Recent Trades</h2>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-500">
                        Showing {trades.length} of {MAX_TRADES} trades
                    </span>
                    <StatusPill status={connectionStatus} size="md" className="w-24" />
                    <button
                        className="px-3 py-2 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white text-neutral-900 shadow-sm dark:bg-neutral-900 dark:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800 whitespace-nowrap"
                        onClick={reconnect}
                        title="Force reconnect"
                        aria-label="Reconnect to WebSocket"
                    >
                        Reconnect
                    </button>
                </div>
            </div>

            {/* Table Container */}
            <div className="border rounded-xl overflow-hidden shadow-sm bg-white dark:bg-neutral-900">
                {/* Column Headers */}
                <div className="grid grid-cols-3 px-4 py-3 text-xs font-medium text-neutral-600 dark:text-neutral-300 border-b bg-neutral-50 dark:bg-neutral-800 sticky top-0 z-10">
                    <span>Time</span>
                    <span className="text-right">Price (USDT)</span>
                    <span className="text-right">Quantity (BTC)</span>
                </div>

                {/* Trades List */}
                <div className="max-h-96 overflow-y-auto">
                    {trades.length > 0 ? (
                        trades.map((trade, index) => (
                            <TradeRow
                                key={`trade-${trade.time}-${index}`}
                                trade={trade}
                                isFlashing={flashingTradeId === trade.time}
                                formatTime={formatTime}
                            />
                        ))
                    ) : (
                        <div className="px-4 py-8 text-center text-neutral-400 text-sm">
                            {connectionStatus === "connecting"
                                ? "Connecting to Binance..."
                                : connectionStatus === "open"
                                    ? "Waiting for trade data..."
                                    : `Connection: ${connectionStatus}`}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

