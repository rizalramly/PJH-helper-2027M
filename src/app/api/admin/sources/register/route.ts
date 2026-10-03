import { NextResponse } from "next/server";
import { z } from "zod";

import { adminRoute, parseBody } from "@/lib/admin/api";
import {
  InvalidSourceError,
  registerSource,
  UPLOAD_PATH_RE,
  uploadPrefix,
} from "@/lib/admin/sources";
import { apiError } from "@/lib/api/http";

const schema = z.object({
  pathname: z.string().regex(UPLOAD_PATH_RE),
  filename: z.string().max(300),
  note: z.string().trim().max(300).nullable().default(null),
});

/** POST /api/admin/sources/register — sahkan fail muat naik klien, simpan ikut SHA-256 dan buang fail sementara. */
export async function POST(req: Request) {
  return adminRoute(req, "any", async ({ store, op, user }) => {
    const { data, error } = await parseBody(req, schema, 2_000);
    if (error) return error;
    if (!data.pathname.startsWith(uploadPrefix(user.email))) {
      return apiError(403, "forbidden", "Fail muat naik ini bukan milik anda.");
    }
    const uploaded = await store.files.getFile(data.pathname);
    if (!uploaded) throw new InvalidSourceError("Fail muat naik tidak ditemui.");
    try {
      const record = await registerSource(store, {
        bytes: uploaded.data,
        filename: data.filename,
        actor: op.actor,
        now: op.now,
        note: data.note,
      });
      return NextResponse.json({ source: record });
    } finally {
      await store.files.delete(data.pathname);
    }
  });
}
