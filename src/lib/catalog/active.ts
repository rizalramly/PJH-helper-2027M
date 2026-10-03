import "server-only";

import { join } from "node:path";

import type { Catalog } from "../engine/types";
import {
  computeDatasetVersion,
  getActivePointer,
  getActiveSnapshot,
} from "../storage/catalog-repo";
import { getStore } from "../storage/env";
import type { JsonKV } from "../storage/kv";
import { toEngineCatalog } from "./load";
import { readRepoCatalog } from "./repo-files";
import { pjhCatalogFileSchema } from "./schema";

export interface ActiveCatalog {
  catalog: Catalog;
  coverage: unknown;
  datasetVersion: string;
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
 * - Dengan BLOB_READ_WRITE_TOKEN: baca penunjuk aktif + snapshot daripada Vercel Blob (cache ikut versi).
 * - PJH_LOCAL_STORE (pembangunan/E2E): stor fail; jika belum ada penunjuk aktif, baca fail repo.
 * - Tanpa stor (pembangunan/CI): baca fail repo. Production tanpa token ialah ralat konfigurasi.
 */
export async function getActiveCatalog(
  seasonId: string,
  kv: JsonKV | null = getStore()?.kv ?? null,
): Promise<ActiveCatalog> {
  if (!kv) {
    if (process.env.VERCEL_ENV === "production") {
      throw new Error(
        "BLOB_READ_WRITE_TOKEN tidak ditetapkan; katalog production mesti dibaca daripada Vercel Blob.",
      );
    }
    return repoCatalog(seasonId);
  }

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
    if (kv.kind === "file") return repoCatalog(seasonId);
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
