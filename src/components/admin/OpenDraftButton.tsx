"use client";

import { FilePenLine } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";

import { adminFetch } from "./api";

export function OpenDraftButton({
  seasonId,
  pjhId,
  label,
  name,
}: {
  seasonId: string;
  pjhId: string;
  label: string;
  name: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  return (
    <span className="inline-flex flex-col gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={busy}
        aria-label={`${label}: ${name}`}
        onClick={async () => {
          setBusy(true);
          const r = await adminFetch("/api/admin/drafts", { body: { seasonId, pjhId } });
          setBusy(false);
          if (r.ok) router.push(`/admin/pjh/${pjhId}`);
          else setError(r.message);
        }}
      >
        <FilePenLine aria-hidden="true" />
        {busy ? "Membuka…" : label}
      </Button>
      {error ? (
        <span role="alert" className="text-xs text-status-fail">
          {error}
        </span>
      ) : null}
    </span>
  );
}
