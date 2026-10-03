// Operasi suntingan draf katalog satu PJH. Fungsi tulen: (fail, op, konteks) → fail baharu.
// Setiap perubahan kandungan membatalkan semakan pentadbir (review → unreviewed).
// Harga baharu mesti disertakan bukti halaman (spesifikasi §11: jangan reka data).
import { z } from "zod";

import { DEFAULT_SOURCE_ID, type PjhCatalogFileInput } from "../catalog/schema";
import { sameContent } from "./diff";

const senInput = z.number().int().nonnegative().max(100_000_000_00);
const occupancy = z.number().int().min(1).max(12);
const nullableText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullable()
    .transform((v) => (v === "" ? null : v));

export const evidenceInput = z.object({
  pdfPage: z.number().int().min(1),
  text: z.string().trim().min(3, "Petikan bukti terlalu pendek").max(2000),
});
export type EvidenceInput = z.infer<typeof evidenceInput>;

const variantFields = z.object({
  code: z.string().trim().min(1).max(60),
  makkahOccupancy: occupancy,
  madinahOccupancy: occupancy,
  // Medan pilihan: `undefined` = kekalkan nilai sedia ada (cth. lajur CSV yang tiada).
  aziziyahOccupancy: occupancy.nullable().optional(),
  priceSen: senInput.nullable(),
  pmnStatus: z.enum(["included", "not_included", "not_stated"]).optional(),
  travellerCategory: z.enum(["adult", "child_with_bed", "child_no_bed", "infant"]),
  roomLabelAsPublished: nullableText(200).optional(),
  notes: nullableText(500).optional(),
});

const variantKey = z.object({
  code: z.string(),
  makkahOccupancy: z.number().int(),
  madinahOccupancy: z.number().int(),
  travellerCategory: z.string(),
});

const basis = z.enum(["per_person", "per_room", "per_group", "per_night"]);
const availability = z.enum(["published", "inquiry_required", "sold_out", "withdrawn"]);
const idInput = z
  .string()
  .trim()
  .regex(/^[a-z0-9-]+$/, "ID hanya huruf kecil, nombor dan sengkang")
  .max(120);

const upgradeFields = z.object({
  id: idInput,
  packageIds: z.array(z.string()).min(1),
  applicableVariantCodes: z.array(z.string()),
  includedInVariantCodes: z.array(z.string()),
  kind: z.enum(["aziziyah_room", "meal", "other"]),
  description: z.string().trim().min(1).max(500),
  priceSen: senInput.nullable(),
  basis,
  nightCount: z.number().int().positive().nullable(),
  resultingOccupancy: occupancy.nullable(),
  availability,
  condition: nullableText(500),
});

const chargeFields = z.object({
  id: idInput,
  packageIds: z.array(z.string()).min(1),
  description: z.string().trim().min(1).max(500),
  priceSen: senInput.nullable(),
  basis,
  nightCount: z.number().int().positive().nullable(),
  included: z.boolean(),
  kind: z.enum(["mandatory", "conditional"]),
});

const packageFields = z
  .object({
    name: z.string().trim().min(1).max(200),
    series: z.string().trim().min(1).max(200),
    availabilityStatus: availability,
    availabilityNote: nullableText(500),
    publishedStatus: z.enum(["published", "archived"]),
    tarwiyahStatus: z.enum([
      "offered",
      "offered_subject_to_approval",
      "explicitly_not_offered",
      "not_stated",
    ]),
    tarwiyahCondition: nullableText(500),
    aziziyahStatus: z.enum(["included", "optional", "explicitly_not_included", "not_stated"]),
    aziziyahCondition: nullableText(500),
    durationValue: z.number().positive().max(120).nullable(),
    durationMin: z.number().positive().max(120).nullable(),
    durationMax: z.number().positive().max(120).nullable(),
    durationApproximate: z.boolean(),
  })
  .partial();

