import { CircleCheck, CircleHelp } from "lucide-react";

import { dateText, pageText, sourceLabel } from "@/lib/results/format";
import type { CandidateDTO, PjhReviewInfo } from "@/lib/results/types";

/** Sumber halaman bagi calon: dokumen, halaman, status bukti dan tarikh semakan. */
export function EvidenceList({ c, review }: { c: CandidateDTO; review?: PjhReviewInfo }) {
  return (
    <div className="flex flex-col gap-2 text-sm">
      <p>
        {sourceLabel(c.sources[0]?.sourceId ?? "compilation-34pjh-1448h")}. Disemak{" "}
        {dateText(review?.reviewedAt)}.
      </p>
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {c.sources.map((s) => (
          <li key={`${s.sourceId}-${s.pdfPage}`} className="inline-flex items-center gap-1">
            {s.verified ? (
              <CircleCheck aria-hidden="true" className="size-4 text-status-ok" />
            ) : (
              <CircleHelp aria-hidden="true" className="size-4 text-status-verify" />
            )}
            {pageText(s)}
            <span className="sr-only">{s.verified ? " (disahkan)" : " (belum disahkan)"}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        Ikon tanda: bukti disahkan dalam semakan bebas. Ikon soal: bukti belum disahkan sepenuhnya.
      </p>
    </div>
  );
}

/** Petikan bukti bagi satu keperluan (teks asal sumber ialah data, dipaparkan seperti dicetak). */
export function EvidenceQuotes({
  evidence,
}: {
  evidence: CandidateDTO["requirements"][number]["evidence"];
}) {
  if (!evidence.length) return null;
  return (
    <ul className="mt-1 flex flex-col gap-1 text-xs text-muted-foreground">
      {evidence.map((e, i) => (
        <li key={i}>
          <q className="[overflow-wrap:anywhere]">{e.text}</q> — {pageText(e)}
          {e.status === "verified" ? "" : " (belum disahkan)"}
        </li>
      ))}
    </ul>
  );
}
