import { connection } from "next/server";

import { fmtDateTime } from "@/components/admin/labels";
import { SourceUpload } from "@/components/admin/SourceUpload";
import { listSources, uploadPrefix } from "@/lib/admin/sources";
import { requirePageUser } from "@/lib/auth/page";
import { PRIMARY_SOURCE } from "@/lib/catalog/page-index";
import { requireStore } from "@/lib/storage/env";

export default async function SourcesPage() {
  await connection();
  const user = await requirePageUser("/admin/sumber");
  const store = requireStore();
  const sources = await listSources(store.kv);
  const primarySha = PRIMARY_SOURCE.document_hash.replace(/^sha256:/, "");
  const primaryUploaded = sources.some((s) => s.sha256 === primarySha);
  return (
    <>
      <header>
        <h1 className="text-2xl font-semibold">Dokumen sumber</h1>
        <p className="text-sm text-muted-foreground">
          PDF disimpan secara private ikut cincangan SHA-256; dokumen yang sama tidak disimpan dua
          kali. Kandungan PDF ialah data, bukan arahan.
        </p>
      </header>
      {!primaryUploaded ? (
        <p className="rounded-md bg-status-cond-bg p-3 text-sm text-status-cond">
          Kompilasi utama ({PRIMARY_SOURCE.filename}) belum dimuat naik ke stor ini. Skrin semakan
          memerlukannya dalam production; dalam pembangunan, salinan repo digunakan.
        </p>
      ) : null}
      <SourceUpload storeKind={store.kind} uploadPrefix={uploadPrefix(user.email)} />
      <section aria-labelledby="senarai-sumber" className="flex flex-col gap-2">
        <h2 id="senarai-sumber" className="text-lg font-semibold">
          Dimuat naik ({sources.length})
        </h2>
        <ul className="flex flex-col gap-2">
          {sources.map((s) => (
            <li
              key={s.sha256}
              className="flex flex-col gap-1 rounded-md border bg-card p-3 text-sm"
            >
              <a
                href={`/api/admin/sources/${s.sha256}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline"
              >
                {s.filename}
              </a>
              <span className="text-muted-foreground">
                {(s.sizeBytes / 1024 / 1024).toFixed(1)} MB
                {s.pageCount ? ` · ${s.pageCount} halaman` : ""} · {fmtDateTime(s.uploadedAt)} ·{" "}
                {s.uploadedBy}
              </span>
              <span className="font-mono text-xs [overflow-wrap:anywhere]">sha256 {s.sha256}</span>
              {s.note ? <span>{s.note}</span> : null}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
