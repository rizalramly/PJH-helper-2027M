import Link from "next/link";
import { connection } from "next/server";

import { APPROVAL, DRAFT_STATUS, PROCESSING, REVIEW } from "@/components/admin/labels";
import { OpenDraftButton } from "@/components/admin/OpenDraftButton";
import { StatusBadge } from "@/components/results/StatusBadge";
import { pjhRows } from "@/lib/admin/queries";
import { requirePageUser } from "@/lib/auth/page";
import { DEFAULT_SEASON_ID } from "@/lib/catalog/seasons";
import { requireStore } from "@/lib/storage/env";

export default async function PjhListPage() {
  await connection();
  await requirePageUser("/admin/pjh");
  const rows = await pjhRows(requireStore(), DEFAULT_SEASON_ID);
  return (
    <>
      <header>
        <h1 className="text-2xl font-semibold">PJH dan draf ({rows.length})</h1>
        <p className="text-sm text-muted-foreground">
          Buka draf untuk menyunting satu PJH. Katalog aktif tidak berubah sehingga draf diluluskan
          dan diterbitkan.
        </p>
      </header>
      <ul className="grid gap-3 lg:grid-cols-2">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-col gap-2 rounded-lg border bg-card p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-semibold">
                  {r.index}. {r.name}
                </h2>
                <p className="text-sm text-muted-foreground">
                  hlm. PDF {r.pageRange[0]}–{r.pageRange[1]} · {r.packages} pakej · {r.variants}{" "}
                  varian
                </p>
              </div>
              {r.draft ? (
                <Link
                  href={`/admin/pjh/${r.id}`}
                  className="inline-flex min-h-11 items-center rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
                >
                  Sambung draf<span className="sr-only">: {r.name}</span>
                </Link>
              ) : (
                <OpenDraftButton
                  seasonId={DEFAULT_SEASON_ID}
                  pjhId={r.id}
                  label="Buka draf"
                  name={r.name}
                />
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status={PROCESSING[r.processingStatus].status}>
                {PROCESSING[r.processingStatus].text}
              </StatusBadge>
              <StatusBadge status={APPROVAL[r.approvalStatus].status}>
                {APPROVAL[r.approvalStatus].text}
              </StatusBadge>
              <StatusBadge status={REVIEW[r.reviewStatus].status}>
                {REVIEW[r.reviewStatus].text}
              </StatusBadge>
              {r.draft ? (
                <StatusBadge status={DRAFT_STATUS[r.draft.status].status}>
                  Draf: {DRAFT_STATUS[r.draft.status].text}
                </StatusBadge>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
