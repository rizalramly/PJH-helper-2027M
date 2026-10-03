"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";

import { adminFetch } from "./api";
import { CheckField, Feedback, TextField, type FeedbackState } from "./Fields";

export function SeasonForm() {
  const router = useRouter();
  const [f, setF] = React.useState({
    id: "",
    hijriYear: "",
    gregorianYear: "",
    label: "",
    active: false,
  });
  const [state, setState] = React.useState<FeedbackState>({ kind: "idle" });
  const [busy, setBusy] = React.useState(false);
  return (
    <form
      className="flex flex-col gap-3 rounded-lg border bg-card p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const r = await adminFetch("/api/admin/seasons", {
          body: {
            id: f.id.trim().toUpperCase(),
            hijriYear: Number(f.hijriYear),
            gregorianYear: Number(f.gregorianYear),
            label: f.label,
            active: f.active,
          },
        });
        setBusy(false);
        if (r.ok) {
          setState({ kind: "ok", message: `Musim ${f.id.toUpperCase()} disimpan.` });
          router.refresh();
        } else setState({ kind: "error", message: r.message, details: r.details });
      }}
    >
      <h2 className="text-lg font-semibold">Tambah atau kemas kini musim</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <TextField
          label="ID"
          value={f.id}
          onChange={(e) => setF({ ...f, id: e.target.value })}
          hint="Contoh: 1449H"
          required
        />
        <TextField
          label="Tahun Hijrah"
          inputMode="numeric"
          value={f.hijriYear}
          onChange={(e) => setF({ ...f, hijriYear: e.target.value })}
          required
        />
        <TextField
          label="Tahun Masihi"
          inputMode="numeric"
          value={f.gregorianYear}
          onChange={(e) => setF({ ...f, gregorianYear: e.target.value })}
          required
        />
      </div>
      <TextField
        label="Label"
        value={f.label}
        onChange={(e) => setF({ ...f, label: e.target.value })}
        hint="Contoh: Musim Haji 1449H / 2028M"
        required
      />
      <CheckField
        label="Aktif (dipaparkan kepada pengguna)"
        checked={f.active}
        onChange={(v) => setF({ ...f, active: v })}
      />
      <Feedback state={state} />
      <Button type="submit" disabled={busy} className="self-start">
        Simpan musim
      </Button>
    </form>
  );
}
