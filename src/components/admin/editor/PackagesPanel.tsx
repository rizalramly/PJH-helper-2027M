"use client";

import { Plus, Save, Trash2 } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import type { PjhCatalogFileInput } from "@/lib/catalog/schema";

import { rmToSen, senToRm } from "../api";
import type { EditorApi } from "../DraftEditor";
import { CheckField, SelectField, TextField } from "../Fields";
import { EvidenceFields, firstEvidence, toEvidence, type EvidenceDraft } from "./EvidenceFields";

type Pkg = PjhCatalogFileInput["packages"][number];
type Variant = Pkg["variants"][number];

const OCC = ["1", "2", "3", "4", "5", "6", "7", "8"].map((v) => ({ value: v, label: `ber-${v}` }));
const PMN = [
  { value: "included", label: "PMN termasuk" },
  { value: "not_included", label: "Tanpa PMN" },
  { value: "not_stated", label: "Tidak dinyatakan" },
];
const CATEGORY = [
  { value: "adult", label: "Dewasa" },
  { value: "child_with_bed", label: "Kanak-kanak (dengan katil)" },
  { value: "child_no_bed", label: "Kanak-kanak (tanpa katil)" },
  { value: "infant", label: "Bayi" },
];
const AVAIL = [
  { value: "published", label: "Diterbitkan (kekosongan belum disahkan)" },
  { value: "inquiry_required", label: "Perlu pertanyaan" },
  { value: "sold_out", label: "Habis" },
  { value: "withdrawn", label: "Ditarik balik" },
];
const TARWIYAH = [
  { value: "offered", label: "Ditawarkan" },
  { value: "offered_subject_to_approval", label: "Ditawarkan tertakluk kelulusan" },
  { value: "explicitly_not_offered", label: "Tidak dilaksanakan" },
  { value: "not_stated", label: "Tidak dinyatakan" },
];
const AZIZIYAH = [
  { value: "included", label: "Termasuk" },
  { value: "optional", label: "Pilihan" },
  { value: "explicitly_not_included", label: "Tidak termasuk" },
  { value: "not_stated", label: "Tidak dinyatakan" },
];

const numOrNull = (v: string) => (v.trim() === "" ? null : Number(v));

