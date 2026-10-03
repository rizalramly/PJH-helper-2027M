"use client";

import { Save } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import type { PjhCatalogFileInput } from "@/lib/catalog/schema";

import type { EditorApi } from "../DraftEditor";
import { TextField } from "../Fields";

/** Editor JSON lanjutan untuk medan yang tiada borang (stays, bukti, jurang, terma). */
export function JsonPanel({ file, api }: { file: PjhCatalogFileInput; api: EditorApi }) {
  const [text, setText] = React.useState(() => JSON.stringify(file, null, 2));
  const [error, setError] = React.useState<string | null>(null);
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        let parsed: unknown;
        try {
          parsed = JSON.parse(text);
        } catch (err) {
          setError(`JSON tidak sah: ${(err as Error).message}`);
          return;
        }
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          setError("JSON mesti satu objek fail PJH.");
          return;
        }
        setError(null);
        void api.save(
          [{ op: "replace_file", file: parsed as Record<string, unknown> }],
          "Fail JSON disimpan ke draf.",
        );
      }}
    >
      <TextField
        label="Fail katalog PJH (JSON)"
        multiline
        spellCheck={false}
        rows={24}
        className="font-mono"
        value={text}
        onChange={(e) => setText(e.target.value)}
        hint="Wang dalam sen (integer). null = tidak dinyatakan dalam sumber. Validasi dijalankan selepas simpan."
      />
      {error ? (
        <p role="alert" className="text-sm text-status-fail">
          {error}
        </p>
      ) : null}
      <Button type="submit" disabled={api.busy} className="self-start">
        <Save aria-hidden="true" />
        Simpan JSON
      </Button>
    </form>
  );
}
