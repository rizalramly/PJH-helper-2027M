// Jana semula data/catalog-coverage.json daripada fail katalog. Guna: pnpm catalog:coverage
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { buildCoverageManifest } from "../src/lib/catalog/coverage";
import { validateCatalogFile, type PageIndexEntry } from "../src/lib/catalog/validate";

const root = join(__dirname, "..");
const manifest = JSON.parse(readFileSync(join(root, "data/sources/manifest.json"), "utf8"));
const pageIndex: (PageIndexEntry & { index: number; label: string })[] =
  manifest.sources[0].page_index.pjhs;
const outPath = join(root, "data/catalog-coverage.json");
const previous = JSON.parse(readFileSync(outPath, "utf8"));

// CATALOG_ONLY=busyra,felda → hanya fail ini dikira (fail lain dianggap belum wujud).
const only = process.env.CATALOG_ONLY ? new Set(process.env.CATALOG_ONLY.split(",")) : null;

const reports = new Map(
  pageIndex.map((p) => {
    const file = join(root, "data/catalog/1448h", `${p.id}.json`);
    const report =
      existsSync(file) && (!only || only.has(p.id))
        ? validateCatalogFile(JSON.parse(readFileSync(file, "utf8")), p.id, pageIndex)
        : null;
    return [p.id, report] as const;
  }),
);

const out = buildCoverageManifest({
  seasonId: "1448H",
  pageIndex,
  reports,
  meta: {
    $comment: previous.$comment,
    datasetVersion: previous.datasetVersion,
    generatedAt: process.env.COVERAGE_DATE ?? previous.generatedAt,
    sources: ["compilation-34pjh-1448h"],
    pagesTotal: 141,
    nonPjhPages: [1, 2],
  },
});
writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");
console.log(JSON.stringify(out.totals));
