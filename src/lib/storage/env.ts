import "server-only";

import { isAbsolute, join } from "node:path";

import { BlobKV } from "./blob-kv";
import { FileKV, LocalFileStore } from "./file-kv";
import { BlobFileStore, type FileStore } from "./files";
import type { JsonKV } from "./kv";

export interface Store {
  kind: JsonKV["kind"];
  kv: JsonKV;
  files: FileStore;
}

let override: Store | null | undefined;

/** Ujian sahaja: guna stor dalam memori. `undefined` = kembali kepada konfigurasi env. */
export function setStoreForTests(store: Store | null | undefined) {
  override = store;
}

/**
 * Stor persisten mengikut persekitaran:
 * - BLOB_READ_WRITE_TOKEN → Vercel Blob (wajib dalam production).
 * - PJH_LOCAL_STORE=<dir> → fail setempat (pembangunan/E2E sahaja).
 * - Tiada → null (katalog dibaca daripada repo; fungsi pentadbir tidak tersedia).
 */
export function getStore(): Store | null {
  if (override !== undefined) return override;
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (token) return { kind: "vercel-blob", kv: new BlobKV(token), files: new BlobFileStore(token) };
  if (process.env.VERCEL_ENV === "production") {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN tidak ditetapkan; production mesti menggunakan Vercel Blob.",
    );
  }
  const dir = process.env.PJH_LOCAL_STORE;
  if (dir) {
    // Pembangunan/E2E sahaja; jangan jejak sistem fail untuk penggunaan (deployment).
    const root = isAbsolute(dir) ? dir : join(/*turbopackIgnore: true*/ process.cwd(), dir);
    return { kind: "file", kv: new FileKV(root), files: new LocalFileStore(root) };
  }
  return null;
}

export class StoreUnavailableError extends Error {
  constructor() {
    super(
      "Stor data tidak dikonfigurasi. Tetapkan BLOB_READ_WRITE_TOKEN (Vercel Blob) atau PJH_LOCAL_STORE (pembangunan).",
    );
    this.name = "StoreUnavailableError";
  }
}

/**
 * Stor untuk bacaan awam dan semakan sesi: konfigurasi production yang tidak lengkap dilog dan
 * dianggap "tiada stor" (katalog asas repo digunakan), bukan ralat yang merosakkan halaman.
 */
export function publicStore(): Store | null {
  try {
    return getStore();
  } catch (e) {
    console.error("[stor]", (e as Error).message);
    return null;
  }
}

/** Fungsi pentadbir: tanpa stor → StoreUnavailableError (503 dengan mesej konfigurasi). */
export function requireStore(): Store {
  const s = publicStore();
  if (!s) throw new StoreUnavailableError();
  return s;
}
