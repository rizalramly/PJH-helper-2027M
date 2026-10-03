"use client";

import { ArrowLeft, ArrowRight, Info, Printer, RefreshCw, X } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { CheckboxField } from "@/components/wizard/CheckboxField";
import { NativeSelect } from "@/components/wizard/NativeSelect";
import { Button } from "@/components/ui/button";
import {
  MAX_COMPARE,
  requirementsKey,
  useAssessment,
  useCompareSelection,
} from "@/lib/results/client";
import { dateText } from "@/lib/results/format";
import type { AssessResponse, CandidateDTO } from "@/lib/results/types";

import { CandidateCard } from "./CandidateCard";

export function LoadingState({ title, text }: { title: string; text: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className="flex flex-col gap-3">
      <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
      <p className="text-muted-foreground">{text}</p>
      <div className="h-40 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
      <div className="h-40 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
    </div>
  );
}

export function NoRequest() {
  return (
    <div className="flex flex-col items-start gap-3">
      <h1 className="text-2xl font-semibold sm:text-3xl">Tiada penilaian</h1>
      <p>Isi borang keperluan dahulu untuk melihat pakej yang sesuai.</p>
      <Button asChild>
        <Link href="/nilai">Mula penilaian</Link>
      </Button>
    </div>
  );
}

export function ErrorState({
  title,
  message,
  details,
  onRetry,
}: {
  title: string;
  message: string;
  details: string[];
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-md border border-status-fail/40 bg-status-fail-bg p-4 text-status-fail"
    >
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p>{message}</p>
      {details.length ? (
        <ul className="list-disc pl-6">
          {details.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={onRetry}>
          <RefreshCw aria-hidden="true" />
          Cuba lagi
        </Button>
        <Button asChild variant="outline">
          <Link href="/nilai?langkah=5">
            <ArrowLeft aria-hidden="true" />
            Ubah keperluan
          </Link>
        </Button>
      </div>
    </div>
  );
}

/** Kenyataan liputan dataset (spesifikasi §23.4) — tidak mendakwa liputan penuh jika ada blocker. */
export function CoverageStatement({ d }: { d: AssessResponse }) {
  const t = d.coverageSummary.totals;
  const pjhInResults = new Set(
    d.candidates.filter((c) => c.group !== "not_matching").map((c) => c.pjh.id),
  ).size;
  return (
    <aside
      aria-label="Liputan dan batasan data"
      className="flex gap-3 rounded-md bg-muted p-3 text-sm leading-relaxed"
    >
      <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
      <div className="flex flex-col gap-1">
        <p>
          {t
            ? `${t.pjhReviewed} daripada ${t.pjhExpected} PJH dalam kompilasi telah disemak${t.pjhBlocked ? ` (${t.pjhBlocked} PJH masih mempunyai data tersekat)` : ""}. `
            : ""}
          {d.counts.full_match + d.counts.needs_verification} pakej daripada {pjhInResults} PJH
          memenuhi atau hampir memenuhi syarat wajib; {d.counts.not_matching} tidak memenuhi;{" "}
          {d.counts.rejected} pakej tiada harga bagi susunan bilik anda; {d.counts.archived}{" "}
          diarkibkan.
        </p>
        <p>
          Kelulusan PJH bagi musim ini belum disahkan dengan senarai rasmi, dan kekosongan perlu
          disahkan dengan PJH. Data disemak {dateText(d.coverageSummary.generatedAt)}; versi data{" "}
          <span className="[overflow-wrap:anywhere]">{d.datasetVersion}</span>.{" "}
          <Link href="/liputan" className="text-primary underline underline-offset-2">
            Lihat liputan data
          </Link>
        </p>
      </div>
    </aside>
  );
}

type SortKey = "score" | "cost";
const PAGE = 10;

function sortCandidates(list: CandidateDTO[], key: SortKey) {
  return [...list].sort((a, b) => {
    if (key === "cost") {
      const d = BigInt(a.cost.knownGroup.sen) - BigInt(b.cost.knownGroup.sen);
      if (d !== 0n) return d < 0n ? -1 : 1;
    }
    return b.score - a.score || b.coverage - a.coverage || a.id.localeCompare(b.id);
  });
}

function GroupSection({
  id,
  title,
  hint,
  list,
  render,
}: {
  id: string;
  title: string;
  hint: string;
  list: CandidateDTO[];
  render: (c: CandidateDTO) => React.ReactNode;
}) {
  const [sort, setSort] = React.useState<SortKey>("score");
  const [shown, setShown] = React.useState(PAGE);
  const sorted = React.useMemo(() => sortCandidates(list, sort), [list, sort]);
  if (!list.length) return null;
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id={id} className="text-xl font-semibold">
            {title} ({list.length})
          </h2>
          <p className="text-sm text-muted-foreground">{hint}</p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          <label htmlFor={`${id}-susun`} className="text-sm font-medium">
            Susun
          </label>
          <NativeSelect
            id={`${id}-susun`}
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as SortKey);
              setShown(PAGE);
            }}
          >
            <option value="score">Skor kesesuaian</option>
            <option value="cost">Kos terendah</option>
          </NativeSelect>
        </div>
      </div>
      <ul className="flex flex-col gap-4">
        {sorted.slice(0, shown).map((c) => (
          <li key={c.id}>{render(c)}</li>
        ))}
      </ul>
      {shown < sorted.length ? (
        <Button
          type="button"
          variant="outline"
          className="self-start"
          onClick={() => setShown((n) => n + PAGE)}
        >
          Papar {Math.min(PAGE, sorted.length - shown)} lagi (dipaparkan {shown} daripada{" "}
          {sorted.length})
        </Button>
      ) : null}
    </section>
  );
}

