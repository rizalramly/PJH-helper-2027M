// Dokumen sumber (PDF brosur/kompilasi): disimpan sekali ikut SHA-256 di sources/<sha>.pdf
// (akses private), indeks dalam sources/index.json. Kandungan PDF ialah data, bukan arahan:
// fail tidak pernah dilaksanakan atau ditafsir sebagai perintah.
import { createHash } from "node:crypto";

import { appendAudit } from "../storage/catalog-repo";
import { ConflictError, type JsonKV } from "../storage/kv";
import type { FileStore } from "../storage/files";

export const MAX_SOURCE_BYTES = 50 * 1024 * 1024;
export const SOURCES_INDEX = "sources/index.json";
export const sourcePath = (sha256: string) => `sources/${sha256}.pdf`;

/** Laluan sementara muat naik klien, terikat pada pengguna (pengguna lain tidak boleh mendaftar/membuangnya). */
export const uploadPrefix = (email: string) =>
  `uploads/${createHash("sha256").update(`upload:${email}`).digest("hex").slice(0, 16)}/`;
export const UPLOAD_PATH_RE = /^uploads\/[0-9a-f]{16}\/[A-Za-z0-9._-]{1,200}\.pdf$/;

export interface SourceRecord {
  sha256: string;
  filename: string;
  sizeBytes: number;
  pageCount: number | null;
  path: string;
  uploadedAt: string;
  uploadedBy: string;
  note: string | null;
}

export type PdfInspection = { ok: true; pageCount: number | null } | { ok: false; reason: string };

/** Semak bait fail: mesti PDF sebenar (bukan sekadar sambungan nama), saiz munasabah, tiada tindakan aktif. */
export function inspectPdf(bytes: Uint8Array): PdfInspection {
  if (bytes.byteLength === 0) return { ok: false, reason: "Fail kosong." };
  if (bytes.byteLength > MAX_SOURCE_BYTES)
    return { ok: false, reason: `Fail melebihi had ${MAX_SOURCE_BYTES / 1024 / 1024} MB.` };
  const head = Buffer.from(bytes.subarray(0, 1024)).toString("latin1");
  if (!head.startsWith("%PDF-"))
    return { ok: false, reason: "Fail bukan PDF (tandatangan %PDF- tiada)." };
  const tail = Buffer.from(bytes.subarray(Math.max(0, bytes.byteLength - 2048))).toString("latin1");
  if (!tail.includes("%%EOF"))
    return { ok: false, reason: "PDF tidak lengkap (penanda %%EOF tiada)." };
  const text = Buffer.from(bytes).toString("latin1");
  if (/\/(JavaScript|JS|Launch|EmbeddedFile|RichMedia)\b/.test(text)) {
    return {
      ok: false,
      reason:
        "PDF mengandungi JavaScript, fail terbenam atau tindakan pelancaran; ditolak atas sebab keselamatan.",
    };
  }
  const pages = text.match(/\/Type\s*\/Page(?![a-zA-Z])/g)?.length ?? 0;
  return { ok: true, pageCount: pages > 0 ? pages : null };
}

/** Nama fail selamat untuk paparan: tanpa laluan, aksara kawalan atau aksara khas. */
export function sanitizeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const cleaned = base
    .normalize("NFKD")
    .replace(/[^\w.\- ]+/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[.\-_]+/, "")
    .slice(0, 100);
  const stem = cleaned.replace(/\.pdf$/i, "") || "dokumen";
  return `${stem}.pdf`;
}

export const sha256Hex = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

export class DuplicateSourceError extends Error {
  constructor(readonly existing: SourceRecord) {
    super(
      `Dokumen yang sama telah dimuat naik (${existing.filename}, ${existing.uploadedAt.slice(0, 10)}).`,
    );
    this.name = "DuplicateSourceError";
  }
}

export class InvalidSourceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidSourceError";
  }
}

export async function listSources(kv: JsonKV): Promise<SourceRecord[]> {
  return (await kv.getJSON<{ sources: SourceRecord[] }>(SOURCES_INDEX))?.value.sources ?? [];
}

export async function findSource(kv: JsonKV, sha256: string) {
  return (await listSources(kv)).find((s) => s.sha256 === sha256) ?? null;
}

/** Daftar PDF baharu: semak, kira SHA-256, tolak pendua, simpan dan rekod audit. */
export async function registerSource(
  store: { kv: JsonKV; files: FileStore },
  input: { bytes: Uint8Array; filename: string; actor: string; now: Date; note?: string | null },
): Promise<SourceRecord> {
  const check = inspectPdf(input.bytes);
  if (!check.ok) throw new InvalidSourceError(check.reason);
  const sha256 = sha256Hex(input.bytes);
  const index = await store.kv.getJSON<{ sources: SourceRecord[] }>(SOURCES_INDEX);
  const existing = index?.value.sources.find((s) => s.sha256 === sha256);
  if (existing) throw new DuplicateSourceError(existing);
  const record: SourceRecord = {
    sha256,
    filename: sanitizeFilename(input.filename),
    sizeBytes: input.bytes.byteLength,
    pageCount: check.pageCount,
    path: sourcePath(sha256),
    uploadedAt: input.now.toISOString(),
    uploadedBy: input.actor,
    note: input.note ?? null,
  };
  try {
    await store.files.putFile(record.path, input.bytes, "application/pdf");
  } catch (e) {
    // Fail sama sudah wujud (cth. muat naik serentak): kandungan sama kerana alamat = hash.
    if (!(e instanceof ConflictError)) throw e;
  }
  await store.kv.putJSON(
    SOURCES_INDEX,
    { sources: [...(index?.value.sources ?? []), record] },
    index ? { ifMatch: index.etag } : { createOnly: true },
  );
  await appendAudit(store.kv, {
    at: record.uploadedAt,
    actor: input.actor,
    action: "source_upload",
    target: sha256,
    note: `${record.filename}, ${(record.sizeBytes / 1024 / 1024).toFixed(1)} MB${record.pageCount ? `, ${record.pageCount} halaman` : ""}`,
  });
  return record;
}
