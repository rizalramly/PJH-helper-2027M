import type { Metadata } from "next";

import { CompareView } from "@/components/results/CompareView";

export const metadata: Metadata = {
  title: "Banding pakej | Perancang Pakej Haji PJH",
  description: "Perbandingan sebelah-menyebelah sehingga tiga pakej haji PJH dan sebab beza harga.",
};

export default function BandingPage() {
  return (
    <main
      id="kandungan"
      className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 sm:py-10"
    >
      <CompareView />
    </main>
  );
}
