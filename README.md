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

This app can be deployed to Vercel or Netlify. For Vercel, push to a GitHub repo and import the project. Ensure environment allows outbound WebSocket connections (public hosting typically does).

Recommended Next.js production flags are already set in `next.config.ts` to reduce identifying headers and production source maps.

## Troubleshooting

- If the order book appears inconsistent after load, the manager will attempt to refetch a snapshot and retry sequence alignment. If retries fail, it will reconnect to resync.
- If you run into CORS/network issues fetching the REST snapshot, check your network or deploy to Vercel where outbound requests are allowed.

## License

MIT
