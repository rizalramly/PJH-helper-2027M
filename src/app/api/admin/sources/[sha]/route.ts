import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { NextResponse } from "next/server";

import { adminRoute } from "@/lib/admin/api";
import { findSource, sourcePath } from "@/lib/admin/sources";
import { apiError } from "@/lib/api/http";
import { PRIMARY_SOURCE } from "@/lib/catalog/page-index";

/**
 * GET /api/admin/sources/:sha256 — PDF sumber untuk skrin semakan (pentadbir sahaja).
 * Pembangunan: kompilasi dalam repo (docs/) digunakan jika belum dimuat naik ke stor.
 */
export async function GET(req: Request, ctx: RouteContext<"/api/admin/sources/[sha]">) {
  return adminRoute(req, "any", async ({ store }) => {
    const { sha } = await ctx.params;
    if (!/^[0-9a-f]{64}$/.test(sha)) return apiError(400, "bad_request", "Hash tidak sah.");
    const record = await findSource(store.kv, sha);
    let data: Uint8Array | null = null;
    let filename = record?.filename ?? "sumber.pdf";
    if (record) data = (await store.files.getFile(sourcePath(sha)))?.data ?? null;
    const primarySha = PRIMARY_SOURCE.document_hash.replace(/^sha256:/, "");
    if (!data && sha === primarySha && process.env.VERCEL_ENV !== "production") {
      try {
        data = new Uint8Array(
          await readFile(
            join(/*turbopackIgnore: true*/ process.cwd(), "docs", PRIMARY_SOURCE.filename),
          ),
        );
        filename = PRIMARY_SOURCE.filename;
      } catch {
        data = null;
      }
    }
    if (!data) return apiError(404, "not_found", "Dokumen sumber belum dimuat naik ke stor.");
    return new NextResponse(Buffer.from(data), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="${filename.replace(/[^\w.-]/g, "_")}"`,
        "cache-control": "private, max-age=300",
        "x-content-type-options": "nosniff",
      },
    });
  });
}
