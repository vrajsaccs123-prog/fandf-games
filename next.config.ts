import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  cacheOnNavigation: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  additionalPrecacheEntries: [{ url: "/offline", revision: "1" }],
});

const nextConfig: NextConfig = {
  // Allow images from common sources for game artwork
  images: {
    formats: ["image/avif", "image/webp"],
  },
  // Strict mode for better React dev experience
  reactStrictMode: true,
};

export default withSerwist(nextConfig);
