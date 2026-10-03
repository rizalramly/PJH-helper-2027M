import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

import { adminRoute } from "@/lib/admin/api";
import { MAX_SOURCE_BYTES, UPLOAD_PATH_RE, uploadPrefix } from "@/lib/admin/sources";
import { apiError } from "@/lib/api/http";

/**
 * POST /api/admin/sources/upload — token muat naik klien Vercel Blob (PDF sahaja, ≤ 50 MB,
 * laluan sementara uploads/<pengguna>/). Fail kemudian disahkan dan didaftarkan melalui /register.
 */
export async function POST(req: Request) {
  return adminRoute(req, "any", async ({ store, user }) => {
    if (store.kind !== "vercel-blob") {
      return apiError(
        400,
        "bad_request",
        "Muat naik klien hanya untuk Vercel Blob; guna muat naik terus.",
      );
    }
    const body = (await req.json()) as HandleUploadBody;
    if (body.type !== "blob.generate-client-token") {
      return apiError(400, "bad_request", "Jenis permintaan tidak disokong.");
    }
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        if (!UPLOAD_PATH_RE.test(pathname) || !pathname.startsWith(uploadPrefix(user.email))) {
          throw new Error("Laluan muat naik tidak sah.");
        }
        return {
          allowedContentTypes: ["application/pdf"],
          maximumSizeInBytes: MAX_SOURCE_BYTES,
          addRandomSuffix: true,
        };
      },
    });
    return NextResponse.json(result);
  });
}
