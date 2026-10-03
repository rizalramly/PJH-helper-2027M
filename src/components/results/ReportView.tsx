"use client";

import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { requirementsKey, useAssessment, useCompareSelection } from "@/lib/results/client";
import { dateText, REC_LABEL } from "@/lib/results/format";

import { CandidateCard } from "./CandidateCard";
import { CoverageStatement, ErrorState, LoadingState, NoRequest } from "./ResultsView";

const KIND_TITLE = { wajib: "Syarat wajib", keutamaan: "Keutamaan", maklumat: "Maklumat lain" };

/** Laporan akhir untuk dicetak / disimpan sebagai PDF (spesifikasi §5.9, §14). */
export function ReportView() {
  const { saved, state, retry } = useAssessment();
  const selection = useCompareSelection(saved ? requirementsKey(saved.request) : null);

  if (state.kind === "loading")
    return <LoadingState title="Menyediakan laporan…" text="Menilai semula keperluan anda." />;
  if (state.kind === "no-request" || !saved) return <NoRequest />;
  if (state.kind === "error")
    return (
      <ErrorState
        title="Laporan tidak dapat disediakan"
        message={state.message}
        details={state.details}
        onRetry={retry}
      />
    );

  const d = state.data;
  const byId = new Map(d.candidates.map((c) => [c.id, c]));
  const recIds = new Set(d.recommendations.map((r) => r.candidateId));
  const extra = selection.ids
    .filter((id) => !recIds.has(id))
    .map((id) => byId.get(id))
    .filter((c) => c !== undefined);
  const inReport = [
    ...d.recommendations.map((r) => byId.get(r.candidateId)).filter((c) => c !== undefined),
    ...extra,
  ];

  return (
    <article className="flex flex-col gap-8 print:gap-5">
      <div className="flex flex-wrap gap-2 print:hidden">
        <Button type="button" onClick={() => window.print()}>
          <Printer aria-hidden="true" />
          Cetak / simpan PDF
        </Button>
        <Button asChild variant="outline">
          <Link href="/hasil">
            <ArrowLeft aria-hidden="true" />
            Kembali ke hasil
          </Link>
        </Button>
      </div>

      <header className="flex flex-col gap-2 border-b pb-4">
        <p className="text-sm text-muted-foreground">Perancang Pakej Haji PJH</p>
        <h1 className="text-2xl font-semibold sm:text-3xl">
          Laporan penilaian pakej haji {saved.request.requirements.seasonId ?? "1448H"}
        </h1>
        <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          <div>
            <dt className="inline text-muted-foreground">Tarikh penilaian: </dt>
            <dd className="inline">{dateText(state.receivedAt, true)}</dd>
          </div>
          <div>
            <dt className="inline text-muted-foreground">Versi data: </dt>
            <dd className="inline [overflow-wrap:anywhere]">{d.datasetVersion}</dd>
          </div>
          <div>
            <dt className="inline text-muted-foreground">Peraturan skor: </dt>
            <dd className="inline">{d.scoringRulesVersion}</dd>
          </div>
          <div>
            <dt className="inline text-muted-foreground">Versi engine: </dt>
            <dd className="inline">{d.engineVersion}</dd>
          </div>
        </dl>
      </header>

      <section aria-labelledby="lap-input" className="flex break-inside-avoid flex-col gap-3">
        <h2 id="lap-input" className="text-xl font-semibold">
          Keperluan anda
        </h2>
        {(["wajib", "keutamaan", "maklumat"] as const).map((kind) => {
          const items = saved.summary.filter((i) => i.kind === kind);
          if (!items.length) return null;
          return (
            <div key={kind}>
              <h3 className="font-semibold">{KIND_TITLE[kind]}</h3>
              <dl className="mt-1 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[12rem_1fr]">
                {items.map((i, idx) => (
                  <div key={`${i.label}-${idx}`} className="contents">
                    <dt className="font-medium">{i.label}</dt>
                    <dd>{i.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          );
        })}
      </section>

      <section aria-labelledby="lap-ringkasan" className="flex flex-col gap-3">
        <h2 id="lap-ringkasan" className="text-xl font-semibold">
          Ringkasan dan batasan data
        </h2>
        <p>
          {d.counts.full_match} pakej memenuhi syarat wajib, {d.counts.needs_verification} perlu
          pengesahan, {d.counts.not_matching} tidak memenuhi.
          {d.recommendations.length
            ? ` Cadangan: ${d.recommendations.map((r) => REC_LABEL[r.label]).join(", ")}.`
            : ""}
        </p>
        <CoverageStatement d={d} />
        {d.noMatch ? (
          <div className="rounded-md border border-status-cond/40 bg-status-cond-bg p-3 text-sm">
            <p className="font-semibold text-status-cond">{d.noMatch.message}</p>
            <ul className="mt-1 list-disc pl-5">
              {d.noMatch.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
              {d.noMatch.nearest.map((n) => (
                <li key={n.candidateId}>{n.description}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>

      {inReport.length ? (
        <section aria-labelledby="lap-calon" className="flex flex-col gap-4">
          <h2 id="lap-calon" className="text-xl font-semibold">
            Cadangan{extra.length ? " dan pakej pilihan anda" : ""}
          </h2>
          {inReport.map((c) => {
            const rec = d.recommendations.find((r) => r.candidateId === c.id);
            return (
              <CandidateCard
                key={c.id}
                c={c}
                review={d.coverageSummary.pjhs[c.pjh.id]}
                recLabel={rec?.label}
                narrative={rec?.narrative}
                expanded
              />
            );
          })}
        </section>
      ) : (
        <p>Tiada cadangan untuk dilaporkan.</p>
      )}

      <footer className="border-t pt-4 text-xs leading-relaxed text-muted-foreground">
        Laporan ini berdasarkan brosur PJH dalam kompilasi sumber. Harga, kekosongan, kelulusan PJH,
        Tarwiyah dan Aziziyah tertakluk kepada pengesahan PJH dan pihak berkuasa. Skor kesesuaian
        ialah padanan kepada keperluan anda, bukan penarafan mutu PJH. Sahkan semua butiran dengan
        PJH sebelum membuat bayaran.
      </footer>
    </article>
  );
}
