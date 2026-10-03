import type { Metadata } from "next";

import { ReportView } from "@/components/results/ReportView";

export const metadata: Metadata = {
  title: "Laporan penilaian | Perancang Pakej Haji PJH",
  description: "Laporan penilaian pakej haji untuk dicetak atau disimpan sebagai PDF.",
};

export default function LaporanPage() {
  return (
    <main
      id="kandungan"
      className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6 sm:py-10 print:max-w-none print:p-0"
    >
      <ReportView />
    </main>
  );
}
