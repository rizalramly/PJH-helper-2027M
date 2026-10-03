import "server-only";

import { join } from "node:path";

import type { Catalog } from "../engine/types";
import {
  computeDatasetVersion,
  getActivePointer,
  getActiveSnapshot,
} from "../storage/catalog-repo";
import { publicStore } from "../storage/env";
import type { JsonKV } from "../storage/kv";
import { toEngineCatalog } from "./load";
import { readRepoCatalog, repoHasSeason } from "./repo-files";
import { pjhCatalogFileSchema } from "./schema";

export interface ActiveCatalog {
  catalog: Catalog;
  coverage: unknown;
  datasetVersion: string;
  /** `repo` = katalog asas dalam deployment (belum diterbitkan melalui panel, atau stor tiada). */
  source: "blob" | "store" | "repo";
}

const POINTER_TTL_MS = 30_000;
/** Cache ikut `<sumber>:<versi>`; versi berasaskan kandungan jadi sama bagi Blob dan repo. */
const byVersion = new Map<string, ActiveCatalog>();
let pointerCache: { seasonId: string; version: string; at: number } | null = null;

/** Kosongkan cache penunjuk selepas penerbitan supaya versi baharu dibaca serta-merta. */
export function invalidateActiveCatalog() {
  pointerCache = null;
}

/**
 * Katalog aktif bagi satu musim.
 * - Stor (Vercel Blob, atau PJH_LOCAL_STORE dalam pembangunan/E2E): penunjuk aktif + snapshot
 *   (cache ikut versi).
 * - Belum ada versi diterbitkan dalam stor, atau stor tidak dikonfigurasi: katalog asas repo yang
 *   dibundel bersama deployment (data sama dengan seed), supaya halaman awam tidak rosak pada
 *   penggunaan baharu. Fungsi pentadbir tetap memerlukan stor.
 */
export async function getActiveCatalog(
  seasonId: string,
  kv: JsonKV | null = publicStore()?.kv ?? null,
): Promise<ActiveCatalog> {
  if (!kv) return repoCatalog(seasonId);

  const now = Date.now();
  if (
    pointerCache &&
    pointerCache.seasonId === seasonId &&
    now - pointerCache.at < POINTER_TTL_MS
  ) {
    const cached = byVersion.get(`${kv.kind}:${pointerCache.version}`);
    if (cached) return cached;
  }
  const pointer = await getActivePointer(kv, seasonId);
  if (!pointer) {
    if (repoHasSeason(process.cwd(), seasonId)) return repoCatalog(seasonId);
    throw new Error(`Tiada katalog aktif untuk musim ${seasonId}. Jalankan pnpm db:seed.`);
  }
  pointerCache = { seasonId, version: pointer.datasetVersion, at: now };
  const cached = byVersion.get(`${kv.kind}:${pointer.datasetVersion}`);
  if (cached) return cached;

  const snapshot = await getActiveSnapshot(kv, seasonId);
  if (!snapshot) throw new Error(`Snapshot ${pointer.datasetVersion} tidak ditemui.`);
  const files = snapshot.files.map((f) => pjhCatalogFileSchema.parse(f));
  const active: ActiveCatalog = {
    catalog: toEngineCatalog(files, snapshot.datasetVersion),
    coverage: snapshot.coverage,
    datasetVersion: snapshot.datasetVersion,
    source: kv.kind === "file" ? "store" : "blob",
  };
  byVersion.set(`${kv.kind}:${snapshot.datasetVersion}`, active);
  return active;
}

function repoCatalog(seasonId: string): ActiveCatalog {
  const repo = readRepoCatalog(join(process.cwd()), seasonId);
  if (repo.errors.length)
    throw new Error(`Katalog repo tidak sah: ${repo.errors.slice(0, 3).join("; ")}`);
  const { datasetVersion } = computeDatasetVersion(seasonId, repo.raw, repo.coverage);
  const cached = byVersion.get(`repo:${datasetVersion}`);
  if (cached) return cached;
  const active: ActiveCatalog = {
    catalog: toEngineCatalog(repo.parsed, datasetVersion),
    coverage: repo.coverage,
    datasetVersion,
    source: "repo",
  };
  byVersion.set(`repo:${datasetVersion}`, active);
  return active;
}
