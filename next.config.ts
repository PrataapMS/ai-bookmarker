import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Partial prerendering (static shell first, data streams in), `use cache`,
  // and <Activity>-preserved screens: the last few visited screens stay
  // mounted (hidden), so going back or switching tabs keeps their state.
  cacheComponents: true,
  experimental: {
    // React <ViewTransition> for smooth page-open/back animations.
    viewTransition: true,
    // Keep visited screens in the client router cache so switching tabs and
    // going back show them instantly; RefreshOnRevisit then refreshes their
    // data in the background. Server actions that revalidate still clear it.
    staleTimes: {
      dynamic: 300,
    },
  },
};

export default nextConfig;
