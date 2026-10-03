import "server-only";

import { join } from "node:path";

import { readRepoCatalog, repoHasSeason } from "../catalog/repo-files";
import { computeDatasetVersion, getActiveSnapshot } from "../storage/catalog-repo";
import type { Store } from "../storage/env";
import type { BaseCatalog } from "./drafts";

/**
 * Katalog asas untuk draf dan penerbitan: snapshot aktif dalam stor; jika belum ada versi
 * diterbitkan, fail repo yang dibundel (sama dengan katalog awam dan seed).
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
  if (!repoHasSeason(process.cwd(), seasonId)) {
    throw new Error(`Tiada katalog aktif atau fail repo untuk musim ${seasonId}.`);
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
