import { DIMENSION_LABEL, normalizedWeights } from "@/lib/results/format";
import type { CandidateDTO } from "@/lib/results/types";

/** Pecahan skor: pemberat dinormalkan × utiliti bagi setiap dimensi aktif (spesifikasi §9). */
export function ScoreExplainer({ c }: { c: CandidateDTO }) {
  const rows = normalizedWeights(c.dimensions);
  return (
    <div className="flex flex-col gap-2 text-sm">
      <p>
        Skor = 100 × jumlah (pemberat × utiliti) bagi dimensi yang anda pilih. Dimensi &quot;Tidak
        kisah&quot; digugurkan dan pemberat lain dinormalkan. Skor ialah padanan kepada keperluan
        anda, <strong>bukan</strong> penarafan mutu PJH atau kebarangkalian perjalanan berjaya.
      </p>
      {rows.length === 0 ? (
        <p>Tiada keutamaan aktif; semua calon mendapat skor yang sama.</p>
      ) : (
        <div
          className="overflow-x-auto rounded-sm"
          tabIndex={0}
          role="region"
          aria-label="Pecahan skor (boleh skrol mendatar)"
        >
          <table className="w-full min-w-[30rem] border-collapse text-left">
            <caption className="sr-only">Pecahan skor kesesuaian</caption>
            <thead>
              <tr className="border-b">
                <th scope="col" className="py-1.5 pr-3 font-semibold">
                  Dimensi
                </th>
                <th scope="col" className="py-1.5 pr-3 text-right font-semibold money">
                  Pemberat
                </th>
                <th scope="col" className="py-1.5 pr-3 text-right font-semibold money">
                  Utiliti
                </th>
                <th scope="col" className="py-1.5 pr-3 text-right font-semibold money">
                  Sumbangan
                </th>
                <th scope="col" className="py-1.5 font-semibold">
                  Asas
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.dimension} className="border-b align-top last:border-0">
                  <th scope="row" className="py-1.5 pr-3 font-medium">
                    {DIMENSION_LABEL[d.dimension]}
                  </th>
                  <td className="py-1.5 pr-3 text-right money">{Math.round(d.share * 100)}%</td>
                  <td className="py-1.5 pr-3 text-right money">
                    {d.knownFraction === 0 ? "tiada data" : d.utility.toFixed(2)}
                  </td>
                  <td className="py-1.5 pr-3 text-right money">
                    {(d.share * d.utility * 100).toFixed(1)}
                  </td>
                  <td className="py-1.5 text-muted-foreground">{d.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-muted-foreground">
        Liputan bukti {Math.round(c.coverage * 100)}%: bahagian pemberat yang mempunyai data sah.
        Data yang tidak diterbitkan menyumbang 0 kepada skor; ini bukan penilaian negatif terhadap
        mutu hotel atau PJH.
      </p>
    </div>
  );
}
