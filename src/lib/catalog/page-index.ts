// Indeks halaman sumber (data/sources/manifest.json): julat halaman setiap PJH dan metadata dokumen.
import manifest from "../../../data/sources/manifest.json";

import type { PageIndexPjh } from "./coverage";

interface SourceManifestEntry {
  id: string;
  filename: string;
  document_hash: string;
  page_count: number;
  page_index: { non_pjh_pages: number[]; pjhs: PageIndexPjh[] };
}

const sources = (manifest as unknown as { sources: SourceManifestEntry[] }).sources;

/** Sumber kompilasi utama (satu-satunya sumber katalog 1448H). */
export const PRIMARY_SOURCE = sources[0];
export const PAGE_INDEX: PageIndexPjh[] = PRIMARY_SOURCE.page_index.pjhs;

export const pageRangeOf = (pjhId: string) => {
  const e = PAGE_INDEX.find((p) => p.id === pjhId);
  return e ? ([e.pdf_pages[0], e.pdf_pages[1]] as [number, number]) : null;
};
