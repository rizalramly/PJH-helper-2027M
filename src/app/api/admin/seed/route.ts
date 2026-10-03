import { join } from "node:path";

import { NextResponse } from "next/server";

import { adminRoute } from "@/lib/admin/api";
import { apiError } from "@/lib/api/http";
import { invalidateActiveCatalog } from "@/lib/catalog/active";
import { readRepoCatalog } from "@/lib/catalog/repo-files";
import { DEFAULT_SEASON_ID } from "@/lib/catalog/seasons";
import { getActivePointer, publishCatalog } from "@/lib/storage/catalog-repo";

/**
 * POST /api/admin/seed — terbitkan katalog awal daripada fail repo yang dibundel (setara
 * `pnpm db:seed`). Pentadbir sahaja, dan hanya jika musim belum mempunyai versi aktif;
 * selepas itu perubahan mesti melalui draf dan penerbitan biasa.
 */
export async function POST(req: Request) {
  return adminRoute(req, "admin", async ({ store, op }) => {
    const season = DEFAULT_SEASON_ID;
    if (await getActivePointer(store.kv, season)) {
      return apiError(
        409,
        "conflict",
        "Katalog sudah mempunyai versi aktif; guna draf dan penerbitan.",
      );
    }
    const repo = readRepoCatalog(join(/*turbopackIgnore: true*/ process.cwd()), season);
    if (repo.errors.length) {
      return apiError(
        422,
        "validation_failed",
        "Katalog dalam deployment tidak sah.",
        repo.errors.slice(0, 20),
      );
    }
    const result = await publishCatalog(store.kv, {
      seasonId: season,
      files: repo.raw,
      coverage: repo.coverage,
      actor: op.actor,
      now: op.now,
      note: "katalog awal daripada repo",
    });
    invalidateActiveCatalog();
    return NextResponse.json({ result });
  });
}
