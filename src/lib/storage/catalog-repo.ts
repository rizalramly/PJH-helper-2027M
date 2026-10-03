// Katalog berversi di atas JsonKV (spesifikasi §11, pelan §0.1).
//
//   catalog/<season>/datasets/<version>.json   snapshot tidak boleh ubah (alamat kandungan)
//   catalog/<season>/active.json               penunjuk versi aktif (kemas kini bersyarat ETag)
//   audit/<yyyy-mm>/<iso>-<rand>.json          satu objek setiap peristiwa (append-only)
//
// Penerbitan kandungan yang sama dua kali menghasilkan versi yang sama, jadi seed idempotent
// dan tiada pendua dalam sejarah.
import { createHash, randomUUID } from "node:crypto";

import type { PjhCatalogFileInput } from "../catalog/schema";
import { ConflictError, type JsonKV, type StoredJSON } from "./kv";

export const SNAPSHOT_SCHEMA_VERSION = 1;

export interface DatasetSnapshot {
  schemaVersion: typeof SNAPSHOT_SCHEMA_VERSION;
  seasonId: string;
  datasetVersion: string;
  contentHash: string;
  createdAt: string;
  createdBy: string;
  /** Fail katalog mentah (JSON seperti dalam repo), disusun ikut pjh.id. */
  files: PjhCatalogFileInput[];
  /** Manifest liputan pada masa penerbitan. */
  coverage: unknown;
}

export interface ActivePointer {
  seasonId: string;
  datasetVersion: string;
  activatedAt: string;
  activatedBy: string;
  previousVersion: string | null;
}

export interface AuditEvent {
  id: string;
  at: string;
  actor: string;
  action: "publish" | "activate";
  seasonId: string;
  datasetVersion: string;
  previousVersion: string | null;
  note?: string;
}

const seasonKey = (seasonId: string) => seasonId.toLowerCase();
export const datasetPath = (seasonId: string, version: string) =>
  `catalog/${seasonKey(seasonId)}/datasets/${version}.json`;
export const activePath = (seasonId: string) => `catalog/${seasonKey(seasonId)}/active.json`;

/** JSON berkanun: kunci objek disusun supaya hash tidak bergantung pada susunan kunci. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

const pjhIdOf = (f: PjhCatalogFileInput) => f.pjh.id;

export function computeDatasetVersion(
  seasonId: string,
  files: PjhCatalogFileInput[],
  coverage: unknown,
) {
  const sorted = [...files].sort((a, b) => pjhIdOf(a).localeCompare(pjhIdOf(b)));
  const contentHash = createHash("sha256")
    .update(canonical({ seasonId, files: sorted, coverage }))
    .digest("hex");
  return {
    datasetVersion: `ds-${seasonKey(seasonId)}-${contentHash.slice(0, 12)}`,
    contentHash,
    sorted,
  };
}

async function appendAudit(kv: JsonKV, event: Omit<AuditEvent, "id">) {
  const id = randomUUID();
  const month = event.at.slice(0, 7);
  await kv.putJSON(
    `audit/${month}/${event.at.replace(/[:.]/g, "-")}-${id}.json`,
    { id, ...event },
    { createOnly: true },
  );
}

export type PublishResult =
  | { status: "unchanged"; datasetVersion: string }
  | {
      status: "published";
      datasetVersion: string;
      previousVersion: string | null;
      createdSnapshot: boolean;
    };

/**
 * Terbitkan katalog: tulis snapshot (jika belum wujud) kemudian jadikan aktif.
 * Jika versi aktif sudah sama → "unchanged" (idempotent).
 * Penunjuk dikemas kini dengan ifMatch; jika penerbit lain mendahului → ConflictError.
 */
