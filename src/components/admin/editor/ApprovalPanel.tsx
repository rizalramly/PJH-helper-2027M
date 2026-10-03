"use client";

import * as React from "react";

import { StatusBadge } from "@/components/results/StatusBadge";
import { Button } from "@/components/ui/button";
import type { PjhCatalogFileInput } from "@/lib/catalog/schema";

import type { EditorApi } from "../DraftEditor";
import { SelectField, TextField } from "../Fields";
import { APPROVAL, fmtDateTime } from "../labels";

export function ApprovalPanel({ file, api }: { file: PjhCatalogFileInput; api: EditorApi }) {
  const a = file.pjh.approval ?? {
    status: "unverified",
    officialSource: null,
    officialReference: null,
    verifiedAt: null,
    verifiedBy: null,
  };
  const [status, setStatus] = React.useState(a.status);
  const [source, setSource] = React.useState(a.officialSource ?? "");
  const [ref, setRef] = React.useState(a.officialReference ?? "");
  const st = APPROVAL[a.status];
  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-3">
      <p>
        <StatusBadge status={st.status}>{st.text}</StatusBadge>
      </p>
      {a.status !== "unverified" ? (
        <p className="text-sm">
          Sumber rasmi: {a.officialSource}
          {a.officialReference ? ` (${a.officialReference})` : ""}. Disahkan{" "}
          {fmtDateTime(a.verifiedAt)} oleh {a.verifiedBy}.
        </p>
      ) : null}
      <p className="text-sm text-muted-foreground">
        Brosur atau nombor lesen yang dicetak bukan bukti kelulusan musim ini. Tukar status hanya
        berdasarkan sumber rasmi (cth. senarai PJH diluluskan Tabung Haji bagi musim {file.seasonId}
        ).
      </p>
      {api.role === "admin" ? (
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void api.save(
              [
                {
                  op: "set_approval",
                  status,
                  officialSource: source.trim() || null,
                  officialReference: ref.trim() || null,
                },
              ],
              "Status kelulusan dikemas kini dalam draf.",
            );
          }}
        >
          <SelectField
            label="Status kelulusan musim ini"
            value={status}
            onChange={(e) => setStatus(e.target.value as typeof status)}
            options={[
              { value: "unverified", label: "Belum disahkan" },
              { value: "verified_approved", label: "Disahkan diluluskan" },
              { value: "not_approved", label: "Disahkan tidak diluluskan" },
            ]}
          />
          {status !== "unverified" ? (
            <>
              <TextField
                label="Sumber rasmi"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                required
              />
              <TextField
                label="URL atau nombor rujukan (pilihan)"
                value={ref}
                onChange={(e) => setRef(e.target.value)}
              />
            </>
          ) : null}
          <Button type="submit" disabled={api.busy} className="self-start">
            Simpan status kelulusan
          </Button>
        </form>
      ) : (
        <p className="text-sm">Hanya pentadbir boleh menukar status kelulusan.</p>
      )}
    </div>
  );
}
