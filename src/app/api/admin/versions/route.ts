import { NextResponse } from "next/server";
import { z } from "zod";

import { adminRoute, parseBody, seasonParam } from "@/lib/admin/api";
import { invalidateActiveCatalog } from "@/lib/catalog/active";
import { DEFAULT_SEASON_ID } from "@/lib/catalog/seasons";
import {
  activateVersion,
  getActivePointer,
  listAuditEvents,
  listDatasetVersions,
} from "@/lib/storage/catalog-repo";

/** GET /api/admin/versions?season= — versi aktif, sejarah versi dan peristiwa terbit/aktif. */
export async function GET(req: Request) {
  return adminRoute(req, "any", async ({ store }) => {
    const season = await seasonParam(
      new URL(req.url).searchParams.get("season") ?? DEFAULT_SEASON_ID,
    );
    const [active, versions, audit] = await Promise.all([
      getActivePointer(store.kv, season),
      listDatasetVersions(store.kv, season),
      listAuditEvents(store.kv),
    ]);
    return NextResponse.json({
      active,
      versions,
      events: audit.filter(
        (e) => e.seasonId === season && (e.action === "publish" || e.action === "activate"),
      ),
    });
  });
}

const schema = z.object({
  seasonId: z.string().max(10),
  datasetVersion: z.string().regex(/^ds-[a-z0-9]+-[0-9a-f]{12}$/),
});

/** POST /api/admin/versions — aktifkan semula versi sedia ada (rollback). Pentadbir sahaja. */
export async function POST(req: Request) {
  return adminRoute(req, "admin", async ({ store, op }) => {
    const { data, error } = await parseBody(req, schema, 1_000);
    if (error) return error;
    const season = await seasonParam(data.seasonId);
    const previous = await activateVersion(store.kv, season, data.datasetVersion, op.actor, op.now);
    invalidateActiveCatalog();
    return NextResponse.json({ datasetVersion: data.datasetVersion, previousVersion: previous });
  });
}
