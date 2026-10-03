import { assertSafePath, assertSafePrefix } from "./paths";

// Stor objek JSON minimum di atas Vercel Blob (atau memori untuk ujian).
// Tiada transaksi berbilang objek: ketekalan dijaga dengan objek tidak boleh ubah
// dan penunjuk aktif yang dikemas kini secara bersyarat (ETag).

export interface StoredJSON<T> {
  value: T;
  etag: string;
}

export interface PutOptions {
  /** Hanya tulis jika ETag semasa sama (optimistic concurrency). */
  ifMatch?: string;
  /** Gagal jika objek sudah wujud. */
  createOnly?: boolean;
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

export interface JsonKV {
  readonly kind: "memory" | "vercel-blob" | "file";
  getJSON<T>(path: string): Promise<StoredJSON<T> | null>;
  /** Tulis JSON; lontar ConflictError jika syarat ifMatch/createOnly gagal. */
  putJSON(path: string, value: unknown, options?: PutOptions): Promise<{ etag: string }>;
  list(prefix: string): Promise<string[]>;
  delete(path: string): Promise<void>;
}

/** Stor dalam memori untuk ujian dan pembangunan tanpa token Blob. */
export class MemoryKV implements JsonKV {
  readonly kind = "memory" as const;
  private objects = new Map<string, { body: string; etag: string }>();
  private counter = 0;

  async getJSON<T>(path: string): Promise<StoredJSON<T> | null> {
    assertSafePath(path);
    const o = this.objects.get(path);
    return o ? { value: JSON.parse(o.body) as T, etag: o.etag } : null;
  }

  async putJSON(path: string, value: unknown, options: PutOptions = {}) {
    assertSafePath(path);
    const existing = this.objects.get(path);
    if (options.createOnly && existing) throw new ConflictError(`${path} sudah wujud`);
    if (options.ifMatch !== undefined && existing?.etag !== options.ifMatch) {
      throw new ConflictError(`${path} telah berubah (ETag tidak sepadan)`);
    }
    const etag = `"m${++this.counter}"`;
    this.objects.set(path, { body: JSON.stringify(value), etag });
    return { etag };
  }

  async list(prefix: string) {
    assertSafePrefix(prefix);
    return [...this.objects.keys()].filter((k) => k.startsWith(prefix)).sort();
  }

  async delete(path: string) {
    assertSafePath(path);
    this.objects.delete(path);
  }
}
