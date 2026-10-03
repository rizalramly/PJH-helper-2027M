// Terbitkan draf yang diluluskan sebagai versi dataset baharu (snapshot tidak boleh ubah +
// penunjuk aktif). Sejarah kekal; kandungan yang sama tidak menghasilkan versi pendua.
import { buildCoverageManifest } from "../catalog/coverage";
import { PAGE_INDEX } from "../catalog/page-index";
import type { PjhCatalogFileInput } from "../catalog/schema";
import { validateCatalogFile } from "../catalog/validate";
import { publishCatalog, type PublishResult } from "../storage/catalog-repo";
import type { JsonKV } from "../storage/kv";
import { draftPath, DraftError, fileHash, getDraft, type BaseCatalog } from "./drafts";

export class PublishValidationError extends Error {
  constructor(readonly problems: string[]) {
    super(`Penerbitan ditolak: ${problems.length} masalah validasi.`);
    this.name = "PublishValidationError";
  }
}

export interface PublishOutcome {
  result: PublishResult;
  published: string[];
}

export async function publishDrafts(
  kv: JsonKV,
  base: BaseCatalog,
  input: { pjhIds: string[]; actor: string; now: Date },
): Promise<PublishOutcome> {
  const ids = [...new Set(input.pjhIds)].sort();
  if (!ids.length) throw new DraftError("Pilih sekurang-kurangnya satu draf untuk diterbitkan.");
  const replacements = new Map<string, PjhCatalogFileInput>();
  const problems: string[] = [];
  for (const id of ids) {
    const d = await getDraft(kv, base.seasonId, id);
    if (!d) {
      problems.push(`${id}: draf tidak wujud`);
      continue;
    }
    if (d.value.status !== "approved") {
      problems.push(`${id}: draf belum diluluskan dalam semakan`);
      continue;
    }
    const current = base.files.find((f) => f.pjh.id === id) ?? null;
    if ((current ? fileHash(current) : null) !== d.value.baseHash) {
      problems.push(
        `${id}: katalog aktif telah berubah sejak draf dibuka; buka semula draf dan semak perubahan`,
      );
      continue;
    }
    replacements.set(id, d.value.file);
  }
  if (problems.length) throw new PublishValidationError(problems);

  const files = [
    ...base.files.filter((f) => !replacements.has(f.pjh.id)),
    ...[...replacements.values()],
  ].sort((a, b) => a.pjh.id.localeCompare(b.pjh.id));

  const reports = new Map(
    files.map((f) => [f.pjh.id, validateCatalogFile(f, f.pjh.id, PAGE_INDEX)] as const),
  );
  for (const [id, r] of reports) {
    if (!r.ok) problems.push(...r.errors.map((e) => `${id}: ${e}`));
    else if (r.file!.seasonId !== base.seasonId) problems.push(`${id}: musim tidak sepadan`);
  }
  if (problems.length) throw new PublishValidationError(problems);

  const prev = (base.coverage ?? {}) as Record<string, unknown>;
  const coverage = buildCoverageManifest({
    seasonId: base.seasonId,
    pageIndex: PAGE_INDEX,
    reports,
    meta: {
      ...(typeof prev.$comment === "string" ? { $comment: prev.$comment } : {}),
      datasetVersion: base.datasetVersion,
      generatedAt: input.now.toISOString().slice(0, 10),
      sources: Array.isArray(prev.sources)
        ? (prev.sources as string[])
        : ["compilation-34pjh-1448h"],
      pagesTotal: typeof prev.pagesTotal === "number" ? prev.pagesTotal : 141,
      nonPjhPages: Array.isArray(prev.nonPjhPages) ? (prev.nonPjhPages as number[]) : [1, 2],
    },
  });

  const result = await publishCatalog(kv, {
    seasonId: base.seasonId,
    files,
    coverage,
    actor: input.actor,
    now: input.now,
    note: `PJH: ${ids.join(", ")}`,
  });
  for (const id of ids) await kv.delete(draftPath(base.seasonId, id));
  return { result, published: ids };
}
