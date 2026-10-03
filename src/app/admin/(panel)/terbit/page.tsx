import { connection } from "next/server";

import {
  PublishPanel,
  type PublishDraftRow,
  type VersionRow,
} from "@/components/admin/PublishPanel";
import { loadBaseCatalog } from "@/lib/admin/base";
import { diffFiles } from "@/lib/admin/diff";
import { listDrafts, validateDraftFile } from "@/lib/admin/drafts";
import { requirePageUser } from "@/lib/auth/page";
import { DEFAULT_SEASON_ID } from "@/lib/catalog/seasons";
import { getActivePointer, listAuditEvents, listDatasetVersions } from "@/lib/storage/catalog-repo";
import { requireStore } from "@/lib/storage/env";

export default async function PublishPage() {
  await connection();
  const user = await requirePageUser("/admin/terbit");
  const store = requireStore();
  const season = DEFAULT_SEASON_ID;
  const [drafts, base, pointer, versions, audit] = await Promise.all([
    listDrafts(store.kv, season),
    loadBaseCatalog(store, season),
    getActivePointer(store.kv, season),
    listDatasetVersions(store.kv, season),
    listAuditEvents(store.kv),
  ]);
  const rows: PublishDraftRow[] = drafts.map((d) => {
    const v = validateDraftFile(d.file, d.pjhId, season);
    return {
      pjhId: d.pjhId,
      name: d.file.pjh.name,
      status: d.status,
      validationOk: v.ok,
      errors: v.errors.length,
      changes: diffFiles(base.files.find((f) => f.pjh.id === d.pjhId) ?? null, d.file).map(
        (x) => x.text,
      ),
    };
  });
  const publishes = audit.filter((e) => e.action === "publish" && e.seasonId === season);
  const versionRows: VersionRow[] = versions
    .map((v) => {
      const ev = publishes.find((e) => e.datasetVersion === v);
      return {
        version: v,
        active: pointer?.datasetVersion === v,
        publishedAt: ev?.at ?? null,
        publishedBy: ev?.actor ?? null,
        note: ev?.note ?? null,
      };
    })
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
  return (
    <>
      <header>
        <h1 className="text-2xl font-semibold">Terbit dan sejarah</h1>
        <p className="text-sm text-muted-foreground">
          Hanya draf yang lulus validasi dan diluluskan dalam semakan boleh diterbitkan. Penerbitan
          mencipta versi dataset baharu dan memaparkannya kepada umum serta-merta.
        </p>
      </header>
      <PublishPanel seasonId={season} role={user.role} drafts={rows} versions={versionRows} />
    </>
  );
}
