# Binance Depth View (Frontend)

This is the frontend for the Real-Time Order Book Visualizer built with Next.js and TypeScript. It connects to Binance's public WebSocket API to stream aggregate trades and order book depth updates.

## Quick start

From the `frontend/` directory:

```powershell
npm install
npm run dev
```

Open http://localhost:3000 in your browser.

## Build

```powershell
npm run build
npm start
```

## Design notes

- WebSocket manager: `src/lib/BinanceWebSocketManager.ts` — encapsulates connection, buffering, snapshot fetch from REST API, and sequence synchronization.
- React hooks:
  - `useBinanceSocket` provides connection status, latest trade, and latest depth delta via context.
  - `useOrderBook` maintains in-memory Maps for bids/asks and derives sorted rows with cumulative totals.
- Performance: depth deltas are applied to Maps (O(1) updates) and UI recalculation is throttled via `requestAnimationFrame`.

## Deployment
Production: https://2-cents-six.vercel.app/
