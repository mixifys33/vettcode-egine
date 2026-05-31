import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  eslint: {
    // Disable ESLint during build to avoid TypeScript parsing errors
    // ESLint doesn't have TypeScript parser configured
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