function PackageForm({ pkg, api }: { pkg: Pkg; api: EditorApi }) {
  const [f, setF] = React.useState({
    name: pkg.name,
    series: pkg.series,
    availabilityStatus: pkg.availability.status,
    availabilityNote: pkg.availability.note ?? "",
    publishedStatus: pkg.publishedStatus ?? "published",
    tarwiyahStatus: pkg.tarwiyah.status,
    tarwiyahCondition: pkg.tarwiyah.condition ?? "",
    aziziyahStatus: pkg.aziziyah.status,
    aziziyahCondition: pkg.aziziyah.condition ?? "",
    durationValue: pkg.duration.value?.toString() ?? "",
    durationMin: pkg.duration.min?.toString() ?? "",
    durationMax: pkg.duration.max?.toString() ?? "",
    durationApproximate: pkg.duration.approximate,
  });
  const [ev, setEv] = React.useState<EvidenceDraft>({ page: String(api.pageRange[0]), text: "" });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }));

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const fields = {
          name: f.name,
          series: f.series,
          availabilityStatus: f.availabilityStatus,
          availabilityNote: f.availabilityNote || null,
          publishedStatus: f.publishedStatus,
          tarwiyahStatus: f.tarwiyahStatus,
          tarwiyahCondition: f.tarwiyahCondition || null,
          aziziyahStatus: f.aziziyahStatus,
          aziziyahCondition: f.aziziyahCondition || null,
          durationValue: numOrNull(f.durationValue),
          durationMin: numOrNull(f.durationMin),
          durationMax: numOrNull(f.durationMax),
          durationApproximate: f.durationApproximate,
        };
        void api.save(
          [{ op: "update_package", packageId: pkg.id, fields, evidence: toEvidence(ev) }],
          `Pakej ${f.name} dikemas kini.`,
        );
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          label="Nama pakej"
          value={f.name}
          onChange={(e) => set("name", e.target.value)}
        />
        <TextField label="Siri" value={f.series} onChange={(e) => set("series", e.target.value)} />
        <SelectField
          label="Status terbit"
          value={f.publishedStatus}
          onChange={(e) => set("publishedStatus", e.target.value as "published" | "archived")}
          options={[
            { value: "published", label: "Diterbitkan" },
            { value: "archived", label: "Diarkibkan (tidak dicadangkan)" },
          ]}
        />
        <SelectField
          label="Kekosongan"
          value={f.availabilityStatus}
          onChange={(e) => set("availabilityStatus", e.target.value as typeof f.availabilityStatus)}
          options={AVAIL}
        />
        <SelectField
          label="Tarwiyah"
          value={f.tarwiyahStatus}
          onChange={(e) => set("tarwiyahStatus", e.target.value as typeof f.tarwiyahStatus)}
          options={TARWIYAH}
        />
        <TextField
          label="Syarat Tarwiyah"
          value={f.tarwiyahCondition}
          onChange={(e) => set("tarwiyahCondition", e.target.value)}
        />
        <SelectField
          label="Aziziyah"
          value={f.aziziyahStatus}
          onChange={(e) => set("aziziyahStatus", e.target.value as typeof f.aziziyahStatus)}
          options={AZIZIYAH}
        />
        <TextField
          label="Syarat Aziziyah"
          value={f.aziziyahCondition}
          onChange={(e) => set("aziziyahCondition", e.target.value)}
        />
        <TextField
          label="Tempoh (hari)"
          inputMode="numeric"
          value={f.durationValue}
          onChange={(e) => set("durationValue", e.target.value)}
        />
        <div className="grid grid-cols-2 gap-2">
          <TextField
            label="Min"
            inputMode="numeric"
            value={f.durationMin}
            onChange={(e) => set("durationMin", e.target.value)}
          />
          <TextField
            label="Maks"
            inputMode="numeric"
            value={f.durationMax}
            onChange={(e) => set("durationMax", e.target.value)}
          />
        </div>
      </div>
      <CheckField
        label="Tempoh ialah anggaran (±)"
        checked={f.durationApproximate}
        onChange={(v) => set("durationApproximate", v)}
      />
      <TextField
        label="Nota kekosongan"
        value={f.availabilityNote}
        onChange={(e) => set("availabilityNote", e.target.value)}
      />
      <EvidenceFields value={ev} onChange={setEv} range={api.pageRange} required />
      <Button type="submit" disabled={api.busy} className="self-start">
        <Save aria-hidden="true" />
        Simpan pakej
      </Button>
    </form>
  );
}

