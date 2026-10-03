import { STATUS_LABEL } from "@/lib/engine/compare";
import type { RecommendationLabel } from "@/lib/engine/types";
import {
  approvalText,
  availabilityText,
  aziziyahText,
  classText,
  durationText,
  hotelsText,
  pmnText,
  REC_LABEL,
  roomText,
  tarwiyahText,
} from "@/lib/results/format";
import type { CandidateDTO, PjhReviewInfo } from "@/lib/results/types";
import { cn } from "@/lib/utils";

import { Disclosure } from "./Disclosure";
import { EvidenceList, EvidenceQuotes } from "./EvidenceList";
import { ScoreExplainer } from "./ScoreExplainer";
import { GroupBadge, StatusBadge } from "./StatusBadge";

const KIND_LABEL: Record<string, string> = {
  variant: "Harga varian",
  upgrade: "Naik taraf",
  charge: "Caj tambahan",
  included: "Termasuk",
  extras: "Peruntukan tambahan anda",
};

const BASIS_LABEL: Record<string, string> = {
  per_person: "seorang",
  per_room: "sebilik",
  per_group: "sekumpulan",
  per_night: "semalam",
};

function List({ items, empty }: { items: string[]; empty?: string }) {
  if (!items.length) return empty ? <p className="text-sm text-muted-foreground">{empty}</p> : null;
  return (
    <ul className="list-disc pl-5 text-sm leading-relaxed">
      {items.map((x) => (
        <li key={x}>{x}</li>
      ))}
    </ul>
  );
}

export interface CompareControl {
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}

