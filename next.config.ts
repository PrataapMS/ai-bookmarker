import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // React <ViewTransition> for smooth page-open/back animations.
    viewTransition: true,
  },
};

export default nextConfig;
