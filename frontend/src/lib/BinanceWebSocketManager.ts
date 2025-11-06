/**
 * BinanceWebSocketManager - OOP class for managing Binance WebSocket connections
 * 
 * This class encapsulates all WebSocket logic, making it:
 * - Reusable outside React
 * - Easier to test
 * - Better organized with clear separation of concerns
 * 
 * The hook (useBinanceSocket) will use this class instance.
 */

import type {
    BinanceAggTradeEvent,
    BinanceDepthUpdateEvent,
    ConnectionStatus,
    DepthDeltaEvent,
    TradeEvent,
    BinanceSocketOptions,
} from "@/types/market";

export class BinanceWebSocketManager {
    private ws: WebSocket | null = null;
    private reconnectAttempts: number = 0;
    private reconnectTimeout: number | null = null;
    private readonly symbol: string;
    private readonly depthInterval: 100 | 250 | 500 | 1000;
    private maxReconnectDelay: number = 15000; // 15 seconds max
    private intentionalClose: boolean = false; // avoid reconnecting after manual close
    // Buffer incoming depthUpdate messages until a REST snapshot is applied
    private depthBuffer: BinanceDepthUpdateEvent[] = [];
    private snapshotApplied: boolean = false;

    // Event callbacks
    private onStatusChange?: (status: ConnectionStatus) => void;
    private onTrade?: (trade: TradeEvent) => void;
    private onDepth?: (depth: DepthDeltaEvent) => void;

    constructor(options?: BinanceSocketOptions) {
        this.symbol = (options?.symbol ?? "btcusdt").toLowerCase();
        this.depthInterval = options?.depthIntervalMs ?? 100;
    }

    /**
     * Set callback for connection status changes
     */
    setOnStatusChange(callback: (status: ConnectionStatus) => void): void {
        this.onStatusChange = callback;
    }

    /**
     * Set callback for trade events
     */
    setOnTrade(callback: (trade: TradeEvent) => void): void {
        this.onTrade = callback;
    }

    /**
     * Set callback for depth update events
     */
    setOnDepth(callback: (depth: DepthDeltaEvent) => void): void {
        this.onDepth = callback;
    }

    /**
     * Parse raw aggregate trade event from Binance API
     * 
     * Converts:
     * - String numbers to actual numbers
     * - Boolean 'm' field to TradeSide ('buy' or 'sell')
     * - Normalizes field names for our application
     */
    private parseTradeEvent(data: BinanceAggTradeEvent): TradeEvent {
        // Determine trade side: m = true means buyer was market maker (sell)
        const side: TradeEvent["side"] = data.m === true ? "sell" : "buy";

        return {
            price: Number(data.p), // Convert string to number
            quantity: Number(data.q), // Convert string to number
            time: Number(data.T), // Trade time in milliseconds
            side: side,
        };
    }

    /**
     * Parse raw depth update event from Binance API
     * 
     * Converts:
     * - String arrays to number arrays
     * - Normalizes field names for our application
     */
    private parseDepthEvent(data: BinanceDepthUpdateEvent): DepthDeltaEvent {
        return {
            eventTime: Number(data.E), // Event time in milliseconds
            // Convert [string, string] pairs to [number, number] pairs
            bids: data.b.map(([price, quantity]) => [Number(price), Number(quantity)]),
            asks: data.a.map(([price, quantity]) => [Number(price), Number(quantity)]),
            // Preserve sequence IDs so consumers can verify ordering if needed
            U: typeof data.U !== "undefined" ? Number(data.U) : undefined,
            u: typeof data.u !== "undefined" ? Number(data.u) : undefined,
        };
    }

    /**
     * Handle incoming WebSocket messages
     * 
     * Binance multi-stream format wraps messages like:
     * {
     *   "stream": "btcusdt@aggTrade",
     *   "data": { actual event data }
     * }
     */
    private handleMessage = (event: MessageEvent): void => {
        try {
            const message = JSON.parse(event.data as string);

            // Check if this is a multi-stream format (wrapped)
            let data: any;
            if (message.stream && message.data) {
                // Multi-stream format: extract the data
                data = message.data;
            } else {
                // Single stream format: data is directly in message
                data = message;
            }

            // Check if this is a valid event with event type
            if (!data || !data.e) {
                return; // Not a valid event, ignore
            }

            // Route to appropriate parser based on event type
            if (data.e === "aggTrade") {
                // Aggregate trade event
                const tradeEvent = this.parseTradeEvent(data as BinanceAggTradeEvent);
                this.onTrade?.(tradeEvent);
            } else if (data.e === "depthUpdate") {
                // Depth update event
                const raw = data as BinanceDepthUpdateEvent;
                // If snapshot hasn't been applied yet, buffer the raw events
                if (!this.snapshotApplied) {
                    this.depthBuffer.push(raw);
                    return;
                }

                const depthEvent = this.parseDepthEvent(raw);
                this.onDepth?.(depthEvent);
            }
        } catch (error) {
            // Silently ignore malformed messages
            // In production, you might want to log this
            console.error("Error parsing WebSocket message:", error);
        }
    };

