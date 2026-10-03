import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { StatusBadge } from "@/components/results/StatusBadge";
import { getActiveCatalog } from "@/lib/catalog/active";
import type { CoverageEntry } from "@/lib/catalog/coverage";
import { DEFAULT_SEASON_ID } from "@/lib/catalog/seasons";
import { dateText } from "@/lib/results/format";

export const metadata: Metadata = {
  title: "Liputan data | Perancang Pakej Haji PJH",
  description:
    "Status pemprosesan katalog bagi setiap PJH dalam kompilasi 1448H: halaman disemak, varian, jurang data dan status kelulusan.",
};

interface Manifest {
  generatedAt?: string;
  pagesTotal?: number;
  nonPjhPages?: number[];
  totals?: Record<string, number>;
  pjhs?: CoverageEntry[];
}

const PROCESSING = {
  reviewed: { status: "MEMENUHI", text: "Disemak" },
  in_progress: { status: "BERSYARAT", text: "Sedang diproses" },
  blocked: { status: "TIDAK_MEMENUHI", text: "Tersekat" },
  not_started: { status: "PERLU_PENGESAHAN", text: "Belum dimulakan" },
} as const;

const APPROVAL = {
  verified_approved: { status: "MEMENUHI", text: "Kelulusan disahkan" },
  not_approved: { status: "TIDAK_MEMENUHI", text: "Tidak diluluskan" },
  unverified: { status: "PERLU_PENGESAHAN", text: "Kelulusan belum disahkan" },
} as const;

const isBlocking = (g: string) => g.startsWith("[blocking]");
const gapText = (g: string) => g.replace(/^\[(non_)?blocking\]\s*/, "");

function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border bg-card p-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-2xl font-semibold money">{value}</dd>
      {note ? <dd className="text-xs text-muted-foreground">{note}</dd> : null}
    </div>
  );
}

export default async function LiputanPage() {
  await connection();
  let manifest: Manifest | null = null;
  let datasetVersion = "";
  try {
    const active = await getActiveCatalog(DEFAULT_SEASON_ID);
    manifest = active.coverage as Manifest;
    datasetVersion = active.datasetVersion;
  } catch {
    manifest = null;
  }

  return (
    <main
      id="kandungan"
      className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-6 sm:py-10"
    >
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold sm:text-3xl">Liputan data</h1>
        <p className="max-w-[70ch] leading-relaxed">
          Katalog dibina daripada <em>Kompilasi Pakej Haji 2027 (34 PJH)</em>. Halaman ini
          menunjukkan apa yang telah diproses bagi setiap PJH, jurang data yang masih ada dan status
          kelulusan secara berasingan.
        </p>
      </header>

      {!manifest?.totals || !manifest.pjhs ? (
        <p role="alert" className="rounded-md bg-status-fail-bg p-4 text-status-fail">
          Manifest liputan tidak dapat dibaca sekarang. Cuba lagi sebentar.
        </p>
      ) : (
        <Body manifest={manifest} datasetVersion={datasetVersion} />
      )}
    </main>
  );
}

