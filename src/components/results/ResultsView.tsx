"use client";

import { ArrowLeft, Info, RefreshCw } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { Button } from "@/components/ui/button";
import type { assessmentDTO, CandidateDTO } from "@/lib/api/dto";
import type { RecommendationLabel } from "@/lib/engine/types";
import { ASSESS_REQUEST_KEY } from "@/lib/wizard/storage";

import { GroupBadge, StatusBadge } from "./StatusBadge";

type AssessResponse = ReturnType<typeof assessmentDTO> & {
  coverageSummary: { totals: Record<string, number> | null; generatedAt: string | null };
};

type ApiError = {
  error: { code: string; message: string; details?: { field: string; message: string }[] };
};

type LoadState =
  | { kind: "loading" }
  | { kind: "no-request" }
  | { kind: "error"; message: string; details: string[] }
  | { kind: "done"; data: AssessResponse };

const REC_LABEL: Record<RecommendationLabel, string> = {
  CADANGAN_UTAMA: "Cadangan utama",
  ALTERNATIF_JIMAT: "Alternatif jimat",
  ALTERNATIF_KESELESAAN: "Alternatif keselesaan",
  CALON_BERSYARAT: "Calon bersyarat",
};

function CandidateCard({ c, heading }: { c: CandidateDTO; heading?: string }) {
  const perPerson = c.assignments
    .map((a) => (a.perPerson ? a.perPerson.text : "Perlu pengesahan"))
    .join(" / ");
  return (
    <article
      className="flex flex-col gap-3 rounded-lg border bg-card p-4"
      aria-label={`${c.pjh.name}: ${c.package.name}`}
    >
      {heading ? (
        <p className="text-sm font-semibold tracking-wide text-primary uppercase">{heading}</p>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-lg font-semibold [overflow-wrap:anywhere]">{c.package.name}</h3>
          <p className="text-muted-foreground">{c.pjh.name}</p>
        </div>
        <GroupBadge group={c.group} />
      </div>
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-muted-foreground">Kos kumpulan ({c.cost.pilgrims} jemaah)</dt>
          <dd className="text-base font-semibold money">
            {c.cost.knownGroup.text}
            {c.cost.complete ? null : (
              <span className="block text-xs font-normal text-status-cond">
                Caj tambahan belum lengkap
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Kos seorang</dt>
          <dd className="money">{perPerson}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Baki bajet</dt>
          <dd className="money">{c.cost.remaining.text}</dd>
        </div>
      </dl>
      <p className="text-sm">
        Kod varian: {c.assignments.map((a) => a.variant.code).join(" + ")}
        {c.pjh.approvalStatus === "verified_approved"
          ? null
          : " · Kelulusan PJH musim ini belum disahkan"}
      </p>
      <ul className="flex flex-wrap gap-2" aria-label="Status keperluan">
        {c.requirements.map((r) => (
          <li key={r.key}>
            <StatusBadge status={r.status}>
              {r.label}:{" "}
              {
                {
                  MEMENUHI: "memenuhi",
                  BERSYARAT: "bersyarat",
                  PERLU_PENGESAHAN: "perlu pengesahan",
                  TIDAK_MEMENUHI: "tidak memenuhi",
                }[r.status]
              }
            </StatusBadge>
          </li>
        ))}
      </ul>
      {c.uncertainties.length ? (
        <details className="text-sm">
          <summary className="min-h-11 cursor-pointer py-2 font-medium">
            Perkara belum pasti ({c.uncertainties.length})
          </summary>
          <ul className="list-disc pl-6">
            {c.uncertainties.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
        </details>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Sumber:{" "}
        {c.sources
          .slice(0, 6)
          .map((s) => `hlm. PDF ${s.pdfPage}`)
          .join(", ")}
        {c.sources.length > 6 ? ` dan ${c.sources.length - 6} lagi` : ""}
      </p>
    </article>
  );
}

export function ResultsView() {
  const [state, setState] = React.useState<LoadState>({ kind: "loading" });
  const [attempt, setAttempt] = React.useState(0);

  React.useEffect(() => {
    let raw: string | null = null;
    try {
      raw = window.sessionStorage.getItem(ASSESS_REQUEST_KEY);
    } catch {
      raw = null;
    }
    if (!raw) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- keadaan bergantung pada storan pelayar
      setState({ kind: "no-request" });
      return;
    }
    const controller = new AbortController();
    setState({ kind: "loading" });
    fetch("/api/assess", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: raw,
      signal: controller.signal,
    })
      .then(async (res) => {
        const json = (await res.json()) as AssessResponse | ApiError;
        if (!res.ok || "error" in json) {
          const err = (json as ApiError).error;
          setState({
            kind: "error",
            message: err?.message ?? "Penilaian gagal.",
            details: err?.details?.map((d) => d.message) ?? [],
          });
          return;
        }
        setState({ kind: "done", data: json });
      })
      .catch((e: unknown) => {
        if (controller.signal.aborted) return;
        setState({
          kind: "error",
          message:
            e instanceof Error && e.name === "TypeError"
              ? "Tiada sambungan ke pelayan. Semak internet anda."
              : "Penilaian gagal.",
          details: [],
        });
      });
    return () => controller.abort();
  }, [attempt]);

  if (state.kind === "loading") {
    return (
      <div role="status" aria-live="polite" aria-busy="true" className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold sm:text-3xl">Menilai pakej…</h1>
        <p className="text-muted-foreground">
          Membandingkan semua varian dalam katalog dengan keperluan anda.
        </p>
        <div className="h-32 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
        <div className="h-32 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
      </div>
    );
  }

  if (state.kind === "no-request") {
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

  if (state.kind === "error") {
    return (
      <div
        role="alert"
        className="flex flex-col items-start gap-3 rounded-md border border-status-fail/40 bg-status-fail-bg p-4 text-status-fail"
      >
        <h1 className="text-2xl font-semibold">Penilaian tidak dapat dibuat</h1>
        <p>{state.message}</p>
        {state.details.length ? (
          <ul className="list-disc pl-6">
            {state.details.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={() => setAttempt((n) => n + 1)}>
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

  const d = state.data;
  const byId = new Map(d.candidates.map((c) => [c.id, c]));
  const totals = d.coverageSummary.totals;
  const recIds = new Set(d.recommendations.map((r) => r.candidateId));
  const others = (ids: string[]) =>
    ids
      .filter((id) => !recIds.has(id))
      .map((id) => byId.get(id))
      .filter((c): c is CandidateDTO => !!c);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold sm:text-3xl">Hasil penilaian</h1>
        <p aria-live="polite">
          {d.counts.full_match} pakej memenuhi syarat wajib, {d.counts.needs_verification} perlu
          pengesahan, {d.counts.not_matching} tidak memenuhi.
        </p>
        <Button asChild variant="outline" className="self-start">
          <Link href="/nilai?langkah=5">
            <ArrowLeft aria-hidden="true" />
            Ubah keperluan
          </Link>
        </Button>
      </header>

      <aside
        className="flex gap-3 rounded-md bg-muted p-3 text-sm leading-relaxed"
        aria-label="Had data"
      >
        <Info aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
        <p>
          {totals
            ? `Katalog: ${totals.pjhReviewed} daripada ${totals.pjhExpected} PJH telah disemak${totals.pjhBlocked ? `; ${totals.pjhBlocked} PJH masih mempunyai data tersekat` : ""}. `
            : ""}
          Kelulusan PJH bagi musim ini belum disahkan dengan senarai rasmi, dan kekosongan perlu
          disahkan dengan PJH. Versi data {d.datasetVersion}.
        </p>
      </aside>

      {d.noMatch ? (
        <section
          aria-labelledby="tiada-padanan"
          className="flex flex-col gap-2 rounded-md border border-status-cond/40 bg-status-cond-bg p-4"
        >
          <h2 id="tiada-padanan" className="text-lg font-semibold text-status-cond">
            {d.noMatch.message}
          </h2>
          {d.noMatch.reasons.length ? (
            <ul className="list-disc pl-6">
              {d.noMatch.reasons.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          ) : null}
          {d.noMatch.nearest.length ? (
            <>
              <h3 className="font-semibold">Perubahan minimum yang mungkin</h3>
              <ul className="list-disc pl-6">
                {d.noMatch.nearest.map((n) => (
                  <li key={n.candidateId}>{n.description}</li>
                ))}
              </ul>
            </>
          ) : null}
        </section>
      ) : null}

      {d.recommendations.length ? (
        <section aria-labelledby="cadangan" className="flex flex-col gap-4">
          <h2 id="cadangan" className="text-xl font-semibold">
            Cadangan
          </h2>
          {d.recommendations.map((r) => {
            const c = byId.get(r.candidateId);
            if (!c) return null;
            return (
              <div key={`${r.label}-${r.candidateId}`} className="flex flex-col gap-2">
                <CandidateCard c={c} heading={REC_LABEL[r.label]} />
                <p className="px-1 text-sm leading-relaxed">{r.narrative}</p>
              </div>
            );
          })}
        </section>
      ) : null}

      {(
        [
          ["full_match", "Lain-lain yang memenuhi syarat wajib"],
          ["needs_verification", "Perlu pengesahan"],
        ] as const
      ).map(([group, title]) => {
        const list = others(d.groups[group]);
        if (!list.length) return null;
        return (
          <section
            key={group}
            aria-labelledby={`kumpulan-${group}`}
            className="flex flex-col gap-3"
          >
            <h2 id={`kumpulan-${group}`} className="text-xl font-semibold">
              {title} ({list.length})
            </h2>
            <details>
              <summary className="min-h-11 cursor-pointer py-2 font-medium text-primary">
                Papar senarai
              </summary>
              <div className="mt-2 flex flex-col gap-3">
                {list.slice(0, 20).map((c) => (
                  <CandidateCard key={c.id} c={c} />
                ))}
                {list.length > 20 ? (
                  <p className="text-sm text-muted-foreground">
                    Dan {list.length - 20} lagi. Senarai penuh dengan penapis akan ditambah.
                  </p>
                ) : null}
              </div>
            </details>
          </section>
        );
      })}
    </div>
  );
}
