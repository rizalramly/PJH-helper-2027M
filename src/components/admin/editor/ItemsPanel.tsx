"use client";

import { Plus, Save, Trash2 } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import type { PjhCatalogFileInput } from "@/lib/catalog/schema";

import { rmToSen, senToRm } from "../api";
import type { EditorApi } from "../DraftEditor";
import { CheckField, SelectField, TextField } from "../Fields";
import { EvidenceFields, firstEvidence, toEvidence, type EvidenceDraft } from "./EvidenceFields";

type Upgrade = NonNullable<PjhCatalogFileInput["upgrades"]>[number];
type Charge = NonNullable<PjhCatalogFileInput["charges"]>[number];

const BASIS = [
  { value: "per_person", label: "Seorang" },
  { value: "per_room", label: "Sebilik" },
  { value: "per_group", label: "Sekumpulan" },
  { value: "per_night", label: "Semalam" },
];
const AVAIL = [
  { value: "published", label: "Diterbitkan" },
  { value: "inquiry_required", label: "Perlu pertanyaan" },
  { value: "sold_out", label: "Habis" },
  { value: "withdrawn", label: "Ditarik balik" },
];

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

function ItemForm({
  kind,
  item,
  file,
  api,
  onDone,
}: {
  kind: "upgrade" | "charge";
  item: Upgrade | Charge | null;
  file: PjhCatalogFileInput;
  api: EditorApi;
  onDone?: () => void;
}) {
  const up = kind === "upgrade" ? (item as Upgrade | null) : null;
  const ch = kind === "charge" ? (item as Charge | null) : null;
  const [f, setF] = React.useState({
    id: item?.id ?? "",
    description: item?.description ?? "",
    price: senToRm(item?.priceSen ?? null),
    basis: item?.basis ?? "per_person",
    nightCount: item?.nightCount?.toString() ?? "",
    packageIds: item?.packageIds ?? [],
    // naik taraf
    upgradeKind: up?.kind ?? "aziziyah_room",
    resultingOccupancy: up?.resultingOccupancy?.toString() ?? "",
    availability: up?.availability ?? "inquiry_required",
    condition: up?.condition ?? "",
    codes: (up?.applicableVariantCodes ?? []).join(", "),
    // caj
    included: ch?.included ?? false,
    chargeKind: ch?.kind ?? "mandatory",
  });
  const [ev, setEv] = React.useState<EvidenceDraft>(
    firstEvidence(item?.evidence, api.pageRange[0]),
  );
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));
  const title = kind === "upgrade" ? "Naik taraf" : "Caj";

  return (
    <form
      aria-label={`${title} ${item?.description ?? "baharu"}`}
      className="flex flex-col gap-2 rounded-md border bg-card p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const priceSen = rmToSen(f.price);
        if (Number.isNaN(priceSen))
          return setError("Harga mesti nombor RM (kosongkan jika belum diketahui).");
        if (!f.packageIds.length) return setError("Pilih sekurang-kurangnya satu pakej.");
        setError(null);
        const id =
          f.id ||
          `${file.pjh.id}-${kind === "upgrade" ? "naik-taraf" : "caj"}-${slug(f.description)}`;
        const common = {
          id,
          packageIds: f.packageIds,
          description: f.description,
          priceSen,
          basis: f.basis as Upgrade["basis"],
          nightCount: f.nightCount ? Number(f.nightCount) : null,
        };
        const ok =
          kind === "upgrade"
            ? await api.save(
                [
                  {
                    op: "upsert_upgrade",
                    originalId: item?.id ?? null,
                    upgrade: {
                      ...common,
                      applicableVariantCodes: f.codes
                        .split(",")
                        .map((c) => c.trim())
                        .filter(Boolean),
                      includedInVariantCodes: up?.includedInVariantCodes ?? [],
                      kind: f.upgradeKind as Upgrade["kind"],
                      resultingOccupancy: f.resultingOccupancy
                        ? Number(f.resultingOccupancy)
                        : null,
                      availability: f.availability as NonNullable<Upgrade["availability"]>,
                      condition: f.condition || null,
                    },
                    evidence: toEvidence(ev),
                  },
                ],
                "Naik taraf disimpan.",
              )
            : await api.save(
                [
                  {
                    op: "upsert_charge",
                    originalId: item?.id ?? null,
                    charge: {
                      ...common,
                      included: f.included,
                      kind: f.chargeKind as Charge["kind"],
                    },
                    evidence: toEvidence(ev),
                  },
                ],
                "Caj disimpan.",
              );
        if (ok) onDone?.();
      }}
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <TextField
          label="Keterangan"
          value={f.description}
          onChange={(e) => set("description", e.target.value)}
          required
          className="sm:col-span-2"
        />
        <TextField
          label="Harga (RM)"
          inputMode="decimal"
          value={f.price}
          onChange={(e) => set("price", e.target.value)}
          hint="Kosong = perlu pengesahan (bukan RM0)"
        />
        <SelectField
          label="Asas harga"
          value={f.basis}
          onChange={(e) => set("basis", e.target.value as typeof f.basis)}
          options={BASIS}
        />
        {f.basis === "per_night" ? (
          <TextField
            label="Bilangan malam"
            inputMode="numeric"
            value={f.nightCount}
            onChange={(e) => set("nightCount", e.target.value)}
          />
        ) : null}
        {kind === "upgrade" ? (
          <>
            <SelectField
              label="Jenis"
              value={f.upgradeKind}
              onChange={(e) => set("upgradeKind", e.target.value as typeof f.upgradeKind)}
              options={[
                { value: "aziziyah_room", label: "Bilik Aziziyah" },
                { value: "meal", label: "Makanan" },
                { value: "other", label: "Lain-lain" },
              ]}
            />
            <TextField
              label="Susunan bilik selepas naik taraf"
              inputMode="numeric"
              value={f.resultingOccupancy}
              onChange={(e) => set("resultingOccupancy", e.target.value)}
            />
            <SelectField
              label="Kekosongan"
              value={f.availability}
              onChange={(e) => set("availability", e.target.value as typeof f.availability)}
              options={AVAIL}
            />
            <TextField
              label="Kod varian layak (koma; kosong = semua)"
              value={f.codes}
              onChange={(e) => set("codes", e.target.value)}
            />
            <TextField
              label="Syarat"
              value={f.condition}
              onChange={(e) => set("condition", e.target.value)}
              className="sm:col-span-2"
            />
          </>
        ) : (
          <>
            <SelectField
              label="Jenis caj"
              value={f.chargeKind}
              onChange={(e) => set("chargeKind", e.target.value as typeof f.chargeKind)}
              options={[
                { value: "mandatory", label: "Wajib" },
                { value: "conditional", label: "Bersyarat" },
              ]}
            />
            <CheckField
              label="Sudah termasuk dalam harga varian"
              checked={f.included}
              onChange={(v) => set("included", v)}
            />
          </>
        )}
      </div>
      <fieldset className="flex flex-col gap-1">
        <legend className="text-sm font-medium">Pakej berkaitan</legend>
        <div className="flex flex-wrap gap-x-4">
          {file.packages.map((p) => (
            <CheckField
              key={p.id}
              label={p.name}
              checked={f.packageIds.includes(p.id)}
              onChange={(on) =>
                set(
                  "packageIds",
                  on ? [...f.packageIds, p.id] : f.packageIds.filter((x) => x !== p.id),
                )
              }
            />
          ))}
        </div>
      </fieldset>
      <EvidenceFields value={ev} onChange={setEv} range={api.pageRange} required />
      {error ? (
        <p role="alert" className="text-sm text-status-fail">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={api.busy}>
          <Save aria-hidden="true" />
          Simpan {title.toLowerCase()}
        </Button>
        {item ? (
          confirmDelete ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={api.busy}
                onClick={() =>
                  void api.save(
                    [
                      kind === "upgrade"
                        ? { op: "delete_upgrade", id: item.id }
                        : { op: "delete_charge", id: item.id },
                    ],
                    `${title} dipadam.`,
                  )
                }
              >
                Sahkan padam
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setConfirmDelete(false)}
              >
                Batal
              </Button>
            </>
          ) : (
            <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmDelete(true)}>
              <Trash2 aria-hidden="true" />
              Padam
            </Button>
          )
        ) : null}
      </div>
    </form>
  );
}