function Body({ manifest, datasetVersion }: { manifest: Manifest; datasetVersion: string }) {
  const t = manifest.totals!;
  const pjhs = manifest.pjhs!;
  const blocking = pjhs.flatMap((p) =>
    p.gaps.filter(isBlocking).map((g) => ({ pjh: p.label, text: gapText(g) })),
  );
  const allProcessed = t.pjhReviewed === t.pjhExpected && blocking.length === 0;

  return (
    <>
      <section aria-labelledby="ringkasan" className="flex flex-col gap-3">
        <h2 id="ringkasan" className="text-xl font-semibold">
          Ringkasan
        </h2>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric
            label="PJH dengan fail katalog"
            value={`${t.pjhWithCatalogFile}/${t.pjhExpected}`}
          />
          <Metric label="PJH disemak" value={`${t.pjhReviewed}/${t.pjhExpected}`} />
          <Metric label="PJH tersekat" value={String(t.pjhBlocked)} />
          <Metric
            label="Kelulusan musim disahkan"
            value={`${t.pjhApprovalVerified}/${t.pjhExpected}`}
          />
          <Metric label="Keluarga pakej" value={String(t.packageFamilies)} />
          <Metric label="Varian dikenal pasti" value={String(t.variantsIdentified)} />
          <Metric label="Varian dalam katalog" value={String(t.variantsImported)} />
          <Metric
            label="Diterbitkan oleh pentadbir"
            value={String(t.variantsPublished)}
            note="Semakan penerbitan pentadbir belum dijalankan"
          />
        </dl>
        <p className="max-w-[75ch] text-sm leading-relaxed">
          {allProcessed
            ? `${t.pjhExpected}/${t.pjhExpected} PJH telah diproses. `
            : `Liputan belum lengkap: ${t.pjhReviewed} daripada ${t.pjhExpected} PJH disemak${blocking.length ? ` dan ${blocking.length} jurang data menghalang` : ""}. `}
          &quot;Disemak&quot; bermaksud semua halaman PJH telah diperiksa dan varian direkonsiliasi;
          ia <strong>tidak</strong> bermaksud semua medan diketahui, PJH diluluskan atau pakej masih
          tersedia. Medan yang tidak diterbitkan dalam brosur ditanda &quot;tidak dinyatakan&quot;,
          bukan direka.
        </p>
        <p className="text-xs text-muted-foreground">
          Manifest dijana {dateText(manifest.generatedAt)} · {manifest.pagesTotal} halaman sumber ·
          versi data <span className="[overflow-wrap:anywhere]">{datasetVersion}</span>
        </p>
      </section>

      {blocking.length ? (
        <section
          aria-labelledby="penghalang"
          className="flex flex-col gap-2 rounded-md border border-status-fail/40 bg-status-fail-bg p-4"
        >
          <h2 id="penghalang" className="text-lg font-semibold text-status-fail">
            Jurang data yang menghalang ({blocking.length})
          </h2>
          <ul className="list-disc pl-6 text-sm">
            {blocking.map((b) => (
              <li key={b.text}>
                <span className="font-medium">{b.pjh}:</span> {b.text}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="setiap-pjh" className="flex flex-col gap-3">
        <h2 id="setiap-pjh" className="text-xl font-semibold">
          Setiap PJH ({pjhs.length})
        </h2>
        <ul className="grid gap-3 md:grid-cols-2">
          {pjhs.map((p) => {
            const proc = PROCESSING[p.processingStatus];
            const appr = APPROVAL[p.approvalStatus];
            const blockingGaps = p.gaps.filter(isBlocking);
            return (
              <li
                key={p.id}
                id={`pjh-${p.id}`}
                className="flex flex-col gap-2 rounded-lg border bg-card p-4"
              >
                <div>
                  <h3 className="font-semibold">
                    {p.index}. {p.label}
                  </h3>
                  {p.legalName ? (
                    <p className="text-sm text-muted-foreground">{p.legalName}</p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <StatusBadge status={proc.status}>{proc.text}</StatusBadge>
                  <StatusBadge status={appr.status}>{appr.text}</StatusBadge>
                </div>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <dt className="text-muted-foreground">Halaman sumber</dt>
                  <dd>
                    {p.pageRange[0]}–{p.pageRange[1]} ({p.pagesReviewed.length}/{p.pagesExpected}{" "}
                    disemak)
                  </dd>
                  <dt className="text-muted-foreground">Keluarga pakej</dt>
                  <dd>{p.packageFamiliesIdentified ?? "—"}</dd>
                  <dt className="text-muted-foreground">Varian dikenal pasti / dalam katalog</dt>
                  <dd>
                    {p.variantsIdentified ?? "—"} / {p.variantsImported}
                  </dd>
                  <dt className="text-muted-foreground">Fakta berbukti</dt>
                  <dd>{p.factsVerified}</dd>
                  <dt className="text-muted-foreground">Varian tanpa harga</dt>
                  <dd>{p.unresolvedVariants.length}</dd>
                  <dt className="text-muted-foreground">Disemak</dt>
                  <dd>{dateText(p.reviewedAt)}</dd>
                </dl>
                {p.excludedVariants.length ? (
                  <p className="text-sm">
                    Dikecualikan:{" "}
                    {p.excludedVariants.map((e) => `${e.description} (${e.reason})`).join("; ")}
                  </p>
                ) : null}
                {p.gaps.length ? (
                  <details className="rounded-md border px-3">
                    <summary className="flex min-h-11 cursor-pointer items-center py-2 text-sm font-medium">
                      Jurang data ({p.gaps.length}
                      {blockingGaps.length ? `, ${blockingGaps.length} menghalang` : ""})
                    </summary>
                    <ul className="list-disc pb-3 pl-5 text-sm">
                      {p.gaps.map((g) => (
                        <li key={g} className={isBlocking(g) ? "font-medium text-status-fail" : ""}>
                          {isBlocking(g) ? "Menghalang: " : ""}
                          {gapText(g)}
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <p className="text-sm">
        <Link href="/nilai" className="text-primary underline underline-offset-2">
          Mula penilaian pakej
        </Link>
      </p>
    </>
  );
}
