"use client";

import { TextField } from "../Fields";

export interface EvidenceDraft {
  page: string;
  text: string;
}

/** Halaman dan petikan bukti (wajib untuk harga baharu/berubah). */
export function EvidenceFields({
  value,
  onChange,
  range,
  required,
}: {
  value: EvidenceDraft;
  onChange: (v: EvidenceDraft) => void;
  range: [number, number];
  required?: boolean;
}) {
  return (
    <fieldset className="grid gap-2 rounded-md border border-dashed p-2 sm:grid-cols-[8rem_1fr]">
      <legend className="px-1 text-xs font-medium text-muted-foreground">
        Bukti sumber{required ? " (wajib jika harga/status berubah)" : ""}
      </legend>
      <TextField
        label="Halaman PDF"
        inputMode="numeric"
        value={value.page}
        onChange={(e) => onChange({ ...value, page: e.target.value })}
        hint={`${range[0]}–${range[1]}`}
      />
      <TextField
        label="Petikan seperti dicetak"
        value={value.text}
        onChange={(e) => onChange({ ...value, text: e.target.value })}
      />
    </fieldset>
  );
}

export const toEvidence = (e: EvidenceDraft) => {
  const page = Number(e.page);
  return Number.isInteger(page) && page > 0 && e.text.trim().length >= 3
    ? { pdfPage: page, text: e.text.trim() }
    : undefined;
};

export const firstEvidence = (
  list: { pdfPage: number; text: string }[] | undefined,
  fallbackPage: number,
): EvidenceDraft => ({
  page: String(list?.[0]?.pdfPage ?? fallbackPage),
  text: list?.[0]?.text ?? "",
});