/** Kad hasil (spesifikasi §6). `expanded` = mod laporan cetak: semua bahagian dipaparkan. */
export function CandidateCard({
  c,
  review,
  recLabel,
  narrative,
  compare,
  expanded = false,
  headingLevel = 3,
}: {
  c: CandidateDTO;
  review?: PjhReviewInfo;
  recLabel?: RecommendationLabel;
  narrative?: string;
  compare?: CompareControl;
  expanded?: boolean;
  headingLevel?: 2 | 3;
}) {
  const H = headingLevel === 2 ? "h2" : "h3";
  const perPerson = c.assignments
    .map((a) => (a.perPerson ? a.perPerson.text : "Harga perlu pengesahan"))
    .join(" / ");
  const id = `calon-${c.id.replace(/[^a-zA-Z0-9-]/g, "-")}`;
  const notMet = c.requirements.filter((r) => r.status !== "MEMENUHI");

  return (
    <article
      aria-labelledby={`${id}-tajuk`}
      className={cn(
        "flex flex-col gap-4 rounded-lg border bg-card p-4",
        recLabel === "CADANGAN_UTAMA" && "border-primary/60",
      )}
    >
      <header className="flex flex-col gap-2">
        {recLabel ? (
          <p className="text-sm font-semibold tracking-wide text-primary uppercase">
            {REC_LABEL[recLabel]}
          </p>
        ) : null}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <H id={`${id}-tajuk`} className="text-lg font-semibold [overflow-wrap:anywhere]">
              {c.package.name}
            </H>
            <p className="text-muted-foreground">
              {c.pjh.name} · Musim {c.package.seasonId}
            </p>
          </div>
          <GroupBadge group={c.group} />
        </div>
        <ul className="flex flex-wrap gap-2" aria-label="Status PJH dan kekosongan">
          <li>
            <StatusBadge
              status={
                c.pjh.approvalStatus === "verified_approved" ? "MEMENUHI" : "PERLU_PENGESAHAN"
              }
            >
              {approvalText(c.pjh.approvalStatus)}
            </StatusBadge>
          </li>
          <li>
            <StatusBadge status="PERLU_PENGESAHAN">Kekosongan: {availabilityText(c)}</StatusBadge>
          </li>
        </ul>
      </header>

      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-3">
        <div>
          <dt className="text-sm text-muted-foreground">
            Jumlah kumpulan ({c.cost.pilgrims} jemaah)
          </dt>
          <dd className="text-xl font-semibold money">{c.cost.knownGroup.text}</dd>
          {c.cost.complete ? null : (
            <dd className="text-sm text-status-cond">
              Kos diketahui sahaja; {c.cost.unpriced.length} caj belum berharga
            </dd>
          )}
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Seorang (termasuk naik taraf)</dt>
          <dd className="font-semibold money">{perPerson}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted-foreground">Baki bajet kumpulan</dt>
          <dd
            className={cn(
              "font-semibold money",
              c.cost.remaining.sen.startsWith("-") && "text-status-fail",
            )}
          >
            {c.cost.remaining.sen.startsWith("-")
              ? `Melebihi ${c.cost.remaining.text.replace("-", "")}`
              : c.cost.remaining.text}
          </dd>
        </div>
      </dl>

      <div className="flex flex-col gap-1">
        <h4 className="text-sm font-semibold">Susunan bilik</h4>
        <List items={c.assignments.map(roomText)} />
      </div>

      <div className="flex flex-col gap-2">
        <h4 className="text-sm font-semibold">Status keperluan anda</h4>
        <ul className="flex flex-col gap-2">
          {c.requirements.map((r) => (
            <li key={r.key} className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
              <span className="shrink-0">
                <StatusBadge status={r.status}>
                  {r.label}: {STATUS_LABEL[r.status].toLowerCase()}
                </StatusBadge>
              </span>
              <span className="text-sm">
                {r.hard ? <span className="sr-only">Syarat wajib. </span> : null}
                {r.detail}
                {expanded ? <EvidenceQuotes evidence={r.evidence} /> : null}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {(
          [
            ["Tempoh", durationText(c.package)],
            ["Tarikh perjalanan", c.package.travelDates ?? "Tidak dinyatakan"],
            ["Aziziyah", aziziyahText(c.package)],
            ["Tarwiyah", tarwiyahText(c.package)],
            ["PMN / masyair", pmnText(c)],
            ["Hotel Makkah", hotelsText(c.package, "makkah")],
            ["Hotel Madinah", hotelsText(c.package, "madinah")],
            ["Penginapan Aziziyah", hotelsText(c.package, "aziziyah")],
            ["Penerbangan", classText(c.package.flightClass)],
            ["Makanan", c.package.meals ?? "Tidak dinyatakan"],
          ] as const
        ).map(([k, v]) => (
          <div key={k} className="min-w-0">
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="[overflow-wrap:anywhere]">{v}</dd>
          </div>
        ))}
      </dl>

      {narrative ? <p className="text-sm leading-relaxed">{narrative}</p> : null}

      <div className="flex flex-col gap-2">
        <p className="text-sm">
          <span className="font-semibold">Skor kesesuaian {c.score.toFixed(1)} / 100</span>
          <span className="text-muted-foreground">
            {" "}
            · Liputan bukti {Math.round(c.coverage * 100)}%
          </span>
        </p>
        <Disclosure title="Bagaimana skor dikira" expanded={expanded}>
          <ScoreExplainer c={c} />
        </Disclosure>
        <Disclosure title={`Sebab, kompromi dan perkara belum pasti`} expanded={expanded}>
          <div className="flex flex-col gap-3">
            <div>
              <h5 className="text-sm font-semibold">Sebab utama</h5>
              <List items={c.reasons.slice(0, 3)} empty="Tiada sebab khusus direkodkan." />
            </div>
            <div>
              <h5 className="text-sm font-semibold">Kompromi</h5>
              <List items={c.compromises} empty="Tiada kompromi berbanding keperluan anda." />
            </div>
            <div>
              <h5 className="text-sm font-semibold">Perkara belum pasti</h5>
              <List items={c.uncertainties} empty="Tiada." />
            </div>
            {notMet.length ? (
              <p className="text-sm text-muted-foreground">
                {notMet.length} keperluan tidak berstatus &quot;Memenuhi&quot;. Lihat status di
                atas.
              </p>
            ) : null}
          </div>
        </Disclosure>
        <Disclosure title="Pecahan kos" expanded={expanded}>
          <table className="w-full border-collapse text-left text-sm">
            <caption className="sr-only">Pecahan kos {c.package.name}</caption>
            <thead>
              <tr className="border-b">
                <th scope="col" className="py-1.5 pr-3 font-semibold">
                  Perkara
                </th>
                <th scope="col" className="py-1.5 text-right font-semibold money">
                  Jumlah
                </th>
              </tr>
            </thead>
            <tbody>
              {c.cost.lines.map((l, i) => (
                <tr key={i} className="border-b align-top last:border-0">
                  <td className="py-1.5 pr-3">
                    {l.label}
                    <span className="block text-xs text-muted-foreground">
                      {KIND_LABEL[l.kind] ?? l.kind}
                      {l.basis ? `, ${BASIS_LABEL[l.basis] ?? l.basis}` : ""}
                      {l.quantity ? ` × ${l.quantity}` : ""}
                    </span>
                  </td>
                  <td className="py-1.5 text-right money">
                    {l.kind === "included"
                      ? "Termasuk dalam harga"
                      : l.amount
                        ? l.amount.text
                        : "Harga perlu pengesahan"}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t font-semibold">
                <th scope="row" className="py-1.5 pr-3 text-left">
                  Jumlah diketahui
                </th>
                <td className="py-1.5 text-right money">{c.cost.knownGroup.text}</td>
              </tr>
            </tfoot>
          </table>
          {c.cost.conditionalCharges.length ? (
            <p className="mt-2 text-sm text-status-cond">
              Caj bersyarat: {c.cost.conditionalCharges.join("; ")}
            </p>
          ) : null}
        </Disclosure>
        <Disclosure title={`Soalan kepada PJH (${c.questionsForPjh.length})`} expanded={expanded}>
          <List items={c.questionsForPjh} empty="Tiada soalan khusus." />
        </Disclosure>
        <Disclosure title="Sumber" expanded={expanded}>
          <EvidenceList c={c} review={review} />
        </Disclosure>
      </div>

      {compare ? (
        <div className="flex items-center gap-3 border-t pt-3 print:hidden">
          <input
            id={`${id}-banding`}
            type="checkbox"
            checked={compare.selected}
            disabled={compare.disabled}
            onChange={compare.onToggle}
            className="size-5 cursor-pointer accent-primary disabled:cursor-not-allowed"
          />
          <label
            htmlFor={`${id}-banding`}
            className={cn(
              "flex min-h-11 cursor-pointer items-center font-medium",
              compare.disabled && "cursor-not-allowed text-muted-foreground",
            )}
          >
            Pilih untuk dibanding
            {compare.disabled ? " (maksimum 3 dipilih)" : ""}
          </label>
        </div>
      ) : null}
    </article>
  );
}