export const draftOpSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("set_approval"),
    status: z.enum(["unverified", "verified_approved", "not_approved"]),
    officialSource: nullableText(300),
    officialReference: nullableText(500),
  }),
  z.object({
    op: z.literal("update_package"),
    packageId: z.string(),
    fields: packageFields,
    evidence: evidenceInput.optional(),
  }),
  z.object({
    op: z.literal("upsert_variant"),
    packageId: z.string(),
    original: variantKey.nullable(),
    variant: variantFields,
    evidence: evidenceInput.optional(),
  }),
  z.object({ op: z.literal("delete_variant"), packageId: z.string(), key: variantKey }),
  z.object({
    op: z.literal("upsert_upgrade"),
    originalId: z.string().nullable(),
    upgrade: upgradeFields,
    evidence: evidenceInput.optional(),
  }),
  z.object({ op: z.literal("delete_upgrade"), id: z.string() }),
  z.object({
    op: z.literal("upsert_charge"),
    originalId: z.string().nullable(),
    charge: chargeFields,
    evidence: evidenceInput.optional(),
  }),
  z.object({ op: z.literal("delete_charge"), id: z.string() }),
  z.object({ op: z.literal("delete_package"), packageId: z.string() }),
  /** Editor JSON lanjutan: gantikan keseluruhan fail (disahkan selepas itu). */
  z.object({ op: z.literal("replace_file"), file: z.record(z.string(), z.unknown()) }),
]);

export type DraftOp = z.infer<typeof draftOpSchema>;

export class OpError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OpError";
  }
}

export interface OpContext {
  actor: string;
  now: Date;
  role: "admin" | "reviewer";
}

type File = PjhCatalogFileInput;
type Pkg = File["packages"][number];
type VariantIn = Pkg["variants"][number];

const toEvidence = (e: EvidenceInput) => ({
  sourceId: DEFAULT_SOURCE_ID,
  pdfPage: e.pdfPage,
  text: e.text,
  status: "transcribed" as const,
});

const sameKey = (v: VariantIn, k: z.infer<typeof variantKey>) =>
  v.code === k.code &&
  v.makkahOccupancy === k.makkahOccupancy &&
  v.madinahOccupancy === k.madinahOccupancy &&
  (v.travellerCategory ?? "adult") === k.travellerCategory;

function findPackage(file: File, id: string): Pkg {
  const p = file.packages.find((x) => x.id === id);
  if (!p) throw new OpError(`Pakej ${id} tidak wujud dalam draf.`);
  return p;
}

