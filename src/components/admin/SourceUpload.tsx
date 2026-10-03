"use client";

import { upload } from "@vercel/blob/client";
import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";

import { adminFetch } from "./api";
import { Feedback, TextField, type FeedbackState } from "./Fields";

const MAX = 50 * 1024 * 1024;

export function SourceUpload({
  storeKind,
  uploadPrefix,
}: {
  storeKind: "vercel-blob" | "file" | "memory";
  uploadPrefix: string;
}) {
  const router = useRouter();
  const input = React.useRef<HTMLInputElement>(null);
  const [note, setNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [state, setState] = React.useState<FeedbackState>({ kind: "idle" });

  return (
    <form
      className="flex flex-col gap-3 rounded-lg border bg-card p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        const file = input.current?.files?.[0];
        if (!file) return setState({ kind: "error", message: "Pilih fail PDF." });
        if (file.size > MAX)
          return setState({ kind: "error", message: "Fail melebihi had 50 MB." });
        if (file.type && file.type !== "application/pdf") {
          return setState({ kind: "error", message: "Hanya fail PDF diterima." });
        }
        setBusy(true);
        setState({ kind: "idle" });
        let r;
        if (storeKind === "vercel-blob") {
          try {
            const safe =
              file.name
                .replace(/[^A-Za-z0-9._-]+/g, "_")
                .replace(/\.pdf$/i, "")
                .slice(0, 80) || "sumber";
            const blob = await upload(`${uploadPrefix}${safe}.pdf`, file, {
              access: "private",
              handleUploadUrl: "/api/admin/sources/upload",
              contentType: "application/pdf",
            });
            r = await adminFetch("/api/admin/sources/register", {
              body: { pathname: blob.pathname, filename: file.name, note: note || null },
            });
          } catch (err) {
            r = { ok: false as const, status: 0, message: (err as Error).message, details: [] };
          }
        } else {
          const form = new FormData();
          form.set("file", file);
          if (note) form.set("note", note);
          r = await adminFetch("/api/admin/sources", { form });
        }
        setBusy(false);
        if (r.ok) {
          setState({ kind: "ok", message: `${file.name} dimuat naik dan disahkan sebagai PDF.` });
          if (input.current) input.current.value = "";
          setNote("");
          router.refresh();
        } else setState({ kind: "error", message: r.message, details: r.details });
      }}
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="fail-pdf" className="text-sm font-medium">
          Fail PDF (maksimum 50 MB)
        </label>
        <input
          id="fail-pdf"
          ref={input}
          type="file"
          accept="application/pdf,.pdf"
          className="min-h-11 text-sm file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-md file:border-0 file:bg-secondary file:px-3"
        />
      </div>
      <TextField
        label="Nota (pilihan)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        hint="Contoh: brosur rasmi Busyra 1448H, diterima 3 Okt 2026"
      />
      <Feedback state={state} />
      <Button type="submit" disabled={busy} className="self-start">
        <Upload aria-hidden="true" />
        {busy ? "Memuat naik…" : "Muat naik"}
      </Button>
    </form>
  );
}
