import { NextResponse } from "next/server";
import { z } from "zod";

import { adminRoute, parseBody, pjhParam, seasonParam } from "@/lib/admin/api";
import { loadBaseCatalog } from "@/lib/admin/base";
import { listDrafts, openDraft } from "@/lib/admin/drafts";
import { DEFAULT_SEASON_ID } from "@/lib/catalog/seasons";

/** GET /api/admin/drafts?season= — senarai draf. */
export async function GET(req: Request) {
  return adminRoute(req, "any", async ({ store }) => {
    const season = await seasonParam(
      new URL(req.url).searchParams.get("season") ?? DEFAULT_SEASON_ID,
    );
    const drafts = await listDrafts(store.kv, season);
    return NextResponse.json({
      drafts: drafts.map((d) => ({
        pjhId: d.pjhId,
        seasonId: d.seasonId,
        status: d.status,
        updatedAt: d.updatedAt,
        updatedBy: d.updatedBy,
        baseVersion: d.baseVersion,
      })),
    });
  });
}

const openSchema = z.object({
  seasonId: z.string().max(10),
  pjhId: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .max(60),
});

/** POST /api/admin/drafts — buka draf (salinan fail aktif) bagi satu PJH. */
export async function POST(req: Request) {
  return adminRoute(req, "any", async ({ store, op }) => {
    const { data, error } = await parseBody(req, openSchema, 1_000);
    if (error) return error;
    const season = await seasonParam(data.seasonId);
    const base = await loadBaseCatalog(store, season);
    const d = await openDraft(store.kv, base, pjhParam(data.pjhId), op);
    return NextResponse.json({ pjhId: d.value.pjhId, status: d.value.status, etag: d.etag });
  });
}
