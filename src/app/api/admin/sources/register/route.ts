import { NextResponse } from "next/server";
import { z } from "zod";

import { adminRoute, parseBody } from "@/lib/admin/api";
import { InvalidSourceError, registerSource } from "@/lib/admin/sources";

const schema = z.object({
  pathname: z.string().regex(/^uploads\/[A-Za-z0-9._-]{1,200}\.pdf$/),
  filename: z.string().max(300),
  note: z.string().trim().max(300).nullable().default(null),
});

/** POST /api/admin/sources/register — sahkan fail muat naik klien, simpan ikut SHA-256 dan buang fail sementara. */
export async function POST(req: Request) {
  return adminRoute(req, "any", async ({ store, op }) => {
    const { data, error } = await parseBody(req, schema, 2_000);
    if (error) return error;
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
