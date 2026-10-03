import { NextResponse } from "next/server";

import { adminRoute, parseBody } from "@/lib/admin/api";
import { listSeasons, saveSeason } from "@/lib/catalog/season-store";
import { seasonSchema } from "@/lib/catalog/seasons";

/** GET /api/admin/seasons */
export async function GET(req: Request) {
  return adminRoute(req, "any", async ({ store }) =>
    NextResponse.json({ seasons: await listSeasons(store.kv) }),
  );
}

/** POST /api/admin/seasons — cipta atau kemas kini musim (pentadbir sahaja). */
export async function POST(req: Request) {
  return adminRoute(req, "admin", async ({ store, op }) => {
    const { data, error } = await parseBody(req, seasonSchema, 2_000);
    if (error) return error;
    await saveSeason(store.kv, data, op.actor, op.now);
    return NextResponse.json({ season: data });
  });
}
