import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Minimal production-hiding flags */
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
  devIndicators: false,
};

export default nextConfig;