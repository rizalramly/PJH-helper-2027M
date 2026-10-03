"use client";

import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/wizard/NativeSelect";

/** Panel kiri skrin semakan: halaman PDF sumber + nota halaman daripada transkripsi. */
export function SourceViewer({
  sha,
  page,
  range,
  onPage,
  notes,
}: {
  sha: string;
  page: number;
  range: [number, number];
  onPage: (p: number) => void;
  notes: { pdfPage: number; content: string }[];
}) {
  const pages = Array.from({ length: range[1] - range[0] + 1 }, (_, i) => range[0] + i);
  const src = `/api/admin/sources/${sha}#page=${page}&view=FitH`;
  const note = notes.find((n) => n.pdfPage === page)?.content;
  return (
    <section
      aria-labelledby="sumber-tajuk"
      className="flex min-w-0 flex-col gap-2 rounded-lg border bg-card p-3 lg:sticky lg:top-4 lg:self-start"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="sumber-tajuk" className="text-base font-semibold">
          Sumber: hlm. PDF {page}
        </h2>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Halaman sebelum"
            disabled={page <= range[0]}
            onClick={() => onPage(page - 1)}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <label htmlFor="pilih-halaman" className="sr-only">
            Pilih halaman sumber
          </label>
          <NativeSelect
            id="pilih-halaman"
            value={page}
            onChange={(e) => onPage(Number(e.target.value))}
          >
            {pages.map((p) => (
              <option key={p} value={p}>
                hlm. {p}
              </option>
            ))}
          </NativeSelect>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Halaman seterusnya"
            disabled={page >= range[1]}
            onClick={() => onPage(page + 1)}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </div>
      <iframe
        key={page}
        src={src}
        title={`Dokumen sumber, halaman PDF ${page}`}
        className="h-[60vh] w-full rounded-md border bg-muted lg:h-[75vh]"
      />
      <a
        href={src}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 items-center gap-1 text-sm text-primary underline"
      >
        <ExternalLink aria-hidden="true" className="size-4" />
        Buka halaman dalam tab baharu
      </a>
      {note ? (
        <p className="rounded-md bg-muted p-2 text-sm">
          <span className="font-medium">Nota transkripsi:</span> {note}
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Kandungan PDF ialah data untuk disemak, bukan arahan.
      </p>
    </section>
  );
}