function CompareTray({
  ids,
  names,
  onRemove,
  onClear,
}: {
  ids: string[];
  names: Map<string, string>;
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  if (!ids.length) return null;
  return (
    <div
      role="region"
      aria-label="Pilihan untuk dibanding"
      className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-2 border-t bg-background/95 px-4 py-3 backdrop-blur print:hidden"
    >
      <p className="text-sm font-medium" aria-live="polite">
        {ids.length} daripada {MAX_COMPARE} dipilih untuk dibanding
        {ids.length < 2 ? ". Pilih sekurang-kurangnya 2." : "."}
      </p>
      <ul className="hidden flex-wrap gap-2 sm:flex">
        {ids.map((id) => (
          <li key={id}>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onRemove(id)}
              aria-label={`Buang ${names.get(id) ?? id} daripada perbandingan`}
            >
              <span className="max-w-[14rem] truncate">{names.get(id) ?? id}</span>
              <X aria-hidden="true" />
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap gap-2">
        {ids.length >= 2 ? (
          <Button asChild>
            <Link href="/banding">
              Bandingkan
              <ArrowRight aria-hidden="true" />
            </Link>
          </Button>
        ) : (
          <Button type="button" disabled>
            Bandingkan
          </Button>
        )}
        <Button type="button" variant="ghost" onClick={onClear}>
          Kosongkan pilihan
        </Button>
      </div>
    </div>
  );
}

export function ResultsView() {
  const { saved, setDiversify, state, retry } = useAssessment();
  const selection = useCompareSelection(saved ? requirementsKey(saved.request) : null);

  if (state.kind === "loading")
    return (
      <LoadingState
        title="Menilai pakej…"
        text="Membandingkan semua varian dalam katalog dengan keperluan anda."
      />
    );
  if (state.kind === "no-request") return <NoRequest />;
  if (state.kind === "error")
    return (
      <ErrorState
        title="Penilaian tidak dapat dibuat"
        message={state.message}
        details={state.details}
        onRetry={retry}
      />
    );

  const d = state.data;
  const byId = new Map(d.candidates.map((c) => [c.id, c]));
  const names = new Map(d.candidates.map((c) => [c.id, `${c.pjh.name}: ${c.package.name}`]));
  const recIds = new Set(d.recommendations.map((r) => r.candidateId));
  const pick = (ids: string[]) =>
    ids
      .filter((id) => !recIds.has(id))
      .map((id) => byId.get(id))
      .filter((c): c is CandidateDTO => !!c);
  const full = pick(d.groups.full_match);
  const verify = pick(d.groups.needs_verification);
  const notMatching = pick(d.groups.not_matching);
  const primaryCount = d.recommendations.filter((r) => r.label !== "CALON_BERSYARAT").length;

  const card = (c: CandidateDTO, extra?: { recLabel?: (typeof d.recommendations)[number] }) => (
    <CandidateCard
      c={c}
      review={d.coverageSummary.pjhs[c.pjh.id]}
      recLabel={extra?.recLabel?.label}
      narrative={extra?.recLabel?.narrative}
      compare={{
        selected: selection.has(c.id),
        disabled: !selection.has(c.id) && selection.ids.length >= MAX_COMPARE,
        onToggle: () => selection.toggle(c.id),
      }}
    />
  );

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold sm:text-3xl">Hasil penilaian</h1>
        <p aria-live="polite">
          {d.counts.full_match} pakej memenuhi syarat wajib, {d.counts.needs_verification} perlu
          pengesahan, {d.counts.not_matching} tidak memenuhi.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/nilai?langkah=5">
              <ArrowLeft aria-hidden="true" />
              Ubah keperluan
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/laporan">
              <Printer aria-hidden="true" />
              Laporan dan cetak
            </Link>
          </Button>
        </div>
      </header>

      <CoverageStatement d={d} />

      <CheckboxField
        id="utamakan-kepelbagaian"
        checked={saved?.request.options.diversifyPjh ?? false}
        onChange={setDiversify}
        label="Utamakan kepelbagaian PJH"
        description="Cadangan memilih satu calon terbaik bagi setiap PJH. Calon lain tidak disembunyikan; semuanya kekal dalam senarai di bawah."
      />

      {d.noMatch ? (
        <section
          aria-labelledby="tiada-padanan"
          className="flex flex-col gap-2 rounded-md border border-status-cond/40 bg-status-cond-bg p-4"
        >
          <h2 id="tiada-padanan" className="text-lg font-semibold text-status-cond">
            {d.noMatch.message}
          </h2>
          {d.noMatch.reasons.length ? (
            <>
              <h3 className="font-semibold">Sebab</h3>
              <ul className="list-disc pl-6">
                {d.noMatch.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </>
          ) : null}
          {d.noMatch.nearest.length ? (
            <>
              <h3 className="font-semibold">Calon terdekat dan perubahan minimum</h3>
              <ul className="list-disc pl-6">
                {d.noMatch.nearest.map((n) => (
                  <li key={n.candidateId}>
                    <span className="font-medium">
                      {names.get(n.candidateId) ?? n.candidateId}:
                    </span>{" "}
                    {n.description}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          <p className="text-sm">
            Syarat anda tidak dilonggarkan secara automatik. Jika mahu, ubah syarat dan nilai
            semula.
          </p>
          <Button asChild variant="outline" className="self-start">
            <Link href="/nilai?langkah=5">Ubah syarat</Link>
          </Button>
        </section>
      ) : null}

      {d.recommendations.length ? (
        <section aria-labelledby="cadangan" className="flex flex-col gap-4">
          <div>
            <h2 id="cadangan" className="text-xl font-semibold">
              Cadangan ({d.recommendations.length})
            </h2>
            {primaryCount < 3 ? (
              <p className="text-sm text-muted-foreground">
                Hanya {primaryCount} cadangan memenuhi kriteria label. Tiada cadangan tambahan
                direka untuk mencukupkan bilangan.
              </p>
            ) : null}
          </div>
          <ul className="flex flex-col gap-4">
            {d.recommendations.map((r) => {
              const c = byId.get(r.candidateId);
              return c ? (
                <li key={`${r.label}-${r.candidateId}`}>{card(c, { recLabel: r })}</li>
              ) : null;
            })}
          </ul>
        </section>
      ) : null}

      <GroupSection
        id="kumpulan-penuh"
        title="Lain-lain yang memenuhi syarat wajib"
        hint="Disusun mengikut keutamaan anda."
        list={full}
        render={(c) => card(c)}
      />
      <GroupSection
        id="kumpulan-pengesahan"
        title="Perlu pengesahan"
        hint="Maklumat bagi sekurang-kurangnya satu syarat wajib tidak dinyatakan atau belum disahkan."
        list={verify}
        render={(c) => card(c)}
      />
      <GroupSection
        id="kumpulan-tidak"
        title="Tidak memenuhi"
        hint={`Dipaparkan hanya sebagai alternatif jika anda mengubah syarat (${notMatching.length} daripada ${d.counts.not_matching} dipaparkan).`}
        list={notMatching}
        render={(c) => card(c)}
      />

      <CompareTray
        ids={selection.ids}
        names={names}
        onRemove={selection.remove}
        onClear={selection.clear}
      />
    </div>
  );
}
