export function formatPrice(value: number, fractionDigits = 2): string {
    return value.toLocaleString(undefined, {
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
    });
}

export function formatQty(value: number, fractionDigits = 6): string {
    return value.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: fractionDigits,
    });
}

export function calcMidPrice(bestBid: number | null, bestAsk: number | null): number | null {
    if (bestBid == null || bestAsk == null) return null;
    return (bestBid + bestAsk) / 2;
}

export function spreadBps(spread: number, mid: number | null): number | null {
    if (mid == null || mid === 0) return null;
    return (spread / mid) * 10000;
}