    /**
     * Fetch REST snapshot and apply buffered depth updates following Binance sequencing rules
     */
    private async fetchAndApplySnapshot(): Promise<void> {
        return this.fetchAndApplySnapshotWithRetry(1);
    }

    private async sleep(ms: number): Promise<void> {
        return new Promise((res) => setTimeout(res, ms));
    }

    private async fetchAndApplySnapshotWithRetry(attempt: number): Promise<void> {
        const MAX_ATTEMPTS = 3;
        try {
            // Fetch snapshot from REST API
            const url = `https://api.binance.com/api/v3/depth?symbol=${this.symbol.toUpperCase()}&limit=1000`;
            const res = await fetch(url);
            if (!res.ok) {
                throw new Error(`Snapshot fetch failed: ${res.status}`);
            }
            const snap = await res.json();

            // Convert snapshot bids/asks from strings to numbers
            const bids: Array<[number, number]> = (snap.bids || []).map(([p, q]: [string, string]) => [Number(p), Number(q)]);
            const asks: Array<[number, number]> = (snap.asks || []).map(([p, q]: [string, string]) => [Number(p), Number(q)]);
            const lastUpdateId: number = Number(snap.lastUpdateId);

            // Emit snapshot as a special DepthDeltaEvent with isSnapshot flag
            const snapshotEvent: DepthDeltaEvent = {
                eventTime: Date.now(),
                bids,
                asks,
                isSnapshot: true,
                lastUpdateId,
            };

            // Notify consumers with the snapshot so they can replace internal state
            this.onDepth?.(snapshotEvent);

            // If there are buffered updates, apply them in order following Binance rules
            if (this.depthBuffer.length > 0) {
                // Find index to start applying: first buffer event where u >= lastUpdateId+1 and U <= lastUpdateId+1
                let startIndex = -1;
                for (let i = 0; i < this.depthBuffer.length; i++) {
                    const ev = this.depthBuffer[i];
                    if (typeof ev.u !== "undefined" && typeof ev.U !== "undefined") {
                        const u = Number(ev.u);
                        const U = Number(ev.U);
                        if (u >= lastUpdateId + 1 && U <= lastUpdateId + 1) {
                            startIndex = i;
                            break;
                        }
                    }
                }

                if (startIndex === -1) {
                    // Could not find a contiguous starting update — try refetching snapshot a few times before reconnect
                    if (attempt < MAX_ATTEMPTS) {
                        const backoff = 1000 * Math.pow(2, attempt - 1);
                        console.warn(`Depth buffer sequence mismatch after snapshot; retrying snapshot fetch (attempt ${attempt + 1}/${MAX_ATTEMPTS}) in ${backoff}ms`);
                        await this.sleep(backoff);
                        return this.fetchAndApplySnapshotWithRetry(attempt + 1);
                    }

                    // Exhausted retries — fallback to reconnect to resync
                    console.warn("Depth buffer sequence mismatch after snapshot; scheduling reconnect to resync after retries");
                    this.scheduleReconnect();
                    return;
                }

                // Apply buffered updates from startIndex onward
                for (let i = startIndex; i < this.depthBuffer.length; i++) {
                    const ev = this.depthBuffer[i];
                    const parsed = this.parseDepthEvent(ev);
                    // Mark these as non-snapshot deltas
                    this.onDepth?.(parsed);
                }
            }

            // Mark that snapshot has been applied so future depthUpdate messages are processed live
            this.snapshotApplied = true;
            // Clear buffer
            this.depthBuffer = [];
        } catch (err) {
            console.error("Error fetching/applying snapshot:", err);
            // If snapshot fetch failed, schedule reconnect to retry
            this.scheduleReconnect();
        }
    }

    /**
     * Clear any pending reconnection timeout
     */
    private clearReconnectTimeout(): void {
        if (this.reconnectTimeout !== null) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
    }

