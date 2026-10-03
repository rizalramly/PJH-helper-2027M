"use client";

import { History, Rocket } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { StatusBadge } from "@/components/results/StatusBadge";
import { Button } from "@/components/ui/button";

import { adminFetch } from "./api";
import { CheckField, Feedback, type FeedbackState } from "./Fields";
import { DRAFT_STATUS, fmtDateTime } from "./labels";

export interface PublishDraftRow {
  pjhId: string;
  name: string;
  status: "draft" | "submitted" | "approved";
  validationOk: boolean;
  errors: number;
  changes: string[];
}

export interface VersionRow {
  version: string;
  active: boolean;
  publishedAt: string | null;
  publishedBy: string | null;
  note: string | null;
}

export function PublishPanel({
  seasonId,
  role,
  drafts,
  versions,
}: {
  seasonId: string;
  role: "admin" | "reviewer";
  drafts: PublishDraftRow[];
  versions: VersionRow[];
}) {
  const router = useRouter();
  const approved = drafts.filter((d) => d.status === "approved" && d.validationOk);
  const [selected, setSelected] = React.useState<string[]>(approved.map((d) => d.pjhId));
  const [busy, setBusy] = React.useState(false);
  const [state, setState] = React.useState<FeedbackState>({ kind: "idle" });
  const [confirm, setConfirm] = React.useState<string | null>(null);
  const isAdmin = role === "admin";

  return (
    <div className="flex flex-col gap-6">
      <Feedback state={state} />
      <section
        aria-labelledby="terbit-draf"
        className="flex flex-col gap-3 rounded-lg border bg-card p-4"
      >
        <h2 id="terbit-draf" className="text-lg font-semibold">
          Draf untuk diterbitkan
        </h2>
        {drafts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tiada draf.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {drafts.map((d) => {
              const ready = d.status === "approved" && d.validationOk;
              return (
                <li key={d.pjhId} className="flex flex-col gap-2 rounded-md border p-3">
                  <div className="flex flex-wrap items-center gap-3">
                    {isAdmin && ready ? (
                      <CheckField
                        label={d.name}
                        checked={selected.includes(d.pjhId)}
                        onChange={(on) =>
                          setSelected((s) =>
                            on ? [...s, d.pjhId] : s.filter((x) => x !== d.pjhId),
                          )
                        }
                      />
                    ) : (
                      <span className="font-medium">{d.name}</span>
                    )}
                    <StatusBadge status={DRAFT_STATUS[d.status].status}>
                      {DRAFT_STATUS[d.status].text}
                    </StatusBadge>
                    {!d.validationOk ? (
                      <StatusBadge status="TIDAK_MEMENUHI">{d.errors} ralat validasi</StatusBadge>
                    ) : null}
                    <Link href={`/admin/pjh/${d.pjhId}`} className="text-sm text-primary underline">
                      Buka draf
                    </Link>
                  </div>
                  {d.changes.length ? (
                    <ul className="list-disc pl-5 text-sm">
                      {d.changes.slice(0, 8).map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                      {d.changes.length > 8 ? (
                        <li>dan {d.changes.length - 8} perubahan lagi</li>
                      ) : null}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Tiada perubahan kandungan (hanya status semakan).
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {isAdmin ? (
          <Button
            type="button"
            disabled={busy || selected.length === 0}
            className="self-start"
            onClick={async () => {
              setBusy(true);
              const r = await adminFetch<{ result: { status: string; datasetVersion: string } }>(
                "/api/admin/publish",
                { body: { seasonId, pjhIds: selected } },
              );
              setBusy(false);
              if (r.ok) {
                setState({
                  kind: "ok",
                  message:
                    r.data.result.status === "unchanged"
                      ? `Tiada perubahan; versi ${r.data.result.datasetVersion} kekal aktif.`
                      : `Diterbitkan sebagai versi ${r.data.result.datasetVersion}.`,
                });
                setSelected([]);
                router.refresh();
              } else setState({ kind: "error", message: r.message, details: r.details });
            }}
          >
            <Rocket aria-hidden="true" />
            Terbitkan {selected.length} draf
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">Hanya pentadbir boleh menerbitkan.</p>
        )}
      </section>

      <section
        aria-labelledby="sejarah"
        className="flex flex-col gap-3 rounded-lg border bg-card p-4"
      >
        <h2 id="sejarah" className="text-lg font-semibold">
          Sejarah versi ({versions.length})
        </h2>
        <p className="text-sm text-muted-foreground">
          Setiap versi ialah snapshot yang tidak boleh diubah. Mengaktifkan versi lama (rollback)
          tidak memadam versi lain.
        </p>
        <ul className="flex flex-col gap-2">
          {versions.map((v) => (
            <li
              key={v.version}
              className="flex flex-wrap items-center gap-3 rounded-md border p-2 text-sm"
            >
              <span className="font-mono [overflow-wrap:anywhere]">{v.version}</span>
              {v.active ? <StatusBadge status="MEMENUHI">Aktif</StatusBadge> : null}
              <span className="text-muted-foreground">
                {fmtDateTime(v.publishedAt)}
                {v.publishedBy ? ` · ${v.publishedBy}` : ""}
                {v.note ? ` · ${v.note}` : ""}
              </span>
              {isAdmin && !v.active ? (
                confirm === v.version ? (
                  <span className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      disabled={busy}
                      onClick={async () => {
                        setBusy(true);
                        const r = await adminFetch("/api/admin/versions", {
                          body: { seasonId, datasetVersion: v.version },
                        });
                        setBusy(false);
                        setConfirm(null);
                        if (r.ok) {
                          setState({ kind: "ok", message: `Versi ${v.version} kini aktif.` });
                          router.refresh();
                        } else setState({ kind: "error", message: r.message, details: r.details });
                      }}
                    >
                      Sahkan aktifkan
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setConfirm(null)}
                    >
                      Batal
                    </Button>
                  </span>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setConfirm(v.version)}
                  >
                    <History aria-hidden="true" />
                    Aktifkan semula<span className="sr-only"> {v.version}</span>
                  </Button>
                )
              ) : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
