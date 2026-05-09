import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        hostname: "assets.coingecko.com",
        protocol: "https",
      },
      {
        hostname: "coin-images.coingecko.com",
        protocol: "https",
      },
    ],
  },
};

export default nextConfig;
