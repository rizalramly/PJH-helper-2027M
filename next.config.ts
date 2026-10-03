import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Katalog asas repo dibaca pada runtime (seed, dan sandaran sebelum katalog pertama
  // diterbitkan ke Blob). Hanya fail JSON ini dibundel; PDF sumber (docs/) tidak disertakan.
  outputFileTracingIncludes: {
    "/**": [
      "./data/catalog/**/*.json",
      "./data/catalog-coverage.json",
      "./data/sources/manifest.json",
    ],
  },
};

export default nextConfig;
