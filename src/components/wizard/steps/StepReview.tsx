"use client";

import { Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { STEPS, summarize, type SummaryItem } from "@/lib/wizard/state";

import { useWizard } from "../context";

const GROUPS: { kind: SummaryItem["kind"]; title: string; hint: string }[] = [
  {
    kind: "wajib",
    title: "Syarat wajib",
    hint: "Pakej yang tidak memenuhi syarat ini tidak dijadikan cadangan utama.",
  },
  { kind: "keutamaan", title: "Keutamaan", hint: "Mempengaruhi susunan dan skor sahaja." },
  { kind: "maklumat", title: "Maklumat lain", hint: "Tidak mempengaruhi penilaian." },
];

export function StepReview() {
  const { state, goTo } = useWizard();
  const items = summarize(state);
  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted-foreground">
        Semak pilihan anda. Tekan &quot;Ubah&quot; untuk kembali ke langkah berkaitan; pilihan lain
        kekal.
      </p>
      {GROUPS.map((g) => {
        const list = items.filter((i) => i.kind === g.kind);
        if (list.length === 0) return null;
        return (
          <section
            key={g.kind}
            aria-labelledby={`semakan-${g.kind}`}
            className="rounded-lg border bg-card p-4"
          >
            <h2 id={`semakan-${g.kind}`} className="text-lg font-semibold">
              {g.title}
            </h2>
            <p className="text-sm text-muted-foreground">{g.hint}</p>
            <dl className="mt-3 divide-y">
              {list.map((item, idx) => (
                <div
                  key={`${item.label}-${idx}`}
                  className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:gap-4"
                >
                  <dt className="font-medium sm:w-48 sm:shrink-0">{item.label}</dt>
                  <dd className="flex flex-1 items-start justify-between gap-3">
                    <span className="min-w-0 [overflow-wrap:anywhere]">{item.value}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-primary"
                      aria-label={`Ubah ${item.label} (langkah ${STEPS[item.step - 1].title})`}
                      onClick={() => goTo(item.step)}
                    >
                      <Pencil aria-hidden="true" />
                      Ubah
                    </Button>
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        );
      })}
    </div>
  );
}
