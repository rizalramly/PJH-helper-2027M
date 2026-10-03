import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Penerbitan katalog awal (/api/admin/seed) membaca fail katalog repo pada runtime.
  // Hanya fail JSON ini dibundel; PDF sumber (docs/) tidak disertakan.
  outputFileTracingIncludes: {
    "/api/admin/seed": [
      "./data/catalog/**/*.json",
      "./data/catalog-coverage.json",
      "./data/sources/manifest.json",
    ],
  },
};

export default nextConfig;
