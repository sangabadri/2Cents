/**
 * Market data types for Binance WebSocket API
 * Based on Binance API documentation for aggregate trades and order book depth
 */

/**
 * Trade side: "buy" or "sell"
 * Determined by the "m" field in aggregate trade events:
 * - m = false → buyer is market taker → BUY (green)
 * - m = true → buyer is market maker → SELL (red)
 */
export type TradeSide = "buy" | "sell";

/**
 * Raw aggregate trade event from Binance WebSocket
 * Field names match Binance API exactly (single letters)
 */
export interface BinanceAggTradeEvent {
    e: string; // Event type: "aggTrade"
    E: number; // Event time (ms timestamp)
    s: string; // Symbol: "BTCUSDT"
    a: number; // Aggregate trade ID
    p: string; // Price (string format)
    q: string; // Quantity (string format)
    f: number; // First trade ID
    l: number; // Last trade ID
    T: number; // Trade time (ms timestamp)
    m: boolean; // Is buyer the market maker? (true = sell, false = buy)
    M: boolean; // Ignore this field
}

/**
 * Parsed trade event - normalized for our application
 * All numeric values are converted to numbers for easier use
 */
export interface TradeEvent {
    price: number; // Trade price
    quantity: number; // Trade quantity
    time: number; // Trade time in milliseconds (epoch)
    side: TradeSide; // "buy" or "sell"
}

/**
 * Raw order book depth update from Binance WebSocket
 * Field names match Binance API exactly
 */
export interface BinanceDepthUpdateEvent {
    e: string; // Event type: "depthUpdate"
    E: number; // Event time (ms timestamp)
    s: string; // Symbol: "BTCUSDT"
    U: number; // First update ID in event
    u: number; // Final update ID in event
    b: Array<[string, string]>; // Bid updates: [price, quantity] pairs
    a: Array<[string, string]>; // Ask updates: [price, quantity] pairs
}

/**
 * Parsed depth delta event - normalized for our application
 * Price and quantity arrays are converted to numbers
 */
export interface DepthDeltaEvent {
    eventTime: number; // Event time in milliseconds (epoch)
    bids: Array<[number, number]>; // [price, quantity] pairs for bids
    asks: Array<[number, number]>; // [price, quantity] pairs for asks
    // Optional sequence fields from Binance depthUpdate events
    U?: number; // First update ID in event
    u?: number; // Final update ID in event
    // If true this event is a full REST snapshot (replace state)
    isSnapshot?: boolean;
    // For REST snapshot responses: lastUpdateId
    lastUpdateId?: number;
}

/**
 * Order book level stored in a Map
 * Key: price (number)
 * Value: quantity/amount (number)
 * 
 * Using Map allows O(1) lookup and update operations
 */
export type OrderBookLevelMap = Map<number, number>;

/**
 * A single row in the order book display
 */
export interface OrderBookRow {
    price: number; // Price level
    amount: number; // Amount available at this price
    total: number; // Cumulative total from top of book to this row
}

/**
 * Derived data for one side of the order book (bids or asks)
 */
export interface OrderBookSideDerived {
    rows: OrderBookRow[]; // Sorted rows ready for display
    maxTotal: number; // Maximum cumulative total (for depth visualization)
}

/**
 * Complete derived order book state
 * Used for rendering the order book component
 */
export interface OrderBookDerived {
    bids: OrderBookSideDerived; // Buy orders (sorted DESC)
    asks: OrderBookSideDerived; // Sell orders (sorted ASC)
    spread: number | null; // Spread = lowest ask - highest bid (null if no data)
}

/**
 * WebSocket connection status
 */
export type ConnectionStatus = "connecting" | "open" | "closed" | "error";

/**
 * Options for Binance WebSocket connection
 * Used by both BinanceWebSocketManager class and useBinanceSocket hook
 */
export interface BinanceSocketOptions {
    symbol?: string; // Trading pair symbol (e.g., "btcusdt")
    depthIntervalMs?: 100 | 250 | 500 | 1000; // Depth update interval
}

