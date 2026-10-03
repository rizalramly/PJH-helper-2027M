"use client";

import { LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";

import { adminFetch } from "./api";
import { Feedback, TextField, type FeedbackState } from "./Fields";

export function LoginForm({ next }: { next: string }) {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [state, setState] = React.useState<FeedbackState>({ kind: "idle" });

  return (
    <form
      className="flex flex-col gap-4 rounded-lg border bg-card p-4 sm:p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setState({ kind: "idle" });
        const r = await adminFetch("/api/admin/session", { body: { email, password } });
        setBusy(false);
        if (r.ok) {
          router.replace(next);
          router.refresh();
        } else {
          setPassword("");
          setState({ kind: "error", message: r.message });
        }
      }}
    >
      <TextField
        label="Emel"
        type="email"
        autoComplete="username"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <TextField
        label="Kata laluan"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Feedback state={state} />
      <Button type="submit" disabled={busy}>
        <LogIn aria-hidden="true" />
        {busy ? "Menyemak…" : "Log masuk"}
      </Button>
    </form>
  );
}
