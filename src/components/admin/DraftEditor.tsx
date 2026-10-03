"use client";

import { CheckCheck, RotateCcw, Send, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { StatusBadge } from "@/components/results/StatusBadge";
import { Button } from "@/components/ui/button";
import type { DraftOp } from "@/lib/admin/ops";
import type { DraftView } from "@/lib/admin/queries";
import { cn } from "@/lib/utils";

import { adminFetch } from "./api";
import { ApprovalPanel } from "./editor/ApprovalPanel";
import { ItemsPanel } from "./editor/ItemsPanel";
import { JsonPanel } from "./editor/JsonPanel";
import { PackagesPanel } from "./editor/PackagesPanel";
import { SourceViewer } from "./editor/SourceViewer";
import { Feedback, TextField, type FeedbackState } from "./Fields";
import { DRAFT_STATUS, fmtDateTime } from "./labels";

export interface EditorApi {
  save: (ops: DraftOp[], okMessage: string) => Promise<boolean>;
  busy: boolean;
  showPage: (page: number) => void;
  pageRange: [number, number];
  role: "admin" | "reviewer";
}

const TABS = [
  { id: "pakej", label: "Pakej & varian" },
  { id: "item", label: "Naik taraf & caj" },
  { id: "kelulusan", label: "Kelulusan PJH" },
  { id: "json", label: "JSON lanjutan" },
] as const;

export function DraftEditor({ view, role }: { view: DraftView; role: "admin" | "reviewer" }) {
  const router = useRouter();
  const { draft, validation, diff } = view;
  // ETag terkini daripada respons simpan (sebelum router.refresh selesai) supaya simpanan
  // berturut-turut tidak dianggap konflik.
  const [etag, setEtag] = React.useState(view.etag);
  const [seenEtag, setSeenEtag] = React.useState(view.etag);
  if (view.etag !== seenEtag) {
    setSeenEtag(view.etag);
    setEtag(view.etag);
  }
  const [busy, setBusy] = React.useState(false);
  const [feedback, setFeedback] = React.useState<FeedbackState>({ kind: "idle" });
  const [page, setPage] = React.useState(view.pageRange[0]);
  const [tab, setTab] = React.useState<(typeof TABS)[number]["id"]>("pakej");
  const [notes, setNotes] = React.useState("");
  const [confirmDiscard, setConfirmDiscard] = React.useState(false);
  const base = `/api/admin/drafts/${draft.seasonId}/${draft.pjhId}`;

  const run = async (fn: () => ReturnType<typeof adminFetch>, okMessage: string) => {
    setBusy(true);
    setFeedback({ kind: "idle" });
    const r = await fn();
    setBusy(false);
    if (r.ok) {
      const next = (r.data as { etag?: unknown } | null)?.etag;
      if (typeof next === "string") setEtag(next);
      setFeedback({ kind: "ok", message: okMessage });
      router.refresh();
      return true;
    }
    setFeedback({ kind: "error", message: r.message, details: r.details });
    return false;
  };

  const api: EditorApi = {
    busy,
    role,
    pageRange: view.pageRange,
    showPage: (p) => setPage(Math.min(Math.max(p, view.pageRange[0]), view.pageRange[1])),
    save: (ops, okMessage) =>
      run(() => adminFetch(base, { method: "PATCH", body: { etag, ops } }), okMessage),
  };
  const review = (action: "submit" | "approve" | "reopen", msg: string) =>
    run(() => adminFetch(`${base}/review`, { body: { etag, action, notes: notes || null } }), msg);

  const st = DRAFT_STATUS[draft.status];
  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-2">
        <p className="text-sm">
          <Link href="/admin/pjh" className="text-primary underline">
            PJH & draf
          </Link>{" "}
          / {draft.pjhId}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{draft.file.pjh.name}</h1>
          <StatusBadge status={st.status}>{st.text}</StatusBadge>
        </div>
        <p className="text-sm text-muted-foreground">
          Musim {draft.seasonId} · berasaskan versi{" "}
          <span className="font-mono [overflow-wrap:anywhere]">{draft.baseVersion ?? "—"}</span> ·
          dikemas kini {fmtDateTime(draft.updatedAt)} oleh {draft.updatedBy}
        </p>
      </header>

      <Feedback state={feedback} />

      <section
        aria-labelledby="semakan"
        className="flex flex-col gap-3 rounded-lg border bg-card p-4"
      >
        <h2 id="semakan" className="text-lg font-semibold">
          Validasi, perubahan dan semakan
        </h2>
        {validation.errors.length ? (
          <div className="rounded-md bg-status-fail-bg p-3 text-sm text-status-fail">
            <p className="font-semibold">
              {validation.errors.length} ralat validasi (mesti dibetulkan sebelum diluluskan)
            </p>
            <ul className="mt-1 list-disc pl-5">
              {validation.errors.slice(0, 50).map((e) => (
                <li key={e} className="[overflow-wrap:anywhere]">
                  {e}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm">
            <StatusBadge status="MEMENUHI">Validasi pra-terbit lulus</StatusBadge>
          </p>
        )}
        {validation.warnings.length ? (
          <details className="rounded-md border px-3 text-sm">
            <summary className="flex min-h-11 cursor-pointer items-center font-medium">
              {validation.warnings.length} amaran
            </summary>
            <ul className="list-disc pb-3 pl-5">
              {validation.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </details>
        ) : null}
        <div>
          <h3 className="text-sm font-semibold">
            Perubahan berbanding katalog aktif ({diff.length})
          </h3>
          {diff.length ? (
            <ul className="mt-1 list-disc pl-5 text-sm">
              {diff.slice(0, 100).map((d, i) => (
                <li key={i}>
                  <span className="sr-only">{d.kind}: </span>
                  {d.text}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Tiada perubahan kandungan.</p>
          )}
        </div>
        {draft.file.review?.status === "approved" ? (
          <p className="text-sm">
            Diluluskan oleh {draft.file.review.approvedBy} pada{" "}
            {fmtDateTime(draft.file.review.approvedAt)}
            {draft.file.review.notes ? `: ${draft.file.review.notes}` : ""}.{" "}
            <Link href="/admin/terbit" className="text-primary underline">
              Pergi ke penerbitan
            </Link>
          </p>
        ) : null}
        <TextField
          label="Nota semakan (pilihan)"
          multiline
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          hint="Contoh: harga disemak dengan hlm. 34; kod MTSP02 sepadan."
        />
        <div className="flex flex-wrap gap-2">
          {draft.status === "draft" ? (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => review("submit", "Draf dihantar untuk semakan.")}
            >
              <Send aria-hidden="true" />
              Hantar untuk semakan
            </Button>
          ) : null}
          {draft.status !== "approved" ? (
            <Button
              type="button"
              disabled={busy || !validation.ok}
              onClick={() =>
                review(
                  "approve",
                  "Semakan diluluskan. Draf sedia untuk diterbitkan oleh pentadbir.",
                )
              }
            >
              <CheckCheck aria-hidden="true" />
              Luluskan semakan
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => review("reopen", "Draf dibuka semula.")}
            >
              <RotateCcw aria-hidden="true" />
              Buka semula
            </Button>
          )}
          {confirmDiscard ? (
            <span
              role="group"
              aria-label="Sahkan buang draf"
              className="flex flex-wrap items-center gap-2"
            >
              <span className="text-sm">Buang semua perubahan dalam draf ini?</span>
              <Button
                type="button"
                variant="destructive"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  const r = await adminFetch(base, { method: "DELETE", body: { etag } });
                  setBusy(false);
                  if (r.ok) router.push("/admin/pjh");
                  else setFeedback({ kind: "error", message: r.message, details: r.details });
                }}
              >
                Ya, buang
              </Button>
              <Button type="button" variant="ghost" onClick={() => setConfirmDiscard(false)}>
                Batal
              </Button>
            </span>
          ) : (
            <Button
              type="button"
              variant="ghost"
              disabled={busy}
              onClick={() => setConfirmDiscard(true)}
            >
              <Trash2 aria-hidden="true" />
              Buang draf
            </Button>
          )}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <SourceViewer
          sha={view.sourceSha}
          page={page}
          range={view.pageRange}
          onPage={api.showPage}
          notes={draft.file.source.pageNotes}
        />
        <div className="flex min-w-0 flex-col gap-3">
          <div role="group" aria-label="Bahagian draf" className="flex flex-wrap gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={tab === t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "min-h-11 cursor-pointer rounded-md px-3 text-sm",
                  tab === t.id ? "bg-secondary font-semibold" : "hover:bg-accent",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="min-w-0">
            {tab === "pakej" ? <PackagesPanel file={draft.file} api={api} /> : null}
            {tab === "item" ? <ItemsPanel file={draft.file} api={api} /> : null}
            {tab === "kelulusan" ? <ApprovalPanel file={draft.file} api={api} /> : null}
            {tab === "json" ? (
              <JsonPanel key={view.etag} file={draft.file} api={api} role={role} />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
