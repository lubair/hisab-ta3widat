import type { NextConfig } from "next";

const isGitHubPages = process.env.GITHUB_PAGES === "true";
const basePath = isGitHubPages ? "/hisab-ta3widat" : "";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_STATIC_EXPORT: String(isGitHubPages),
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  ...(isGitHubPages
    ? {
        output: "export" as const,
        basePath,
        trailingSlash: true,
        images: {
          unoptimized: true,
        },
        // Route handlers are `route.ts`; matching only `.tsx` keeps the server-only
        // /api/rules handlers out of the static export without moving their sources.
        pageExtensions: ["tsx"],
        experimental: {
          globalNotFound: true,
        },
      }
    : {
        cacheComponents: true,
        partialPrefetching: true,
        async redirects() {
          return [{ source: "/", destination: "/ar", permanent: false }];
        },
      }),
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