export async function publishCatalog(
  kv: JsonKV,
  input: {
    seasonId: string;
    files: PjhCatalogFileInput[];
    coverage: unknown;
    actor: string;
    now: Date;
  },
): Promise<PublishResult> {
  if (input.files.some((f) => f.seasonId !== input.seasonId)) {
    throw new Error("Fail katalog daripada musim lain tidak boleh diterbitkan bersama.");
  }
  const { datasetVersion, contentHash, sorted } = computeDatasetVersion(
    input.seasonId,
    input.files,
    input.coverage,
  );
  const pointer = await kv.getJSON<ActivePointer>(activePath(input.seasonId));
  if (pointer?.value.datasetVersion === datasetVersion)
    return { status: "unchanged", datasetVersion };

  const at = input.now.toISOString();
  let createdSnapshot = false;
  const existing = await kv.getJSON<DatasetSnapshot>(datasetPath(input.seasonId, datasetVersion));
  if (existing) {
    if (existing.value.contentHash !== contentHash) {
      throw new Error(`Snapshot ${datasetVersion} wujud dengan hash berbeza; data mungkin rosak.`);
    }
  } else {
    const snapshot: DatasetSnapshot = {
      schemaVersion: SNAPSHOT_SCHEMA_VERSION,
      seasonId: input.seasonId,
      datasetVersion,
      contentHash,
      createdAt: at,
      createdBy: input.actor,
      files: sorted,
      coverage: input.coverage,
    };
    try {
      await kv.putJSON(datasetPath(input.seasonId, datasetVersion), snapshot, { createOnly: true });
      createdSnapshot = true;
    } catch (e) {
      // Penerbit lain menulis snapshot yang sama serentak: kandungan sama, teruskan.
      if (!(e instanceof ConflictError)) throw e;
    }
    await appendAudit(kv, {
      at,
      actor: input.actor,
      action: "publish",
      seasonId: input.seasonId,
      datasetVersion,
      previousVersion: pointer?.value.datasetVersion ?? null,
    });
  }

  const previousVersion = await activateVersion(
    kv,
    input.seasonId,
    datasetVersion,
    input.actor,
    input.now,
    pointer,
  );
  return { status: "published", datasetVersion, previousVersion, createdSnapshot };
}

/**
 * Jadikan versi sedia ada aktif (cth. rollback). Lontar ConflictError jika penunjuk berubah
 * sejak dibaca, dan Error jika versi tidak wujud.
 */
export async function activateVersion(
  kv: JsonKV,
  seasonId: string,
  datasetVersion: string,
  actor: string,
  now: Date,
  current?: StoredJSON<ActivePointer> | null,
): Promise<string | null> {
  const snapshot = await kv.getJSON<DatasetSnapshot>(datasetPath(seasonId, datasetVersion));
  if (!snapshot) throw new Error(`Versi ${datasetVersion} tidak wujud.`);
  const pointer =
    current === undefined ? await kv.getJSON<ActivePointer>(activePath(seasonId)) : current;
  const previousVersion = pointer?.value.datasetVersion ?? null;
  const next: ActivePointer = {
    seasonId,
    datasetVersion,
    activatedAt: now.toISOString(),
    activatedBy: actor,
    previousVersion,
  };
  await kv.putJSON(
    activePath(seasonId),
    next,
    pointer ? { ifMatch: pointer.etag } : { createOnly: true },
  );
  await appendAudit(kv, {
    at: now.toISOString(),
    actor,
    action: "activate",
    seasonId,
    datasetVersion,
    previousVersion,
  });
  return previousVersion;
}

export async function getActivePointer(kv: JsonKV, seasonId: string) {
  return (await kv.getJSON<ActivePointer>(activePath(seasonId)))?.value ?? null;
}

export async function getActiveSnapshot(
  kv: JsonKV,
  seasonId: string,
): Promise<DatasetSnapshot | null> {
  const pointer = await getActivePointer(kv, seasonId);
  if (!pointer) return null;
  return (
    (await kv.getJSON<DatasetSnapshot>(datasetPath(seasonId, pointer.datasetVersion)))?.value ??
    null
  );
}

/** Sejarah versi (semua snapshot yang pernah diterbitkan). */
export async function listDatasetVersions(kv: JsonKV, seasonId: string): Promise<string[]> {
  const prefix = `catalog/${seasonKey(seasonId)}/datasets/`;
  return (await kv.list(prefix)).map((p) => p.slice(prefix.length).replace(/\.json$/, ""));
}

export async function listAuditEvents(kv: JsonKV, month?: string): Promise<AuditEvent[]> {
  const paths = await kv.list(month ? `audit/${month}/` : "audit/");
  const events = await Promise.all(paths.map((p) => kv.getJSON<AuditEvent>(p)));
  const order: Record<AuditEvent["action"], number> = { publish: 0, activate: 1 };
  return events
    .flatMap((e) => (e ? [e.value] : []))
    .sort((a, b) => a.at.localeCompare(b.at) || order[a.action] - order[b.action]);
}
