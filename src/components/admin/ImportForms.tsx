"use client";

import { Upload } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { CSV_OPTIONAL, CSV_REQUIRED } from "@/lib/admin/csv";

import { adminFetch } from "./api";
import { CheckField, Feedback, SelectField, TextField, type FeedbackState } from "./Fields";

interface ImportResult {
  pjhId: string;
  rows?: number;
  warnings: string[];
  validation: { ok: boolean; errors: string[]; warnings: string[] };
}

function Result({ r }: { r: ImportResult | null }) {
  if (!r) return null;
  return (
    <div className="rounded-md border p-3 text-sm">
      <p>
        Draf{" "}
        <Link href={`/admin/pjh/${r.pjhId}`} className="font-medium text-primary underline">
          {r.pjhId}
        </Link>{" "}
        dikemas kini{r.rows ? ` (${r.rows} baris)` : ""}. Validasi:{" "}
        {r.validation.ok ? "lulus" : `${r.validation.errors.length} ralat — semak dalam draf`}.
      </p>
      {r.warnings.length ? <p className="text-muted-foreground">{r.warnings.join("; ")}</p> : null}
    </div>
  );
}

const readFile = (f: File) => f.text();

export function ImportForms({
  seasonId,
  pjhs,
}: {
  seasonId: string;
  pjhs: { id: string; label: string }[];
}) {
  const [jsonState, setJsonState] = React.useState<FeedbackState>({ kind: "idle" });
  const [jsonResult, setJsonResult] = React.useState<ImportResult | null>(null);
  const [replace, setReplace] = React.useState(false);
  const [csvState, setCsvState] = React.useState<FeedbackState>({ kind: "idle" });
  const [csvResult, setCsvResult] = React.useState<ImportResult | null>(null);
  const [csvPjh, setCsvPjh] = React.useState(pjhs[0]?.id ?? "");
  const [csvText, setCsvText] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const jsonInput = React.useRef<HTMLInputElement>(null);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section
        aria-labelledby="import-json"
        className="flex flex-col gap-3 rounded-lg border bg-card p-4"
      >
        <h2 id="import-json" className="text-lg font-semibold">
          Fail JSON satu PJH
        </h2>
        <p className="text-sm text-muted-foreground">
          Skema sama seperti <code>data/catalog/1448h/&lt;pjh&gt;.json</code>. Diimport sebagai draf
          dan tidak terus diterbitkan.
        </p>
        <form
          className="flex flex-col gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            const file = jsonInput.current?.files?.[0];
            if (!file) return setJsonState({ kind: "error", message: "Pilih fail JSON." });
            if (file.size > 1_500_000)
              return setJsonState({ kind: "error", message: "Fail melebihi 1.5 MB." });
            let parsed: unknown;
            try {
              parsed = JSON.parse(await readFile(file));
            } catch (err) {
              return setJsonState({
                kind: "error",
                message: `JSON tidak sah: ${(err as Error).message}`,
              });
            }
            setBusy(true);
            const r = await adminFetch<ImportResult>("/api/admin/import", {
              body: { kind: "json", seasonId, file: parsed, replace },
            });
            setBusy(false);
            if (r.ok) {
              setJsonResult({ ...r.data, warnings: r.data.warnings ?? [] });
              setJsonState({ kind: "ok", message: "JSON diimport ke draf." });
            } else {
              setJsonResult(null);
              setJsonState({ kind: "error", message: r.message, details: r.details });
            }
          }}
        >
          <div className="flex flex-col gap-1">
            <label htmlFor="fail-json" className="text-sm font-medium">
              Fail .json
            </label>
            <input
              id="fail-json"
              ref={jsonInput}
              type="file"
              accept="application/json,.json"
              className="min-h-11 text-sm file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-md file:border-0 file:bg-secondary file:px-3"
            />
          </div>
          <CheckField
            label="Gantikan draf sedia ada untuk PJH ini"
            checked={replace}
            onChange={setReplace}
          />
          <Feedback state={jsonState} />
          <Button type="submit" disabled={busy} className="self-start">
            <Upload aria-hidden="true" />
            Import JSON
          </Button>
        </form>
        <Result r={jsonResult} />
      </section>

      <section
        aria-labelledby="import-csv"
        className="flex flex-col gap-3 rounded-lg border bg-card p-4"
      >
        <h2 id="import-csv" className="text-lg font-semibold">
          CSV varian
        </h2>
        <p className="text-sm text-muted-foreground">
          Lajur wajib: <code>{CSV_REQUIRED.join(", ")}</code>. Pilihan:{" "}
          <code>{CSV_OPTIONAL.join(", ")}</code>. Varian sedia ada (kod + bilik + kategori sama)
          dikemas kini; yang lain ditambah. Harga dalam RM; kosong = perlu pengesahan.
        </p>
        <form
          className="flex flex-col gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            const r = await adminFetch<ImportResult>("/api/admin/import", {
              body: { kind: "csv", seasonId, pjhId: csvPjh, csv: csvText },
            });
            setBusy(false);
            if (r.ok) {
              setCsvResult({ ...r.data, warnings: r.data.warnings ?? [] });
              setCsvState({ kind: "ok", message: `${r.data.rows} baris diimport ke draf.` });
            } else {
              setCsvResult(null);
              setCsvState({ kind: "error", message: r.message, details: r.details });
            }
          }}
        >
          <SelectField
            label="PJH"
            value={csvPjh}
            onChange={(e) => setCsvPjh(e.target.value)}
            options={pjhs.map((p) => ({ value: p.id, label: p.label }))}
          />
          <div className="flex flex-col gap-1">
            <label htmlFor="fail-csv" className="text-sm font-medium">
              Fail .csv (atau tampal di bawah)
            </label>
            <input
              id="fail-csv"
              type="file"
              accept="text/csv,.csv"
              className="min-h-11 text-sm file:mr-3 file:min-h-11 file:cursor-pointer file:rounded-md file:border-0 file:bg-secondary file:px-3"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) setCsvText(await readFile(f));
              }}
            />
          </div>
          <TextField
            label="Kandungan CSV"
            multiline
            rows={8}
            className="font-mono"
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
          />
          <Feedback state={csvState} />
          <Button type="submit" disabled={busy || !csvText.trim()} className="self-start">
            <Upload aria-hidden="true" />
            Import CSV
          </Button>
        </form>
        <Result r={csvResult} />
      </section>
    </div>
  );
}
