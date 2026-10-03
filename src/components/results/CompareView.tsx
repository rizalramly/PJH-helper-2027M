"use client";

import { ArrowLeft, Diff, X } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { CheckboxField } from "@/components/wizard/CheckboxField";
import { Button } from "@/components/ui/button";
import {
  requirementsKey,
  useCompareSelection,
  useComparison,
  useSavedRequest,
} from "@/lib/results/client";
import type { CompareResponse } from "@/lib/results/types";
import { cn } from "@/lib/utils";

import { ErrorState, LoadingState, NoRequest } from "./ResultsView";
import { StatusBadge } from "./StatusBadge";

const STATUS_BY_TEXT: Record<
  string,
  "MEMENUHI" | "BERSYARAT" | "PERLU_PENGESAHAN" | "TIDAK_MEMENUHI"
> = {
  Memenuhi: "MEMENUHI",
  Bersyarat: "BERSYARAT",
  "Perlu pengesahan": "PERLU_PENGESAHAN",
  "Tidak memenuhi": "TIDAK_MEMENUHI",
};

/** Nilai sel: status keperluan dipaparkan sebagai lencana (ikon + teks), lain-lain teks biasa. */
function Cell({ rowKey, value }: { rowKey: string; value: string }) {
  if (rowKey.startsWith("req:") && STATUS_BY_TEXT[value]) {
    return <StatusBadge status={STATUS_BY_TEXT[value]} />;
  }
  return <span className="[overflow-wrap:anywhere]">{value}</span>;
}

function DiffMark({ differs }: { differs: boolean }) {
  if (!differs) return null;
  return (
    <span className="ml-1 inline-flex items-center gap-0.5 text-xs font-medium text-primary">
      <Diff aria-hidden="true" className="size-3.5" />
      berbeza
    </span>
  );
}

export function ComparisonTable({ data, onlyDiff }: { data: CompareResponse; onlyDiff: boolean }) {
  const rows = onlyDiff ? data.rows.filter((r) => r.differs || r.key === "pjh") : data.rows;
  const heads = data.candidates.map((c) => `${c.pjh.name}: ${c.package.name}`);
  return (
    <>
      {/* Desktop/tablet: jadual sebelah-menyebelah dengan lajur label melekat. */}
      <div
        className="hidden overflow-x-auto rounded-lg border md:block print:block"
        tabIndex={0}
        role="region"
        aria-label="Jadual perbandingan (boleh skrol mendatar)"
      >
        <table className="w-full border-collapse text-left text-sm">
          <caption className="sr-only">Perbandingan {data.candidates.length} calon</caption>
          <thead className="bg-muted">
            <tr>
              <th scope="col" className="sticky left-0 w-48 bg-muted p-3 font-semibold">
                Perkara
              </th>
              {heads.map((h, i) => (
                <th key={i} scope="col" className="min-w-[14rem] p-3 align-top font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className={cn("border-t align-top", r.differs && "bg-secondary/40")}>
                <th scope="row" className="sticky left-0 bg-card p-3 font-medium">
                  {r.label}
                  <DiffMark differs={r.differs} />
                </th>
                {r.values.map((v, i) => (
                  <td key={i} className={cn("p-3", r.key.endsWith("Cost") && "money")}>
                    <Cell rowKey={r.key} value={v} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Telefon: setiap perkara sebagai kad, nilai setiap calon disusun menegak. */}
      <ul className="flex flex-col gap-3 md:hidden print:hidden">
        {rows.map((r) => (
          <li key={r.key} className="rounded-lg border bg-card p-3">
            <h3 className="font-semibold">
              {r.label}
              <DiffMark differs={r.differs} />
            </h3>
            <dl className="mt-2 flex flex-col gap-2 text-sm">
              {r.values.map((v, i) => (
                <div key={i} className="flex flex-col gap-0.5">
                  <dt className="text-muted-foreground">
                    Calon {i + 1}: {heads[i]}
                  </dt>
                  <dd>
                    <Cell rowKey={r.key} value={v} />
                  </dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}

export function CompareView() {
  const { saved, ready } = useSavedRequest();
  const selection = useCompareSelection(saved ? requirementsKey(saved.request) : null);
  const { state, retry } = useComparison(saved, selection.ids, ready);
  const [onlyDiff, setOnlyDiff] = React.useState(false);

  if (!ready) return <LoadingState title="Membandingkan…" text="Menyediakan perbandingan." />;
  if (!saved) return <NoRequest />;
  if (selection.ids.length < 2) {
    return (
      <div className="flex flex-col items-start gap-3">
        <h1 className="text-2xl font-semibold sm:text-3xl">Banding pakej</h1>
        <p>
          Pilih 2 hingga 3 pakej dalam halaman hasil dengan menanda &quot;Pilih untuk
          dibanding&quot;.
        </p>
        <Button asChild>
          <Link href="/hasil">
            <ArrowLeft aria-hidden="true" />
            Kembali ke hasil
          </Link>
        </Button>
      </div>
    );
  }
  if (state.kind === "loading" || state.kind === "no-request")
    return <LoadingState title="Membandingkan…" text="Menyediakan perbandingan." />;
  if (state.kind === "error")
    return (
      <ErrorState
        title="Perbandingan tidak dapat dibuat"
        message={state.message}
        details={state.details}
        onRetry={retry}
        extra={
          <Button type="button" variant="ghost" onClick={selection.clear}>
            Kosongkan pilihan banding
          </Button>
        }
      />
    );

  const d = state.data;
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold sm:text-3xl">Banding {d.candidates.length} pakej</h1>
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button asChild variant="outline">
            <Link href="/hasil">
              <ArrowLeft aria-hidden="true" />
              Kembali ke hasil
            </Link>
          </Button>
          {d.candidates.map((c) => (
            <Button
              key={c.id}
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => selection.remove(c.id)}
              aria-label={`Buang ${c.pjh.name}: ${c.package.name} daripada perbandingan`}
            >
              <span className="max-w-[12rem] truncate">{c.package.name}</span>
              <X aria-hidden="true" />
            </Button>
          ))}
        </div>
      </header>

      {d.priceDifferences.length ? (
        <section aria-labelledby="beza-harga" className="rounded-md bg-muted p-4">
          <h2 id="beza-harga" className="text-lg font-semibold">
            Mengapa harga berbeza
          </h2>
          <ul className="mt-2 list-disc pl-6 text-sm leading-relaxed">
            {d.priceDifferences.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="print:hidden">
        <CheckboxField
          id="beza-sahaja"
          checked={onlyDiff}
          onChange={setOnlyDiff}
          label="Papar perkara yang berbeza sahaja"
        />
      </div>

      <ComparisonTable data={d} onlyDiff={onlyDiff} />

      <p className="text-xs text-muted-foreground">
        Versi data {d.datasetVersion} · peraturan skor {d.scoringRulesVersion} · engine{" "}
        {d.engineVersion}. Kelulusan PJH dan kekosongan perlu disahkan dengan PJH.
      </p>
    </div>
  );
}
