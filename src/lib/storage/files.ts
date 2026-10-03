// Stor fail binari (PDF sumber). Vercel Blob dalam production (akses private), fail setempat
// atau memori untuk pembangunan dan ujian.
import { del, get, head, put } from "@vercel/blob";

import { ConflictError } from "./kv";

export interface StoredFile {
  data: Uint8Array;
  size: number;
  contentType: string;
}

export interface FileStore {
  readonly kind: "memory" | "vercel-blob" | "file";
  /** Tulis fail baharu; ConflictError jika laluan sudah wujud. */
  putFile(path: string, data: Uint8Array, contentType: string): Promise<void>;
  getFile(path: string): Promise<StoredFile | null>;
  exists(path: string): Promise<boolean>;
  delete(path: string): Promise<void>;
}

export class MemoryFileStore implements FileStore {
  readonly kind = "memory" as const;
  private files = new Map<string, StoredFile>();

  async putFile(path: string, data: Uint8Array, contentType: string) {
    if (this.files.has(path)) throw new ConflictError(`${path} sudah wujud`);
    this.files.set(path, { data: new Uint8Array(data), size: data.byteLength, contentType });
  }
  async getFile(path: string) {
    return this.files.get(path) ?? null;
  }
  async exists(path: string) {
    return this.files.has(path);
  }
  async delete(path: string) {
    this.files.delete(path);
  }
}

export class BlobFileStore implements FileStore {
  readonly kind = "vercel-blob" as const;
  constructor(private readonly token?: string) {}

  async putFile(path: string, data: Uint8Array, contentType: string) {
    try {
      await put(path, Buffer.from(data), {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: false,
        contentType,
        token: this.token,
      });
    } catch (e) {
      if (e instanceof Error && /already exists/i.test(e.message)) {
        throw new ConflictError(`${path} sudah wujud`);
      }
      throw e;
    }
  }

  async getFile(path: string): Promise<StoredFile | null> {
    const res = await get(path, { access: "private", useCache: false, token: this.token });
    if (!res || res.statusCode !== 200) return null;
    const data = new Uint8Array(await new Response(res.stream).arrayBuffer());
    return { data, size: data.byteLength, contentType: res.blob.contentType };
  }

  async exists(path: string) {
    try {
      await head(path, { token: this.token });
      return true;
    } catch {
      return false;
    }
  }

  async delete(path: string) {
    await del(path, { token: this.token });
  }
}
