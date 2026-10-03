// Jana semula data/catalog-coverage.json daripada fail katalog. Guna: pnpm catalog:coverage
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { coverageEntry } from "../src/lib/catalog/coverage";
import { validateCatalogFile, type PageIndexEntry } from "../src/lib/catalog/validate";

const root = join(__dirname, "..");
const manifest = JSON.parse(readFileSync(join(root, "data/sources/manifest.json"), "utf8"));
const pageIndex: (PageIndexEntry & { index: number; label: string })[] =
  manifest.sources[0].page_index.pjhs;
const outPath = join(root, "data/catalog-coverage.json");
const previous = JSON.parse(readFileSync(outPath, "utf8"));

// CATALOG_ONLY=busyra,felda → hanya fail ini dikira (fail lain dianggap belum wujud).
const only = process.env.CATALOG_ONLY ? new Set(process.env.CATALOG_ONLY.split(",")) : null;

const pjhs = pageIndex.map((p) => {
  const file = join(root, "data/catalog/1448h", `${p.id}.json`);
  const report =
    existsSync(file) && (!only || only.has(p.id))
      ? validateCatalogFile(JSON.parse(readFileSync(file, "utf8")), p.id, pageIndex)
      : null;
  return coverageEntry(
    {
      index: p.index,
      id: p.id,
      label: p.label,
      pageRange: [p.pdf_pages[0], p.pdf_pages[1]],
      seasonId: "1448H",
    },
    report,
  );
});

const totals = {
  pjhExpected: pjhs.length,
  pjhWithCatalogFile: pjhs.filter((p) => p.processingStatus !== "not_started").length,
  pjhReviewed: pjhs.filter((p) => p.processingStatus === "reviewed").length,
  pjhBlocked: pjhs.filter((p) => p.processingStatus === "blocked").length,
  pjhApprovalVerified: pjhs.filter((p) => p.approvalStatus === "verified_approved").length,
  packageFamilies: pjhs.reduce((n, p) => n + (p.packageFamiliesIdentified ?? 0), 0),
  variantsIdentified: pjhs.reduce((n, p) => n + (p.variantsIdentified ?? 0), 0),
  variantsImported: pjhs.reduce((n, p) => n + p.variantsImported, 0),
  variantsPublished: pjhs.reduce((n, p) => n + p.variantsPublished, 0),
  unresolvedVariants: pjhs.reduce((n, p) => n + p.unresolvedVariants.length, 0),
};

const out = {
  $comment: previous.$comment,
  seasonId: "1448H",
  datasetVersion: previous.datasetVersion,
  generatedAt: process.env.COVERAGE_DATE ?? previous.generatedAt,
  sources: ["compilation-34pjh-1448h"],
  pagesTotal: 141,
  nonPjhPages: [1, 2],
  totals,
  pjhs,
};
writeFileSync(outPath, JSON.stringify(out, null, 2) + "\n");
console.log(JSON.stringify(totals));
