import "server-only";

import { NextResponse } from "next/server";

export type ApiErrorCode =
  | "bad_request"
  | "validation_failed"
  | "not_found"
  | "catalog_unavailable"
  | "internal_error"
  | "unauthorized"
  | "forbidden"
  | "conflict"
  | "unsupported_media_type"
  | "payload_too_large"
  | "rate_limited"
  | "service_unavailable";

/** Respons ralat berstruktur dalam BM. Butiran dalaman tidak didedahkan kepada klien. */
export function apiError(status: number, code: ApiErrorCode, message: string, details?: unknown) {
  return NextResponse.json(
    { error: { code, message, ...(details !== undefined ? { details } : {}) } },
    { status },
  );
}

export function ok<T>(data: T, init?: { cacheSeconds?: number; datasetVersion?: string }) {
  const headers = new Headers({ "content-type": "application/json; charset=utf-8" });
  if (init?.cacheSeconds)
    headers.set(
      "cache-control",
      `public, s-maxage=${init.cacheSeconds}, stale-while-revalidate=60`,
    );
  else headers.set("cache-control", "no-store");
  if (init?.datasetVersion) headers.set("x-dataset-version", init.datasetVersion);
  return new NextResponse(JSON.stringify(data), { status: 200, headers });
}

/**
 * Baca badan permintaan dengan had bait (tidak menimbal badan besar atau chunked tanpa had).
 * Pulangkan null jika melebihi had.
 */
export async function readBodyCapped(req: Request, maxBytes: number): Promise<Uint8Array | null> {
  const declared = Number(req.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) return null;
  if (!req.body) return new Uint8Array();
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

export async function readJson(
  req: Request,
  maxBytes = 32_000,
): Promise<{ ok: true; value: unknown } | { ok: false; response: NextResponse }> {
  const bytes = await readBodyCapped(req, maxBytes);
  if (!bytes)
    return {
      ok: false,
      response: apiError(413, "payload_too_large", "Permintaan terlalu besar."),
    };
  try {
    return { ok: true, value: JSON.parse(new TextDecoder().decode(bytes)) };
  } catch {
    return {
      ok: false,
      response: apiError(400, "bad_request", "Badan permintaan bukan JSON yang sah."),
    };
  }
}

/** Bungkus handler: ralat katalog → 503, ralat lain → 500 tanpa butiran dalaman. */
export async function withErrors(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn();
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (e instanceof Error && e.name === "StoreUnavailableError") {
      return apiError(503, "service_unavailable", message);
    }
    if (e instanceof Error && e.name === "ConflictError") {
      return apiError(
        409,
        "conflict",
        "Data telah diubah oleh pengguna lain. Muat semula dan cuba lagi.",
      );
    }
    if (/katalog|Snapshot|BLOB_READ_WRITE_TOKEN/i.test(message)) {
      console.error("[api] katalog tidak tersedia:", message);
      return apiError(
        503,
        "catalog_unavailable",
        "Katalog tidak tersedia buat sementara. Cuba sebentar lagi.",
      );
    }
    console.error("[api] ralat dalaman:", e);
    return apiError(500, "internal_error", "Ralat dalaman. Cuba sebentar lagi.");
  }
}
