"use client";

import type { ConnectionStatus } from "@/types/market";

export default function StatusPill({
    status,
    size = "sm",
    className,
}: {
    status: ConnectionStatus;
    size?: "sm" | "md";
    className?: string;
}) {
    const color =
        status === "open"
            ? "bg-emerald-100 text-emerald-700"
            : status === "connecting"
            ? "bg-amber-100 text-amber-700"
            : status === "error"
            ? "bg-red-100 text-red-700"
            : "bg-neutral-100 text-neutral-600";

    const sizeClass = size === "md" ? "text-xs px-3 py-1.5" : "text-xs px-2 py-1";

    return (
        <span
            aria-label={`connection ${status}`}
            className={`${sizeClass} rounded font-medium tracking-wide uppercase inline-flex items-center justify-center ${color} ${className ?? ""}`}
        >
            {status}
        </span>
    );
}


