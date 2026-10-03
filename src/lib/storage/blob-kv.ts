import { BlobPreconditionFailedError, get, list, put } from "@vercel/blob";

import { ConflictError, type JsonKV, type PutOptions, type StoredJSON } from "./kv";

/**
 * Vercel Blob (akses private). Jangan import dari komponen client: token hanya wujud di server. Token dibaca daripada BLOB_READ_WRITE_TOKEN di server sahaja.
 * Setiap persekitaran (Development/Preview/Production) mesti menggunakan Blob store berasingan.
 */
export class BlobKV implements JsonKV {
  readonly kind = "vercel-blob" as const;

  constructor(private readonly token?: string) {}

  async getJSON<T>(path: string): Promise<StoredJSON<T> | null> {
    const res = await get(path, { access: "private", useCache: false, token: this.token });
    if (!res || res.statusCode !== 200) return null;
    const text = await new Response(res.stream).text();
    return { value: JSON.parse(text) as T, etag: res.blob.etag };
  }

  async putJSON(path: string, value: unknown, options: PutOptions = {}) {
    try {
      const res = await put(path, JSON.stringify(value), {
        access: "private",
        addRandomSuffix: false,
        allowOverwrite: !options.createOnly,
        contentType: "application/json",
        cacheControlMaxAge: 60,
        token: this.token,
        ...(options.ifMatch ? { ifMatch: options.ifMatch } : {}),
      });
      return { etag: res.etag };
    } catch (e) {
      if (e instanceof BlobPreconditionFailedError) {
        throw new ConflictError(`${path} telah berubah (ETag tidak sepadan)`);
      }
      if (options.createOnly && e instanceof Error && /already exists/i.test(e.message)) {
        throw new ConflictError(`${path} sudah wujud`);
      }
      throw e;
    }
  }

  async list(prefix: string) {
    const out: string[] = [];
    let cursor: string | undefined;
    do {
      const page = await list({ prefix, cursor, token: this.token });
      out.push(...page.blobs.map((b) => b.pathname));
      cursor = page.hasMore ? page.cursor : undefined;
    } while (cursor);
    return out.sort();
  }
}