function VariantForm({
  pkg,
  variant,
  api,
  onDone,
}: {
  pkg: Pkg;
  variant: Variant | null;
  api: EditorApi;
  onDone?: () => void;
}) {
  const [v, setV] = React.useState({
    code: variant?.code ?? "",
    makkah: String(variant?.makkahOccupancy ?? 2),
    madinah: String(variant?.madinahOccupancy ?? 2),
    aziziyah: variant?.aziziyahOccupancy ? String(variant.aziziyahOccupancy) : "",
    price: senToRm(variant?.priceSen ?? null),
    pmn: variant?.pmnStatus ?? "not_stated",
    category: variant?.travellerCategory ?? "adult",
    roomLabel: variant?.roomLabelAsPublished ?? "",
    notes: variant?.notes ?? "",
  });
  const [ev, setEv] = React.useState<EvidenceDraft>(
    firstEvidence(variant?.priceEvidence, api.pageRange[0]),
  );
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const set = (k: keyof typeof v, val: string) => setV((s) => ({ ...s, [k]: val }));
  const original = variant
    ? {
        code: variant.code,
        makkahOccupancy: variant.makkahOccupancy,
        madinahOccupancy: variant.madinahOccupancy,
        travellerCategory: variant.travellerCategory ?? "adult",
      }
    : null;
  const label = variant ? `${variant.code} ber-${variant.makkahOccupancy}` : "varian baharu";

  return (
    <form
      aria-label={`Varian ${label}`}
      className="flex flex-col gap-2 rounded-md border p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const priceSen = rmToSen(v.price);
        if (Number.isNaN(priceSen)) {
          setError("Harga mesti nombor RM, contohnya 86,490 (kosongkan jika belum diketahui).");
          return;
        }
        setError(null);
        const ok = await api.save(
          [
            {
              op: "upsert_variant",
              packageId: pkg.id,
              original,
              variant: {
                code: v.code.trim(),
                makkahOccupancy: Number(v.makkah),
                madinahOccupancy: Number(v.madinah),
                aziziyahOccupancy: v.aziziyah ? Number(v.aziziyah) : null,
                priceSen,
                pmnStatus: v.pmn as Variant["pmnStatus"],
                travellerCategory: v.category as "adult",
                roomLabelAsPublished: v.roomLabel || null,
                notes: v.notes || null,
              },
              evidence: toEvidence(ev),
            },
          ],
          `Varian ${v.code} disimpan.`,
        );
        if (ok) onDone?.();
      }}
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <TextField
          label="Kod"
          value={v.code}
          onChange={(e) => set("code", e.target.value)}
          required
        />
        <TextField
          label="Harga seorang (RM)"
          inputMode="decimal"
          value={v.price}
          onChange={(e) => set("price", e.target.value)}
          hint="Kosong = perlu pengesahan"
        />
        <SelectField
          label="Makkah"
          value={v.makkah}
          onChange={(e) => set("makkah", e.target.value)}
          options={OCC}
        />
        <SelectField
          label="Madinah"
          value={v.madinah}
          onChange={(e) => set("madinah", e.target.value)}
          options={OCC}
        />
        <SelectField
          label="Aziziyah"
          value={v.aziziyah}
          onChange={(e) => set("aziziyah", e.target.value)}
          options={[{ value: "", label: "Tidak dicetak" }, ...OCC]}
        />
        <SelectField
          label="PMN"
          value={v.pmn}
          onChange={(e) => set("pmn", e.target.value)}
          options={PMN}
        />
        <SelectField
          label="Kategori"
          value={v.category}
          onChange={(e) => set("category", e.target.value)}
          options={CATEGORY}
        />
        <TextField
          label="Label bilik dicetak"
          value={v.roomLabel}
          onChange={(e) => set("roomLabel", e.target.value)}
        />
      </div>
      <EvidenceFields value={ev} onChange={setEv} range={api.pageRange} required />
      {error ? (
        <p role="alert" className="text-sm text-status-fail">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" disabled={api.busy}>
          <Save aria-hidden="true" />
          Simpan varian
        </Button>
        {ev.page ? (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => api.showPage(Number(ev.page))}
          >
            Lihat hlm. {ev.page}
          </Button>
        ) : null}
        {variant && original ? (
          confirmDelete ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                disabled={api.busy}
                onClick={() =>
                  void api.save(
                    [{ op: "delete_variant", packageId: pkg.id, key: original }],
                    `Varian ${variant.code} dipadam.`,
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

export function PackagesPanel({ file, api }: { file: PjhCatalogFileInput; api: EditorApi }) {
  const [adding, setAdding] = React.useState<string | null>(null);
  return (
    <ul className="flex flex-col gap-3">
      {file.packages.map((pkg) => (
        <li key={pkg.id}>
          <details className="rounded-lg border bg-card">
            <summary className="flex min-h-11 cursor-pointer flex-wrap items-center gap-x-3 px-3 py-2">
              <span className="font-semibold">{pkg.name}</span>
              <span className="text-sm text-muted-foreground">
                {pkg.variants.length} varian
                {pkg.publishedStatus === "archived" ? " · diarkibkan" : ""}
              </span>
            </summary>
            <div className="flex flex-col gap-4 border-t p-3">
              <PackageForm key={JSON.stringify(pkg)} pkg={pkg} api={api} />
              <section aria-label={`Varian ${pkg.name}`} className="flex flex-col gap-2">
                <h3 className="font-semibold">Varian</h3>
                {pkg.variants.map((v) => (
                  <VariantForm
                    key={`${v.code}-${v.makkahOccupancy}-${v.madinahOccupancy}-${v.travellerCategory}-${v.priceSen}`}
                    pkg={pkg}
                    variant={v}
                    api={api}
                  />
                ))}
                {adding === pkg.id ? (
                  <VariantForm pkg={pkg} variant={null} api={api} onDone={() => setAdding(null)} />
                ) : (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="self-start"
                    onClick={() => setAdding(pkg.id)}
                  >
                    <Plus aria-hidden="true" />
                    Tambah varian
                  </Button>
                )}
              </section>
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}
