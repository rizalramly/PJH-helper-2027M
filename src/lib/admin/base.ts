import "server-only";

import { join } from "node:path";

import { readRepoCatalog } from "../catalog/repo-files";
import { computeDatasetVersion, getActiveSnapshot } from "../storage/catalog-repo";
import type { Store } from "../storage/env";
import type { BaseCatalog } from "./drafts";

/**
 * Katalog asas untuk draf dan penerbitan: snapshot aktif dalam stor; bagi stor setempat
 * tanpa versi aktif, fail repo (seperti seed).
 */
export async function loadBaseCatalog(store: Store, seasonId: string): Promise<BaseCatalog> {
  const snap = await getActiveSnapshot(store.kv, seasonId);
  if (snap) {
    return {
      seasonId,
      datasetVersion: snap.datasetVersion,
      files: snap.files,
      coverage: snap.coverage,
    };
  }
  if (store.kind !== "file") {
    throw new Error(`Tiada katalog aktif untuk musim ${seasonId}. Jalankan pnpm db:seed dahulu.`);
  }
  const repo = readRepoCatalog(join(process.cwd()), seasonId);
  if (repo.errors.length) throw new Error(`Katalog repo tidak sah: ${repo.errors[0]}`);
  return {
    seasonId,
    datasetVersion: computeDatasetVersion(seasonId, repo.raw, repo.coverage).datasetVersion,
    files: repo.raw,
    coverage: repo.coverage,
  };
}
