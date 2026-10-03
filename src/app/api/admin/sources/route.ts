import { NextResponse } from "next/server";

import { adminRoute } from "@/lib/admin/api";
import { listSources, MAX_SOURCE_BYTES, registerSource } from "@/lib/admin/sources";
import { apiError, readBodyCapped } from "@/lib/api/http";

/** GET /api/admin/sources — senarai dokumen sumber. */
export async function GET(req: Request) {
  return adminRoute(req, "any", async ({ store }) =>
    NextResponse.json({ sources: await listSources(store.kv) }),
  );
}

/**
 * POST /api/admin/sources — muat naik terus (multipart, medan "file").
 * Untuk stor setempat; pada Vercel, fail besar menggunakan muat naik klien Blob
 * (/api/admin/sources/upload + /register) kerana had badan fungsi.
 */
export async function POST(req: Request) {
  return adminRoute(req, "any", async ({ store, op }) => {
    const type = req.headers.get("content-type") ?? "";
    if (!type.startsWith("multipart/form-data")) {
      return apiError(415, "unsupported_media_type", "Hantar fail sebagai multipart/form-data.");
    }
    // Had bait dikuatkuasakan semasa membaca (termasuk badan chunked tanpa content-length).
    const body = await readBodyCapped(req, MAX_SOURCE_BYTES + 64_000);
    if (!body) return apiError(413, "payload_too_large", "Fail melebihi had 50 MB.");
    const form = await new Response(Buffer.from(body), {
      headers: { "content-type": type },
    }).formData();
    const file = form.get("file");
    if (!(file instanceof File)) return apiError(422, "validation_failed", "Medan fail tiada.");
    if (file.type && file.type !== "application/pdf") {
      return apiError(415, "unsupported_media_type", "Hanya fail PDF diterima.");
    }
    const note = form.get("note");
    const record = await registerSource(store, {
      bytes: new Uint8Array(await file.arrayBuffer()),
      filename: file.name,
      actor: op.actor,
      now: op.now,
      note: typeof note === "string" && note.trim() ? note.trim().slice(0, 300) : null,
    });
    return NextResponse.json({ source: record });
  });
}
