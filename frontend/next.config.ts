import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Minimal production-hiding flags */
  poweredByHeader: false,
  productionBrowserSourceMaps: false,
};

export default nextConfig;