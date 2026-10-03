// Stor fail setempat (pembangunan dan E2E sahaja; production menggunakan Vercel Blob).
// Diaktifkan dengan PJH_LOCAL_STORE=<direktori>. ETag = hash kandungan.
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, sep } from "node:path";

import type { FileStore, StoredFile } from "./files";
import { ConflictError, type JsonKV, type PutOptions, type StoredJSON } from "./kv";

const SAFE_PATH = /^[a-z0-9][a-z0-9/_.@-]*$/i;

/** Tolak laluan yang boleh keluar dari direktori stor. */
export function safeJoin(root: string, path: string) {
  if (!SAFE_PATH.test(path) || path.split("/").some((p) => p === ".." || p === "")) {
    throw new Error(`Laluan stor tidak sah: ${path}`);
  }
  return join(root, ...path.split("/"));
}

const etagOf = (body: string | Uint8Array) =>
  `"f${createHash("sha256").update(body).digest("hex").slice(0, 20)}"`;

async function readOrNull(file: string) {
  try {
    return await readFile(file);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw e;
  }
}

async function atomicWrite(file: string, data: string | Uint8Array) {
  await mkdir(dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(tmp, data);
  await rename(tmp, file);
}

async function walk(dir: string): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
  const out: string[] = [];
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full)));
    else if (!e.name.endsWith(".tmp")) out.push(full);
  }
  return out;
}

export class FileKV implements JsonKV {
  readonly kind = "file" as const;
  constructor(private readonly root: string) {}

  async getJSON<T>(path: string): Promise<StoredJSON<T> | null> {
    const buf = await readOrNull(safeJoin(this.root, path));
    if (!buf) return null;
    const body = buf.toString("utf8");
    return { value: JSON.parse(body) as T, etag: etagOf(body) };
  }

  async putJSON(path: string, value: unknown, options: PutOptions = {}) {
    const file = safeJoin(this.root, path);
    const existing = await readOrNull(file);
    if (options.createOnly && existing) throw new ConflictError(`${path} sudah wujud`);
    if (
      options.ifMatch !== undefined &&
      (!existing || etagOf(existing.toString("utf8")) !== options.ifMatch)
    ) {
      throw new ConflictError(`${path} telah berubah (ETag tidak sepadan)`);
    }
    const body = JSON.stringify(value);
    await atomicWrite(file, body);
    return { etag: etagOf(body) };
  }

  async list(prefix: string) {
    const files = await walk(this.root);
    return files
      .map((f) => relative(this.root, f).split(sep).join("/"))
      .filter((p) => p.startsWith(prefix) && !p.endsWith(".meta"))
      .sort();
  }

  async delete(path: string) {
    await rm(safeJoin(this.root, path), { force: true });
  }
}

export class LocalFileStore implements FileStore {
  readonly kind = "file" as const;
  constructor(private readonly root: string) {}

  async putFile(path: string, data: Uint8Array, contentType: string) {
    const file = safeJoin(this.root, path);
    if (await readOrNull(file)) throw new ConflictError(`${path} sudah wujud`);
    await atomicWrite(file, data);
    await atomicWrite(`${file}.meta`, JSON.stringify({ contentType }));
  }

  async getFile(path: string): Promise<StoredFile | null> {
    const file = safeJoin(this.root, path);
    const data = await readOrNull(file);
    if (!data) return null;
    const meta = await readOrNull(`${file}.meta`);
    const contentType = meta
      ? (JSON.parse(meta.toString("utf8")) as { contentType: string }).contentType
      : "application/octet-stream";
    return { data: new Uint8Array(data), size: data.byteLength, contentType };
  }

  async exists(path: string) {
    try {
      await stat(safeJoin(this.root, path));
      return true;
    } catch {
      return false;
    }
  }

  async delete(path: string) {
    const file = safeJoin(this.root, path);
    await rm(file, { force: true });
    await rm(`${file}.meta`, { force: true });
  }
}
