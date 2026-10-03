import type { Metadata } from "next";
import { Suspense } from "react";

import { WizardShell } from "@/components/wizard/WizardShell";

export const metadata: Metadata = {
  title: "Nilai pakej | Perancang Pakej Haji PJH",
  description:
    "Masukkan bajet, susunan bilik dan keperluan anda untuk menilai pakej haji PJH musim 1448H.",
};

export default function NilaiPage() {
  return (
    <main
      id="kandungan"
      className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 pt-6 sm:pt-10"
    >
      <Suspense fallback={<p className="text-muted-foreground">Memuatkan borang…</p>}>
        <WizardShell />
      </Suspense>
    </main>
  );
}
