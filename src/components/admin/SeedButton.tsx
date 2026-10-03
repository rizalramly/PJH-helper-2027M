"use client";

import { DatabaseZap } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";

import { adminFetch } from "./api";
import { Feedback, type FeedbackState } from "./Fields";

/** Terbitkan katalog awal daripada repo (sekali, apabila stor belum mempunyai versi aktif). */
export function SeedButton() {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [state, setState] = React.useState<FeedbackState>({ kind: "idle" });
  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const r = await adminFetch<{ result: { datasetVersion: string } }>("/api/admin/seed", {
            body: {},
          });
          setBusy(false);
          if (r.ok) {
            setState({
              kind: "ok",
              message: `Katalog awal diterbitkan: ${r.data.result.datasetVersion}.`,
            });
            router.refresh();
          } else setState({ kind: "error", message: r.message, details: r.details });
        }}
      >
        <DatabaseZap aria-hidden="true" />
        {busy ? "Menerbitkan…" : "Terbitkan katalog awal daripada repo"}
      </Button>
      <Feedback state={state} />
    </div>
  );
}
