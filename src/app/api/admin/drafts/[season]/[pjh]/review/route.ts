import { NextResponse } from "next/server";
import { z } from "zod";

import { adminRoute, parseBody, pjhParam, seasonParam } from "@/lib/admin/api";
import { reviewDraft } from "@/lib/admin/drafts";

const schema = z.object({
  etag: z.string().min(1).max(200),
  action: z.enum(["submit", "approve", "reopen"]),
  notes: z.string().trim().max(2000).nullable().default(null),
});

/** POST — hantar untuk semakan, luluskan semakan atau buka semula draf. */
export async function POST(
  req: Request,
  ctx: RouteContext<"/api/admin/drafts/[season]/[pjh]/review">,
) {
  return adminRoute(req, "any", async ({ store, op }) => {
    const p = await ctx.params;
    const season = await seasonParam(p.season);
    const pjh = pjhParam(p.pjh);
    const { data, error } = await parseBody(req, schema, 4_000);
    if (error) return error;
    const d = await reviewDraft(
      store.kv,
      { seasonId: season, pjhId: pjh, etag: data.etag },
      data.action,
      op,
      data.notes || null,
    );
    return NextResponse.json({ etag: d.etag, status: d.value.status });
  });
}