    /**
     * Schedule reconnection with exponential backoff
     * 
     * Backoff strategy:
     * - Attempt 1: 1 second
     * - Attempt 2: 2 seconds
     * - Attempt 3: 4 seconds
     * - Attempt 4: 8 seconds
     * - Max: 15 seconds
     */
    private scheduleReconnect(): void {
        this.clearReconnectTimeout();

        // Don't schedule if we still have an active socket or if this is an intentional close
        if (this.intentionalClose) {
            return;
        }
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            return;
        }

        this.reconnectAttempts += 1;
        const backoffMs = Math.min(
            1000 * Math.pow(2, this.reconnectAttempts - 1),
            this.maxReconnectDelay
        );

        this.reconnectTimeout = window.setTimeout(() => {
            this.connect();
        }, backoffMs);
    }

    /**
     * Reset reconnection attempts counter
     * Called when connection is successfully established
     */
    private resetReconnectAttempts(): void {
        this.reconnectAttempts = 0;
    }

    /**
     * Establish WebSocket connection to Binance
     * 
     * Uses combined stream URL to subscribe to both:
     * - Aggregate trades: {symbol}@aggTrade
     * - Order book depth: {symbol}@depth@{interval}ms
     */
    connect(): void {
        try {
            // Close existing connection if any
            this.disconnect();

            this.updateStatus("connecting");

            // Build WebSocket URL with combined streams
            const streams = `${this.symbol}@aggTrade/${this.symbol}@depth@${this.depthInterval}ms`;
            const wsUrl = `wss://stream.binance.com:9443/stream?streams=${streams}`;

            // Create WebSocket connection
            this.ws = new WebSocket(wsUrl);

            // Handle connection opened
            this.ws.onopen = () => {
                this.updateStatus("open");
                this.resetReconnectAttempts();
                // Reset snapshot state and start fetching a REST snapshot while buffering depth updates
                this.snapshotApplied = false;
                this.depthBuffer = [];
                // Start snapshot fetch/apply in background
                // (don't await here to avoid blocking onopen)
                void this.fetchAndApplySnapshot();
            };

            // Handle incoming messages
            this.ws.onmessage = this.handleMessage;

            // Handle connection errors
            this.ws.onerror = () => {
                this.updateStatus("error");
            };

            // Handle connection closed
            this.ws.onclose = () => {
                this.updateStatus("closed");
                const wasIntentional = this.intentionalClose;
                // Reset the flag after observing close
                this.intentionalClose = false;
                // Schedule automatic reconnection only if not an intentional close
                if (!wasIntentional) {
                    this.scheduleReconnect();
                }
            };
        } catch (error) {
            this.updateStatus("error");
            console.error("Error creating WebSocket connection:", error);
            this.scheduleReconnect();
        }
    }

    /**
     * Disconnect from WebSocket
     */
    disconnect(): void {
        this.clearReconnectTimeout();

        // Clear buffering and snapshot state
        this.depthBuffer = [];
        this.snapshotApplied = false;

        if (this.ws) {
            try {
                // Only close if connection is open or connecting
                if (
                    this.ws.readyState === WebSocket.OPEN ||
                    this.ws.readyState === WebSocket.CONNECTING
                ) {
                    // Mark as intentional to avoid auto-reconnect on onclose
                    this.intentionalClose = true;
                    this.ws.close();
                }
            } catch (error) {
                // Ignore errors during cleanup
            }
            this.ws = null;
        }

        this.updateStatus("closed");
    }

    /**
     * Manual reconnect function
     * Resets reconnection attempts and connects immediately
     */
    reconnect(): void {
        this.reconnectAttempts = 0;
        this.disconnect();
        this.connect();
    }

    /**
     * Get current connection status
     */
    getStatus(): ConnectionStatus {
        if (!this.ws) {
            return "closed";
        }

        switch (this.ws.readyState) {
            case WebSocket.CONNECTING:
                return "connecting";
            case WebSocket.OPEN:
                return "open";
            case WebSocket.CLOSING:
            case WebSocket.CLOSED:
            default:
                return "closed";
        }
    }

    /**
     * Update status and notify callback
     */
    private updateStatus(status: ConnectionStatus): void {
        this.onStatusChange?.(status);
    }

    /**
     * Cleanup: disconnect and clear timers
     * Should be called when the manager is no longer needed
     */
    destroy(): void {
        this.disconnect();
        this.onStatusChange = undefined;
        this.onTrade = undefined;
        this.onDepth = undefined;
        // clear any buffers/state
        this.depthBuffer = [];
        this.snapshotApplied = false;
    }
}

