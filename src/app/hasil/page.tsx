import type { Metadata } from "next";

import { ResultsView } from "@/components/results/ResultsView";

export const metadata: Metadata = {
  title: "Hasil penilaian | Perancang Pakej Haji PJH",
  description: "Pakej haji PJH yang dinilai mengikut keperluan anda, berserta status dan sumber.",
};

export default function HasilPage() {
  return (
    <main
      id="kandungan"
      className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6 sm:py-10"
    >
      <ResultsView />
    </main>
  );
}
