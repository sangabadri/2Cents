"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSocket } from "@/context/SocketContext";
import type {
    DepthDeltaEvent,
    OrderBookDerived,
    OrderBookLevelMap,
} from "@/types/market";

/**
 * Aggregates order book deltas into a complete order book state
 * 
 * This hook:
 * - Maintains price-level maps for bids and asks
 * - Processes depth delta updates (add/update/remove price levels)
 * - Derives sorted arrays with cumulative totals for display
 * - Calculates spread between best bid and best ask
 * 
 * Uses Map data structure for O(1) price level updates
 */
export function useOrderBook() {
    // Get shared WebSocket data from context
    const { lastDepth, status, reconnect } = useSocket();

    // Store order book state in refs (persists across re-renders, doesn't trigger re-renders)
    const bidsMapRef = useRef<OrderBookLevelMap>(new Map());
    const asksMapRef = useRef<OrderBookLevelMap>(new Map());

    // Track version number to trigger recalculation when order book changes
    const [updateVersion, setUpdateVersion] = useState(0);
    // Throttle recalculations to once per animation frame to avoid render loops
    const updatePendingRef = useRef(false);

    /**
     * Process depth delta updates
     * 
     * Updates the order book maps based on incoming deltas:
     * - If quantity = 0: Remove price level
     * - If quantity > 0: Add or update price level
     */
    useEffect(() => {
        if (!lastDepth) return;

        // If this event is a REST snapshot, replace the entire maps
        if (lastDepth.isSnapshot) {
            bidsMapRef.current.clear();
            asksMapRef.current.clear();

            for (const [price, quantity] of lastDepth.bids) {
                if (quantity === 0) continue;
                bidsMapRef.current.set(price, quantity);
            }

            for (const [price, quantity] of lastDepth.asks) {
                if (quantity === 0) continue;
                asksMapRef.current.set(price, quantity);
            }
        } else {
            // Process bid updates (deltas)
            for (const [price, quantity] of lastDepth.bids) {
                if (quantity === 0) {
                    // Remove price level if quantity is zero
                    bidsMapRef.current.delete(price);
                } else {
                    // Add or update price level
                    bidsMapRef.current.set(price, quantity);
                }
            }

            // Process ask updates (deltas)
            for (const [price, quantity] of lastDepth.asks) {
                if (quantity === 0) {
                    // Remove price level if quantity is zero
                    asksMapRef.current.delete(price);
                } else {
                    // Add or update price level
                    asksMapRef.current.set(price, quantity);
                }
            }
        }

        // Trigger recalculation by updating version, throttled to next animation frame
        if (!updatePendingRef.current) {
            updatePendingRef.current = true;
            requestAnimationFrame(() => {
                setUpdateVersion((v) => v + 1);
                updatePendingRef.current = false;
            });
        }
    }, [lastDepth]);

    /**
     * Derive display-ready order book data
     * 
     * This computation:
     * 1. Converts Maps to sorted arrays
     * 2. Calculates cumulative totals
     * 3. Finds maximum total for depth visualization
     * 4. Calculates spread
     * 
     * Memoized to only recalculate when updateVersion changes
     */
    const derived: OrderBookDerived = useMemo(() => {
        // Convert bid map to sorted array (descending: highest price first)
        const bidEntries = Array.from(bidsMapRef.current.entries());
        bidEntries.sort((a, b) => b[0] - a[0]); // Sort by price DESC

        // Convert ask map to sorted array (ascending: lowest price first)
        const askEntries = Array.from(asksMapRef.current.entries());
        askEntries.sort((a, b) => a[0] - b[0]); // Sort by price ASC

        // Calculate cumulative totals for bids
        let cumulativeBid = 0;
        const bidRows = bidEntries.map(([price, amount]) => {
            cumulativeBid += amount;
            return {
                price,
                amount,
                total: cumulativeBid,
            };
        });
        const bidsMaxTotal =
            bidRows.length > 0
                ? bidRows.reduce((max, row) => Math.max(max, row.total), 0)
                : 0;

        // Calculate cumulative totals for asks
        let cumulativeAsk = 0;
        const askRows = askEntries.map(([price, amount]) => {
            cumulativeAsk += amount;
            return {
                price,
                amount,
                total: cumulativeAsk,
            };
        });
        const asksMaxTotal =
            askRows.length > 0
                ? askRows.reduce((max, row) => Math.max(max, row.total), 0)
                : 0;

        // Calculate spread (lowest ask - highest bid)
        const bestBid = bidRows[0]?.price ?? null;
        const bestAsk = askRows[0]?.price ?? null;
        const spread =
            bestBid !== null && bestAsk !== null ? bestAsk - bestBid : null;

        return {
            bids: {
                rows: bidRows,
                maxTotal: bidsMaxTotal,
            },
            asks: {
                rows: askRows,
                maxTotal: asksMaxTotal,
            },
            spread,
        };
    }, [updateVersion]); // Recalculate when updateVersion changes

    return {
        orderBook: derived,
        connectionStatus: status,
        isEmpty: bidsMapRef.current.size === 0 && asksMapRef.current.size === 0,
        reconnect,
    } as const;
}

