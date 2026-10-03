"use client";

import * as React from "react";

type Totals = {
  pjhExpected: number;
  pjhReviewed: number;
  pjhBlocked: number;
  pjhApprovalVerified: number;
  variantsImported: number;
};

/** Ringkasan liputan katalog aktif (dibaca daripada /api/coverage; tidak mendakwa liputan penuh jika ada blocker). */
export function CoverageNote() {
  const [totals, setTotals] = React.useState<Totals | null>(null);
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => {
    const controller = new AbortController();
    fetch("/api/coverage?season=1448H", { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: { coverage?: { totals?: Totals } }) => {
        if (j.coverage?.totals) setTotals(j.coverage.totals);
        else setFailed(true);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, []);

  if (failed)
    return (
      <p className="text-sm text-muted-foreground">
        Ringkasan liputan katalog tidak dapat dimuatkan.
      </p>
    );
  if (!totals)
    return <p className="min-h-12 text-sm text-muted-foreground">Memuatkan liputan katalog…</p>;
  return (
    <p className="min-h-12 text-sm leading-relaxed">
      {totals.pjhReviewed} daripada {totals.pjhExpected} PJH dalam kompilasi telah disemak (
      {totals.variantsImported} varian).
      {totals.pjhBlocked
        ? ` ${totals.pjhBlocked} PJH masih mempunyai data yang belum dapat dibaca dengan pasti.`
        : ""}{" "}
      {totals.pjhApprovalVerified === 0
        ? "Kelulusan PJH bagi musim ini belum disahkan dengan senarai rasmi."
        : `${totals.pjhApprovalVerified} PJH disahkan diluluskan.`}
    </p>
  );
}
