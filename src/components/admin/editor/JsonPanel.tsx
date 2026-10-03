"use client";

import { Save } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { fileFromEditor, jsonForRole } from "@/lib/admin/json-edit";
import type { PjhCatalogFileInput } from "@/lib/catalog/schema";

import type { EditorApi } from "../DraftEditor";
import { TextField } from "../Fields";

/** Editor JSON lanjutan untuk medan yang tiada borang (stays, bukti, jurang, terma). */
export function JsonPanel({
  file,
  api,
  role,
}: {
  file: PjhCatalogFileInput;
  api: EditorApi;
  role: "admin" | "reviewer";
}) {
  const [text, setText] = React.useState(() => jsonForRole(file, role));
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
          [
            {
              op: "replace_file",
              file: fileFromEditor(parsed as Record<string, unknown>, file, role),
            },
          ],
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
        hint={
          role === "admin"
            ? "Wang dalam sen (integer). null = tidak dinyatakan dalam sumber. Validasi dijalankan selepas simpan."
            : "Wang dalam sen (integer). null = tidak dinyatakan dalam sumber. Kelulusan PJH diurus oleh pentadbir dan tidak dipaparkan di sini."
        }
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