export function ItemsPanel({ file, api }: { file: PjhCatalogFileInput; api: EditorApi }) {
  const [adding, setAdding] = React.useState<"upgrade" | "charge" | null>(null);
  return (
    <div className="flex flex-col gap-6">
      {(
        [
          ["upgrade", "Naik taraf", file.upgrades ?? []],
          ["charge", "Caj tambahan", file.charges ?? []],
        ] as const
      ).map(([kind, title, list]) => (
        <section key={kind} aria-label={title} className="flex flex-col gap-2">
          <h3 className="font-semibold">
            {title} ({list.length})
          </h3>
          {list.map((item) => (
            <details key={JSON.stringify(item)} className="rounded-md border bg-card">
              <summary className="flex min-h-11 cursor-pointer items-center px-3 text-sm font-medium">
                {item.description} ·{" "}
                {item.priceSen === null || item.priceSen === undefined
                  ? "harga perlu pengesahan"
                  : `RM ${senToRm(item.priceSen)}`}
              </summary>
              <div className="p-2">
                <ItemForm kind={kind} item={item} file={file} api={api} />
              </div>
            </details>
          ))}
          {adding === kind ? (
            <ItemForm
              kind={kind}
              item={null}
              file={file}
              api={api}
              onDone={() => setAdding(null)}
            />
          ) : (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="self-start"
              onClick={() => setAdding(kind)}
            >
              <Plus aria-hidden="true" />
              Tambah {title.toLowerCase()}
            </Button>
          )}
        </section>
      ))}
    </div>
  );
}
