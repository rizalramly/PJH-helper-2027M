// Baca dan sahkan katalog daripada repo (data/catalog/<season>/*.json). Untuk seed, ujian
// mod pembangunan, dan sandaran production sebelum katalog pertama diterbitkan ke Blob.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { coverageEntry, type CoverageEntry } from "./coverage";
import type { PjhCatalogFile, PjhCatalogFileInput } from "./schema";
import { validateCatalogFile, type PageIndexEntry } from "./validate";

export interface RepoCatalog {
  seasonId: string;
  raw: PjhCatalogFileInput[];
  parsed: PjhCatalogFile[];
  coverage: { pjhs: CoverageEntry[] } & Record<string, unknown>;
  errors: string[];
}

type IndexEntry = PageIndexEntry & { index: number; label: string };

/** Ada fail katalog repo bagi musim ini? */
export function repoHasSeason(root: string, seasonId: string) {
  return existsSync(join(root, "data/catalog", seasonId.toLowerCase()));
}

export function readRepoCatalog(root: string, seasonId = "1448H"): RepoCatalog {
  const dir = join(root, "data/catalog", seasonId.toLowerCase());
  const manifest = JSON.parse(readFileSync(join(root, "data/sources/manifest.json"), "utf8"));
  const pageIndex: IndexEntry[] = manifest.sources[0].page_index.pjhs;
  const coverage = JSON.parse(readFileSync(join(root, "data/catalog-coverage.json"), "utf8"));
  const errors: string[] = [];
  const raw: PjhCatalogFileInput[] = [];
  const parsed: PjhCatalogFile[] = [];

  const ids = readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => f.replace(/\.json$/, ""))
    .sort();
  const reports = new Map<string, ReturnType<typeof validateCatalogFile>>();
  for (const id of ids) {
    const json = JSON.parse(readFileSync(join(dir, `${id}.json`), "utf8"));
    const report = validateCatalogFile(json, id, pageIndex);
    reports.set(id, report);
    if (!report.ok || !report.file) {
      errors.push(...report.errors.map((e) => `${id}: ${e}`));
      continue;
    }
    if (report.file.seasonId !== seasonId)
      errors.push(`${id}: musim ${report.file.seasonId} ≠ ${seasonId}`);
    raw.push(json);
    parsed.push(report.file);
  }

  // Manifest liputan mesti selaras dengan fail (jalankan pnpm catalog:coverage jika tidak).
  for (const p of pageIndex) {
    const expected = coverageEntry(
      {
        index: p.index,
        id: p.id,
        label: p.label,
        pageRange: [p.pdf_pages[0], p.pdf_pages[1]],
        seasonId,
      },
      reports.get(p.id) ?? null,
    );
    const actual = coverage.pjhs.find((e: CoverageEntry) => e.id === p.id);
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      errors.push(
        `data/catalog-coverage.json tidak selaras untuk ${p.id}; jalankan pnpm catalog:coverage`,
      );
    }
  }

  return { seasonId, raw, parsed, coverage, errors };
}
