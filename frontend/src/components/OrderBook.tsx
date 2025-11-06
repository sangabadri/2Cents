"use client";

import { memo, useMemo } from "react";
import { useOrderBook } from "@/hooks/useOrderBook";
import type { OrderBookRow } from "@/types/market";
import { calcMidPrice, spreadBps, formatPrice, formatQty } from "@/lib/format";
import StatusPill from "@/components/StatusPill";

/**
 * Order Book Row Component (Memoized)
 * 
 * Individual row in the order book to prevent unnecessary re-renders
 */
const OrderBookRow = memo(function OrderBookRow({
    row,
    maxTotal,
    side,
}: {
    row: OrderBookRow;
    maxTotal: number;
    side: "bid" | "ask";
}) {
    // Calculate depth bar width as percentage of max total
    const depthWidth = useMemo(() => {
        return maxTotal > 0 ? (row.total / maxTotal) * 100 : 0;
    }, [row.total, maxTotal]);

    const priceColor =
        side === "bid"
            ? "text-green-600 dark:text-green-400"
            : "text-red-600 dark:text-red-400";
    const barColor =
        side === "bid" ? "bg-green-500/10" : "bg-red-500/10";

    return (
        <div className="relative grid grid-cols-3 px-4 py-2 text-sm border-b last:border-b-0 hover:bg-neutral-50 dark:hover:bg-neutral-900">
            {/* Depth visualization bar */}
            <div
                className={`absolute inset-0 ${barColor}`}
                style={{ width: `${depthWidth}%` }}
            />

            {/* Content */}
            <span className={`relative ${priceColor} font-mono tabular-nums`}>
                {row.price.toFixed(2)}
            </span>
            <span className="relative text-right font-mono tabular-nums text-neutral-700 dark:text-neutral-300">
                {formatQty(row.amount)}
            </span>
            <span className="relative text-right font-mono tabular-nums text-neutral-700 dark:text-neutral-300">
                {formatQty(row.total)}
            </span>
        </div>
    );
});

/**
 * Order Book Component
 * 
 * Displays real-time order book with:
 * - Bids (buy orders) on the left, sorted DESC (highest first)
 * - Asks (sell orders) on the right, sorted ASC (lowest first)
 * - Price, Amount, and Total (cumulative) columns
 * - Spread display between columns
 * - Depth visualization bars showing liquidity depth
 * 
 * Performance optimizations:
 * - Memoized row components to prevent unnecessary re-renders
 * - useMemo for spread calculation
 */
export default function OrderBook() {
    const { orderBook, connectionStatus, isEmpty } = useOrderBook();
    const MAX_ROWS = 50;

    // Calculate spread display (must be at top level, before any conditional returns)
    const spreadDisplay = useMemo(() => {
        if (orderBook.spread === null) return null;
        const bestBid = orderBook.bids.rows[0]?.price ?? null;
        const bestAsk = orderBook.asks.rows[0]?.price ?? null;
        const mid = calcMidPrice(bestBid, bestAsk);
        const bps = spreadBps(orderBook.spread, mid);
        return (
            <div className="mb-4 text-center">
                <div className="inline-block px-4 py-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 mr-2">
                        Spread:
                    </span>
                    <span className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 font-mono">
                        {formatPrice(orderBook.spread, 2)} USDT
                    </span>
                    {bps != null && (
                        <span className="ml-2 text-xs text-neutral-500 dark:text-neutral-400">({bps.toFixed(1)} bps)</span>
                    )}
                </div>
            </div>
        );
    }, [orderBook.spread]);

    // Show loading/empty state
    if (isEmpty) {
        return (
            <div className="w-full p-8 text-center">
                <p className="text-neutral-500">
                    {connectionStatus === "connecting"
                        ? "Connecting to Binance..."
                        : connectionStatus === "open"
                        ? "Waiting for order book data..."
                        : `Connection: ${connectionStatus}`}
                </p>
            </div>
        );
    }

    return (
        <div className="w-full">
            {/* Header with connection status */}
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">Order Book</h2>
                {/* Status pill removed to avoid duplication with top bar */}
            </div>

            {/* Spread Display */}
            {spreadDisplay}

            {/* Two-column layout: Bids and Asks (always side-by-side) */}
            <div className="grid grid-cols-2 gap-6">
                {/* Bids Column (Left) */}
                <div className="border rounded-xl overflow-hidden shadow-sm bg-white dark:bg-neutral-900">
                    <div className="bg-green-50 dark:bg-green-900 px-4 py-2">
                        <h3 className="text-green-700 dark:text-green-200 font-semibold">
                            Bids (Buy Orders)
                        </h3>
                    </div>

                    {/* Column Headers */}
                    <div className="grid grid-cols-3 px-4 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 border-b bg-neutral-50 dark:bg-neutral-800 sticky top-0 z-10">
                        <span>Price</span>
                        <span className="text-right">Amount</span>
                        <span className="text-right">Total</span>
                    </div>

                    {/* Bids Rows */}
                    <div className="max-h-[480px] overflow-y-auto">
                        {orderBook.bids.rows.length > 0 ? (
                            orderBook.bids.rows.slice(0, MAX_ROWS).map((row) => (
                                <OrderBookRow
                                    key={`bid-${row.price}`}
                                    row={row}
                                    maxTotal={orderBook.bids.maxTotal}
                                    side="bid"
                                />
                            ))
                        ) : (
                            <div className="px-4 py-8 text-center text-neutral-400 text-sm">
                                No bids available
                            </div>
                        )}
                    </div>
                </div>

                {/* Asks Column (Right) */}
                <div className="border rounded-xl overflow-hidden shadow-sm bg-white dark:bg-neutral-900">
                    <div className="bg-red-50 dark:bg-red-900 px-4 py-2">
                        <h3 className="text-red-700 dark:text-red-200 font-semibold">
                            Asks (Sell Orders)
                        </h3>
                    </div>

                    {/* Column Headers */}
                    <div className="grid grid-cols-3 px-4 py-2 text-xs font-medium text-neutral-600 dark:text-neutral-300 border-b bg-neutral-50 dark:bg-neutral-800 sticky top-0 z-10">
                        <span>Price</span>
                        <span className="text-right">Amount</span>
                        <span className="text-right">Total</span>
                    </div>

                    {/* Asks Rows */}
                    <div className="max-h-[480px] overflow-y-auto">
                        {orderBook.asks.rows.length > 0 ? (
                            orderBook.asks.rows.slice(0, MAX_ROWS).map((row) => (
                                <OrderBookRow
                                    key={`ask-${row.price}`}
                                    row={row}
                                    maxTotal={orderBook.asks.maxTotal}
                                    side="ask"
                                />
                            ))
                        ) : (
                            <div className="px-4 py-8 text-center text-neutral-400 text-sm">
                                No asks available
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

