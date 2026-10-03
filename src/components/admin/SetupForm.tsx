"use client";

import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";

import { adminFetch } from "./api";
import { Feedback, TextField, type FeedbackState } from "./Fields";

export function SetupForm() {
  const router = useRouter();
  const [f, setF] = React.useState({ token: "", email: "", password: "", confirm: "" });
  const [state, setState] = React.useState<FeedbackState>({ kind: "idle" });
  const [busy, setBusy] = React.useState(false);
  return (
    <form
      className="flex flex-col gap-4 rounded-lg border bg-card p-4 sm:p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        if (f.password !== f.confirm)
          return setState({ kind: "error", message: "Kata laluan tidak sama." });
        setBusy(true);
        const r = await adminFetch<{ email: string }>("/api/admin/setup", {
          body: { token: f.token, email: f.email, password: f.password },
        });
        setBusy(false);
        if (r.ok) {
          setState({ kind: "ok", message: `Pentadbir ${r.data.email} dicipta. Sila log masuk.` });
          router.push("/admin/log-masuk");
        } else setState({ kind: "error", message: r.message });
      }}
    >
      <TextField
        label="Token persediaan"
        type="password"
        autoComplete="off"
        required
        value={f.token}
        onChange={(e) => setF({ ...f, token: e.target.value })}
        hint="Nilai ADMIN_SETUP_TOKEN dalam tetapan Environment Variables projek Vercel."
      />
      <TextField
        label="Emel pentadbir"
        type="email"
        autoComplete="username"
        required
        value={f.email}
        onChange={(e) => setF({ ...f, email: e.target.value })}
      />
      <TextField
        label="Kata laluan"
        type="password"
        autoComplete="new-password"
        required
        minLength={12}
        value={f.password}
        onChange={(e) => setF({ ...f, password: e.target.value })}
        hint="Sekurang-kurangnya 12 aksara."
      />
      <TextField
        label="Ulang kata laluan"
        type="password"
        autoComplete="new-password"
        required
        value={f.confirm}
        onChange={(e) => setF({ ...f, confirm: e.target.value })}
      />
      <Feedback state={state} />
      <Button type="submit" disabled={busy}>
        {busy ? "Mencipta…" : "Cipta pentadbir"}
      </Button>
    </form>
  );
}
