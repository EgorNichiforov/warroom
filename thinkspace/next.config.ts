import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // THINKSPACE is a request-driven, client-rendered workspace over API routes.
  // Cache Components / partial prefetching add prerender validation that does not
  // fit live session data, so they stay off (see docs/DECISIONS.md, D-07).
  cacheComponents: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  serverExternalPackages: ["@electric-sql/pglite"],
};

export default nextConfig;
