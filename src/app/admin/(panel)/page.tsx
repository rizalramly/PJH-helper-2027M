import Link from "next/link";
import { connection } from "next/server";

import { AUDIT_ACTION, DRAFT_STATUS, fmtDateTime } from "@/components/admin/labels";
import { StatusBadge } from "@/components/results/StatusBadge";
import { dashboard, recentAudit } from "@/lib/admin/queries";
import { requirePageUser } from "@/lib/auth/page";
import { DEFAULT_SEASON_ID } from "@/lib/catalog/seasons";
import { requireStore } from "@/lib/storage/env";

const STORE_LABEL = {
  "vercel-blob": "Vercel Blob",
  file: "Stor setempat (pembangunan)",
  memory: "Memori",
};

export default async function AdminHome() {
  await connection();
  await requirePageUser("/admin");
  const store = requireStore();
  const [d, audit] = await Promise.all([
    dashboard(store, DEFAULT_SEASON_ID),
    recentAudit(store, 10),
  ]);
  const t = d.totals;
  return (
    <>
      <header>
        <h1 className="text-2xl font-semibold">Ringkasan katalog {DEFAULT_SEASON_ID}</h1>
        <p className="text-sm text-muted-foreground">Stor: {STORE_LABEL[store.kind]}</p>
      </header>

      <section aria-labelledby="versi" className="rounded-lg border bg-card p-4">
        <h2 id="versi" className="text-lg font-semibold">
          Versi aktif
        </h2>
        {d.pointer ? (
          <p className="text-sm">
            <span className="font-mono [overflow-wrap:anywhere]">{d.pointer.datasetVersion}</span>{" "}
            diaktifkan {fmtDateTime(d.pointer.activatedAt)} oleh {d.pointer.activatedBy}.{" "}
            {d.versions.length} versi dalam sejarah.
          </p>
        ) : (
          <p className="text-sm">
            Tiada versi diterbitkan dalam stor ini. Katalog awam dibaca daripada fail repo (
            <span className="font-mono">{d.baseVersion ?? "—"}</span>) sehingga penerbitan pertama.
          </p>
        )}
      </section>

      {t ? (
        <section aria-labelledby="liputan">
          <h2 id="liputan" className="mb-2 text-lg font-semibold">
            Liputan
          </h2>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              [
                ["PJH disemak (transkripsi)", `${t.pjhReviewed}/${t.pjhExpected}`],
                ["PJH tersekat", String(t.pjhBlocked)],
                ["Kelulusan PJH disahkan", `${t.pjhApprovalVerified}/${t.pjhExpected}`],
                ["Varian diterbitkan pentadbir", `${t.variantsPublished}/${t.variantsImported}`],
              ] as const
            ).map(([k, v]) => (
              <div key={k} className="rounded-lg border bg-card p-3">
                <dt className="text-sm text-muted-foreground">{k}</dt>
                <dd className="text-2xl font-semibold money">{v}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <section aria-labelledby="draf" className="flex flex-col gap-2">
        <h2 id="draf" className="text-lg font-semibold">
          Draf ({d.drafts.length})
        </h2>
        {d.drafts.length ? (
          <ul className="flex flex-col gap-2">
            {d.drafts.map((x) => (
              <li
                key={x.pjhId}
                className="flex flex-wrap items-center gap-3 rounded-md border bg-card p-3"
              >
                <Link
                  href={`/admin/pjh/${x.pjhId}`}
                  className="font-medium text-primary underline-offset-2 hover:underline"
                >
                  {x.file.pjh.name}
                </Link>
                <StatusBadge status={DRAFT_STATUS[x.status].status}>
                  {DRAFT_STATUS[x.status].text}
                </StatusBadge>
                <span className="text-sm text-muted-foreground">
                  {fmtDateTime(x.updatedAt)} · {x.updatedBy}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Tiada draf. Buka draf daripada{" "}
            <Link href="/admin/pjh" className="text-primary underline">
              senarai PJH
            </Link>{" "}
            atau{" "}
            <Link href="/admin/import" className="text-primary underline">
              import
            </Link>
            .
          </p>
        )}
      </section>

      <section aria-labelledby="audit-terkini" className="flex flex-col gap-2">
        <h2 id="audit-terkini" className="text-lg font-semibold">
          Aktiviti terkini
        </h2>
        <ul className="divide-y rounded-md border bg-card text-sm">
          {audit.map((e) => (
            <li key={e.id} className="flex flex-wrap gap-x-3 p-2">
              <span className="text-muted-foreground">{fmtDateTime(e.at)}</span>
              <span className="font-medium">{AUDIT_ACTION[e.action] ?? e.action}</span>
              <span>{e.target ?? e.datasetVersion ?? ""}</span>
              <span className="text-muted-foreground">{e.actor}</span>
            </li>
          ))}
        </ul>
        <Link href="/admin/audit" className="text-sm text-primary underline">
          Log audit penuh
        </Link>
      </section>
    </>
  );
}