/** Laksanakan satu operasi ke atas salinan fail. */
export function applyOp(input: File, op: DraftOp, ctx: OpContext): File {
  const file = structuredClone(input) as File;
  switch (op.op) {
    case "set_approval": {
      if (ctx.role !== "admin")
        throw new OpError("Hanya pentadbir boleh menukar status kelulusan PJH.");
      if (op.status !== "unverified" && !op.officialSource) {
        throw new OpError("Nyatakan sumber rasmi kelulusan (cth. senarai PJH diluluskan TH).");
      }
      file.pjh.approval =
        op.status === "unverified"
          ? {
              status: "unverified",
              officialSource: null,
              officialReference: null,
              verifiedAt: null,
              verifiedBy: null,
            }
          : {
              status: op.status,
              officialSource: op.officialSource,
              officialReference: op.officialReference,
              verifiedAt: ctx.now.toISOString(),
              verifiedBy: ctx.actor,
            };
      break;
    }
    case "update_package": {
      const p = findPackage(file, op.packageId);
      const orig = findPackage(input, op.packageId);
      const f = op.fields;
      if (f.name !== undefined) p.name = f.name;
      if (f.series !== undefined) p.series = f.series;
      if (f.availabilityStatus !== undefined)
        p.availability = { ...p.availability, status: f.availabilityStatus };
      if (f.availabilityNote !== undefined)
        p.availability = { ...p.availability, note: f.availabilityNote };
      if (f.publishedStatus !== undefined) p.publishedStatus = f.publishedStatus;
      const tarChanged =
        f.tarwiyahStatus !== undefined && f.tarwiyahStatus !== orig.tarwiyah.status;
      const azChanged = f.aziziyahStatus !== undefined && f.aziziyahStatus !== orig.aziziyah.status;
      const durChanged = f.durationValue !== undefined && f.durationValue !== orig.duration.value;
      const statusChanged = tarChanged || azChanged || durChanged;
      if (statusChanged && !op.evidence) {
        throw new OpError("Perubahan Tarwiyah, Aziziyah atau tempoh memerlukan bukti halaman.");
      }
      const ev = op.evidence ? [toEvidence(op.evidence)] : null;
      if (f.tarwiyahStatus !== undefined || f.tarwiyahCondition !== undefined) {
        p.tarwiyah = {
          ...p.tarwiyah,
          ...(f.tarwiyahStatus !== undefined ? { status: f.tarwiyahStatus } : {}),
          ...(f.tarwiyahCondition !== undefined ? { condition: f.tarwiyahCondition } : {}),
          ...(ev && tarChanged ? { evidence: ev } : {}),
        };
      }
      if (f.aziziyahStatus !== undefined || f.aziziyahCondition !== undefined) {
        p.aziziyah = {
          ...p.aziziyah,
          ...(f.aziziyahStatus !== undefined ? { status: f.aziziyahStatus } : {}),
          ...(f.aziziyahCondition !== undefined ? { condition: f.aziziyahCondition } : {}),
          ...(ev && azChanged ? { evidence: ev } : {}),
        };
      }
      if (
        f.durationValue !== undefined ||
        f.durationMin !== undefined ||
        f.durationMax !== undefined ||
        f.durationApproximate !== undefined
      ) {
        const d = { ...p.duration };
        if (f.durationValue !== undefined) d.value = f.durationValue;
        if (f.durationMin !== undefined) d.min = f.durationMin;
        if (f.durationMax !== undefined) d.max = f.durationMax;
        if (f.durationApproximate !== undefined) d.approximate = f.durationApproximate;
        if (d.min != null && d.max != null && d.min > d.max) {
          throw new OpError("Tempoh minimum tidak boleh melebihi maksimum.");
        }
        if (ev && durChanged) d.evidence = ev;
        p.duration = d;
      }
      break;
    }
    case "upsert_variant": {
      const p = findPackage(file, op.packageId);
      const idx = op.original ? p.variants.findIndex((v) => sameKey(v, op.original!)) : -1;
      if (op.original && idx < 0) throw new OpError(`Varian ${op.original.code} tidak wujud.`);
      const existing = idx >= 0 ? p.variants[idx] : null;
      const v = op.variant;
      const clash = p.variants.findIndex(
        (x, i) =>
          i !== idx &&
          sameKey(x, {
            code: v.code,
            makkahOccupancy: v.makkahOccupancy,
            madinahOccupancy: v.madinahOccupancy,
            travellerCategory: v.travellerCategory,
          }),
      );
      if (clash >= 0)
        throw new OpError(`Varian ${v.code} dengan susunan bilik yang sama sudah wujud.`);
      const priceChanged = !existing || existing.priceSen !== v.priceSen;
      if (v.priceSen !== null && priceChanged && !op.evidence) {
        throw new OpError(
          `Harga ${v.code} baharu atau berubah: masukkan halaman dan petikan bukti.`,
        );
      }
      const next: VariantIn = {
        ...(existing ?? {}),
        code: v.code,
        codeIsInternal: existing?.codeIsInternal ?? false,
        priceSen: v.priceSen,
        currency: "MYR",
        makkahOccupancy: v.makkahOccupancy,
        madinahOccupancy: v.madinahOccupancy,
        aziziyahOccupancy:
          v.aziziyahOccupancy !== undefined
            ? v.aziziyahOccupancy
            : (existing?.aziziyahOccupancy ?? null),
        pmnStatus: v.pmnStatus ?? existing?.pmnStatus ?? "not_stated",
        travellerCategory: v.travellerCategory,
        roomLabelAsPublished:
          v.roomLabelAsPublished !== undefined
            ? v.roomLabelAsPublished
            : (existing?.roomLabelAsPublished ?? null),
        notes: v.notes !== undefined ? v.notes : (existing?.notes ?? null),
        priceEvidence:
          op.evidence && (priceChanged || !existing?.priceEvidence?.length)
            ? [toEvidence(op.evidence)]
            : (existing?.priceEvidence ?? []),
      };
      if (idx >= 0) p.variants[idx] = next;
      else p.variants.push(next);
      break;
    }
    case "delete_variant": {
      const p = findPackage(file, op.packageId);
      const before = p.variants.length;
      p.variants = p.variants.filter((v) => !sameKey(v, op.key));
      if (p.variants.length === before) throw new OpError(`Varian ${op.key.code} tidak wujud.`);
      if (p.variants.length === 0) {
        throw new OpError(
          "Pakej mesti mempunyai sekurang-kurangnya satu varian. Arkibkan pakej jika perlu.",
        );
      }
      break;
    }
    case "upsert_upgrade":
    case "upsert_charge": {
      const isUpgrade = op.op === "upsert_upgrade";
      const list = (isUpgrade ? file.upgrades : file.charges) ?? [];
      const item = isUpgrade ? op.upgrade : op.charge;
      const idx = op.originalId ? list.findIndex((x) => x.id === op.originalId) : -1;
      if (op.originalId && idx < 0) throw new OpError(`${op.originalId} tidak wujud.`);
      const otherIds = [...(file.upgrades ?? []), ...(file.charges ?? [])]
        .map((x) => x.id)
        .filter((id) => id !== op.originalId);
      if (otherIds.includes(item.id)) throw new OpError(`ID ${item.id} sudah digunakan.`);
      for (const pid of item.packageIds) findPackage(file, pid);
      const existing = idx >= 0 ? list[idx] : null;
      const priceChanged = !existing || existing.priceSen !== item.priceSen;
      if (priceChanged && !op.evidence) {
        throw new OpError("Item baharu atau harga berubah memerlukan halaman dan petikan bukti.");
      }
      const evidence = op.evidence ? [toEvidence(op.evidence)] : existing!.evidence;
      const next = { ...(existing ?? {}), ...item, evidence };
      if (isUpgrade) {
        const ups = [...(file.upgrades ?? [])];
        if (idx >= 0) ups[idx] = next as (typeof ups)[number];
        else ups.push(next as (typeof ups)[number]);
        file.upgrades = ups;
      } else {
        const chs = [...(file.charges ?? [])];
        if (idx >= 0) chs[idx] = next as (typeof chs)[number];
        else chs.push(next as (typeof chs)[number]);
        file.charges = chs;
      }
      break;
    }
    case "delete_upgrade": {
      const before = file.upgrades?.length ?? 0;
      file.upgrades = (file.upgrades ?? []).filter((u) => u.id !== op.id);
      if (file.upgrades.length === before) throw new OpError(`Naik taraf ${op.id} tidak wujud.`);
      break;
    }
    case "delete_charge": {
      const before = file.charges?.length ?? 0;
      file.charges = (file.charges ?? []).filter((c) => c.id !== op.id);
      if (file.charges.length === before) throw new OpError(`Caj ${op.id} tidak wujud.`);
      break;
    }
    case "delete_package": {
      findPackage(file, op.packageId);
      const refs = [...(file.upgrades ?? []), ...(file.charges ?? [])].filter((x) =>
        x.packageIds.includes(op.packageId),
      );
      if (refs.length) {
        throw new OpError(
          `Pakej dirujuk oleh ${refs.map((r) => r.id).join(", ")}. Buang rujukan dahulu atau arkibkan pakej.`,
        );
      }
      file.packages = file.packages.filter((p) => p.id !== op.packageId);
      break;
    }
    case "replace_file": {
      const next = structuredClone(op.file) as unknown as File;
      if (next?.pjh?.id !== input.pjh.id) throw new OpError("pjh.id tidak boleh ditukar.");
      if (next.seasonId !== input.seasonId) throw new OpError("seasonId tidak boleh ditukar.");
      if (ctx.role !== "admin" && !sameApproval(input.pjh.approval, next.pjh?.approval)) {
        throw new OpError("Hanya pentadbir boleh menukar status atau maklumat kelulusan PJH.");
      }
      return withReviewReset(next);
    }
  }
  return withReviewReset(file);
}

const UNVERIFIED = {
  status: "unverified",
  officialSource: null,
  officialReference: null,
  verifiedAt: null,
  verifiedBy: null,
};

/** Bandingkan keseluruhan objek kelulusan (status, sumber rasmi, penyemak, tarikh). */
export function sameApproval(a: unknown, b: unknown) {
  return sameContent({ ...UNVERIFIED, ...(a as object) }, { ...UNVERIFIED, ...(b as object) });
}

/** Perubahan kandungan membatalkan semakan pentadbir sebelumnya. */
export function withReviewReset(file: File): File {
  return {
    ...file,
    review: { status: "unreviewed", approvedBy: null, approvedAt: null, notes: null },
  };
}

export function applyOps(file: File, ops: DraftOp[], ctx: OpContext): File {
  return ops.reduce((f, op) => applyOp(f, op, ctx), file);
}
