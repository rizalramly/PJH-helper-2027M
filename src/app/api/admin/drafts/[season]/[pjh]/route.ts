import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError } from "@/lib/api/http";
import { adminRoute, parseBody, pjhParam, seasonParam } from "@/lib/admin/api";
import { loadBaseCatalog } from "@/lib/admin/base";
import { diffFiles } from "@/lib/admin/diff";
import { discardDraft, editDraft, getDraft, validateDraftFile } from "@/lib/admin/drafts";
import { draftOpSchema } from "@/lib/admin/ops";

type Ctx = RouteContext<"/api/admin/drafts/[season]/[pjh]">;

/** GET — draf, ETag, validasi pra-terbit dan perbezaan berbanding katalog aktif. */
export async function GET(req: Request, ctx: Ctx) {
  return adminRoute(req, "any", async ({ store }) => {
    const p = await ctx.params;
    const season = await seasonParam(p.season);
    const pjh = pjhParam(p.pjh);
    const d = await getDraft(store.kv, season, pjh);
    if (!d) return apiError(404, "not_found", "Draf tidak wujud.");
    const base = await loadBaseCatalog(store, season);
    const baseFile = base.files.find((f) => f.pjh.id === pjh) ?? null;
    return NextResponse.json(
      {
        draft: d.value,
        etag: d.etag,
        validation: validateDraftFile(d.value.file, pjh, season),
        diff: diffFiles(baseFile, d.value.file),
      },
      { headers: { "cache-control": "no-store" } },
    );
  });
}

const patchSchema = z.object({
  etag: z.string().min(1).max(200),
  ops: z.array(draftOpSchema).min(1).max(1000),
});

/** PATCH — laksanakan operasi suntingan (optimistic concurrency melalui ETag). */
export async function PATCH(req: Request, ctx: Ctx) {
  return adminRoute(req, "any", async ({ store, op }) => {
    const p = await ctx.params;
    const season = await seasonParam(p.season);
    const pjh = pjhParam(p.pjh);
    const { data, error } = await parseBody(req, patchSchema, 1_000_000);
    if (error) return error;
    const d = await editDraft(
      store.kv,
      { seasonId: season, pjhId: pjh, etag: data.etag },
      data.ops,
      op,
    );
    return NextResponse.json({
      etag: d.etag,
      status: d.value.status,
      validation: validateDraftFile(d.value.file, pjh, season),
    });
  });
}

/** DELETE — buang draf (katalog aktif tidak terjejas). */
export async function DELETE(req: Request, ctx: Ctx) {
  return adminRoute(req, "any", async ({ store, op }) => {
    const p = await ctx.params;
    const season = await seasonParam(p.season);
    const pjh = pjhParam(p.pjh);
    const { data, error } = await parseBody(
      req,
      z.object({ etag: z.string().min(1).max(200) }),
      1_000,
    );
    if (error) return error;
    await discardDraft(store.kv, { seasonId: season, pjhId: pjh, etag: data.etag }, op);
    return NextResponse.json({ ok: true });
  });
}
