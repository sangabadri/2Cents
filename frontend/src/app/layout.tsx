import type { Metadata } from "next";
import "./globals.css";
import { MarketConfigProvider } from "@/context/MarketConfigContext";
import { SocketProvider } from "@/context/SocketContext";

export const metadata: Metadata = {
    title: "Real-Time Order Book Visualizer",
    description: "Live order book visualization using Binance WebSocket API",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body>
                <MarketConfigProvider>
                    <SocketProvider>{children}</SocketProvider>
                </MarketConfigProvider>
            </body>
        </html>
    );
}

