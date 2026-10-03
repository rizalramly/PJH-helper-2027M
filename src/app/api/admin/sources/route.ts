import { NextResponse } from "next/server";

import { adminRoute } from "@/lib/admin/api";
import { listSources, MAX_SOURCE_BYTES, registerSource } from "@/lib/admin/sources";
import { apiError } from "@/lib/api/http";

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
    const length = Number(req.headers.get("content-length") ?? "0");
    if (length > MAX_SOURCE_BYTES + 64_000) {
      return apiError(413, "payload_too_large", "Fail melebihi had 50 MB.");
    }
    const type = req.headers.get("content-type") ?? "";
    if (!type.startsWith("multipart/form-data")) {
      return apiError(415, "unsupported_media_type", "Hantar fail sebagai multipart/form-data.");
    }
    const form = await req.formData();
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
