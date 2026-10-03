import { NextResponse } from "next/server";
import { z } from "zod";

import { adminRoute, parseBody, requireSeason } from "@/lib/admin/api";
import { loadBaseCatalog } from "@/lib/admin/base";
import { csvToVariantOps } from "@/lib/admin/csv";
import { editDraft, importJsonDraft, openDraft, validateDraftFile } from "@/lib/admin/drafts";
import { apiError } from "@/lib/api/http";

const schema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("json"),
    seasonId: z.string().max(10),
    file: z.record(z.string(), z.unknown()),
    replace: z.boolean().default(false),
  }),
  z.object({
    kind: z.literal("csv"),
    seasonId: z.string().max(10),
    pjhId: z
      .string()
      .regex(/^[a-z0-9-]+$/)
      .max(60),
    csv: z.string().max(500_000),
  }),
]);

/** POST /api/admin/import — import JSON (fail PJH penuh) atau CSV (varian) ke draf. Tidak terus diterbitkan. */
export async function POST(req: Request) {
  return adminRoute(req, "any", async ({ store, op }) => {
    const { data, error } = await parseBody(req, schema, 2_000_000);
    if (error) return error;
    await requireSeason(data.seasonId);
    const base = await loadBaseCatalog(store, data.seasonId);
    if (data.kind === "json") {
      const d = await importJsonDraft(store.kv, base, data.file, op, data.replace);
      return NextResponse.json({
        pjhId: d.value.pjhId,
        etag: d.etag,
        validation: validateDraftFile(d.value.file, d.value.pjhId, data.seasonId),
        warnings: [],
      });
    }
    const opened = await openDraft(store.kv, base, data.pjhId, op);
    const { ops, errors } = csvToVariantOps(
      data.csv,
      opened.value.file.packages.map((p) => ({ packageId: p.id, variants: p.variants })),
    );
    const fatal = errors.filter((e) => !e.startsWith("Lajur tidak dikenali"));
    if (fatal.length || ops.length === 0) {
      return apiError(
        422,
        "validation_failed",
        "CSV tidak diimport; betulkan baris berikut.",
        fatal.length ? fatal : ["Tiada baris data."],
      );
    }
    const d = await editDraft(
      store.kv,
      { seasonId: data.seasonId, pjhId: data.pjhId, etag: opened.etag },
      ops,
      op,
      "import",
    );
    return NextResponse.json({
      pjhId: data.pjhId,
      etag: d.etag,
      rows: ops.length,
      warnings: errors,
      validation: validateDraftFile(d.value.file, data.pjhId, data.seasonId),
    });
  });
}
