import { NextResponse } from "next/server";
import { z } from "zod";

import { adminRoute, parseBody, requireSeason } from "@/lib/admin/api";
import { loadBaseCatalog } from "@/lib/admin/base";
import { publishDrafts } from "@/lib/admin/publish";
import { invalidateActiveCatalog } from "@/lib/catalog/active";

const schema = z.object({
  seasonId: z.string().max(10),
  pjhIds: z
    .array(
      z
        .string()
        .regex(/^[a-z0-9-]+$/)
        .max(60),
    )
    .min(1)
    .max(100),
});

/** POST /api/admin/publish — terbitkan draf yang diluluskan (pentadbir sahaja). */
export async function POST(req: Request) {
  return adminRoute(req, "admin", async ({ store, op }) => {
    const { data, error } = await parseBody(req, schema, 8_000);
    if (error) return error;
    await requireSeason(data.seasonId);
    const base = await loadBaseCatalog(store, data.seasonId);
    const out = await publishDrafts(store.kv, base, {
      pjhIds: data.pjhIds,
      actor: op.actor,
      now: op.now,
    });
    invalidateActiveCatalog();
    return NextResponse.json(out);
  });
}
