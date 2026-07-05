import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  poweredByHeader: false,
  async rewrites() {
    return [
      { source: '/sitemap.xml', destination: '/api/sitemap' },
    ]
  },
};

export default nextConfig;
