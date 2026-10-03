// Skema fail katalog satu PJH: data/catalog/<season>/<pjh-id>.json
// Wang dalam JSON ialah integer sen (number); loader menukar kepada bigint.
// `null` = tidak dinyatakan dalam sumber selepas semakan. Jangan isi nilai yang tidak dicetak.
import { z } from "zod";

export const DEFAULT_SOURCE_ID = "compilation-34pjh-1448h";

const sen = z.number().int().nonnegative();
export const occupancy = z.number().int().min(1).max(12);

export const evidenceSchema = z.object({
  sourceId: z.string().default(DEFAULT_SOURCE_ID),
  pdfPage: z.number().int().min(1),
  brochurePage: z.number().int().min(1).optional(),
  text: z.string().min(1),
  status: z.enum(["transcribed", "verified", "conflict", "unclear"]).default("transcribed"),
});

const evidenceList = z.array(evidenceSchema).default([]);

const transportClass = z.enum(["business", "economy", "not_stated"]);
export const basis = z.enum(["per_person", "per_room", "per_group", "per_night"]);
export const availability = z.enum(["published", "inquiry_required", "sold_out", "withdrawn"]);

export const staySchema = z.object({
  location: z.enum(["makkah", "madinah", "aziziyah", "mina"]),
  sequence: z.number().int().min(1),
  hotelNameAsPublished: z.string().min(1),
  orEquivalent: z.boolean(),
  roomCategory: z.string().nullable().default(null),
  dateLabel: z.string().nullable().default(null),
  nightCount: z.number().int().positive().nullable().default(null),
  distanceM: z.number().nonnegative().nullable().default(null),
  distanceIsApproximate: z.boolean().default(false),
  distanceReference: z
    .enum(["haram_courtyard", "nabawi_courtyard", "jamarat", "other", "not_stated"])
    .default("not_stated"),
  distanceReferenceAsPublished: z.string().nullable().default(null),
  meals: z.string().nullable().default(null),
  roomSizeSqm: z.number().positive().nullable().default(null),
  privateBathroom: z.boolean().nullable().default(null),
  privateForBookingGroup: z.boolean().nullable().default(null),
  genderSeparated: z.boolean().nullable().default(null),
  evidence: evidenceList,
});

export const variantSchema = z
  .object({
    /** Kod seperti dicetak; jika tiada, ID dalaman stabil dan codeIsInternal=true. */
    code: z.string().min(1),
    codeIsInternal: z.boolean().default(false),
    priceSen: sen.nullable(),
    currency: z.literal("MYR").default("MYR"),
    makkahOccupancy: occupancy,
    madinahOccupancy: occupancy,
    /** Susunan bilik Aziziyah khusus varian ini jika dicetak (cth. ber-2 Makkah tetapi ber-4 Aziziyah). */
    aziziyahOccupancy: occupancy.nullable().default(null),
    pmnStatus: z.enum(["included", "not_included", "not_stated"]),
    travellerCategory: z
      .enum(["adult", "child_with_bed", "child_no_bed", "infant"])
      .default("adult"),
    roomLabelAsPublished: z.string().nullable().default(null),
    notes: z.string().nullable().default(null),
    priceEvidence: evidenceList,
  })
  .refine((v) => v.priceSen === null || v.priceEvidence.length > 0, {
    message: "Varian berharga mesti ada priceEvidence",
  });

export const packageSchema = z.object({
  /** `<pjh-id>-<slug>`, huruf kecil dan sengkang. */
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1),
  series: z.string().min(1),
  tierLabel: z.string().nullable().default(null),
  duration: z.object({
    value: z.number().positive().nullable(),
    min: z.number().positive().nullable().default(null),
    max: z.number().positive().nullable().default(null),
    approximate: z.boolean(),
    evidence: evidenceList,
  }),
  travelDates: z
    .object({ label: z.string().nullable(), evidence: evidenceList })
    .default({ label: null, evidence: [] }),
  tarwiyah: z.object({
    status: z.enum([
      "offered",
      "offered_subject_to_approval",
      "explicitly_not_offered",
      "not_stated",
    ]),
    condition: z.string().nullable().default(null),
    description: z.string().nullable().default(null),
    evidence: evidenceList,
  }),
  aziziyah: z.object({
    status: z.enum(["included", "optional", "explicitly_not_included", "not_stated"]),
    condition: z.string().nullable().default(null),
    defaultOccupancies: z.array(occupancy).nullable().default(null),
    defaultArrangementNote: z.string().nullable().default(null),
    /** Label penginapan seperti dicetak jika bukan "Aziziyah" (cth. "Syisyah", "hotel Mina", "hotel transit"). */
    labelAsPublished: z.string().nullable().default(null),
    dateLabel: z.string().nullable().default(null),
    nightCount: z.number().int().positive().nullable().default(null),
    evidence: evidenceList,
  }),
  masyair: z.object({
    type: z.enum(["pmn", "muaisim", "not_stated"]),
    description: z.string().nullable().default(null),
    evidence: evidenceList,
  }),
  relocations: z
    .object({
      count: z.number().int().nonnegative().nullable(),
      note: z.string().nullable().default(null),
      evidence: evidenceList,
    })
    .default({ count: null, note: null, evidence: [] }),
  flightClass: z.object({ value: transportClass, evidence: evidenceList }),
  trainClass: z.object({ value: transportClass, evidence: evidenceList }),
  meals: z.object({ description: z.string().nullable(), evidence: evidenceList }),
  availability: z.object({
    status: availability,
    note: z.string().nullable().default(null),
  }),
  unresolvedConflicts: z.array(z.string()).default([]),
  /** "archived" = ditarik daripada cadangan oleh pentadbir (kekal dalam sejarah). */
  publishedStatus: z.enum(["published", "archived"]).default("published"),
  stays: z.array(staySchema),
  inclusions: z
    .array(
      z.object({
        text: z.string().min(1),
        condition: z.string().nullable().default(null),
        evidence: evidenceList,
      }),
    )
    .default([]),
  exclusions: z.array(z.object({ text: z.string().min(1), evidence: evidenceList })).default([]),
  variants: z.array(variantSchema).min(1),
});

export const upgradeSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  packageIds: z.array(z.string()).min(1),
  /** Kod varian yang layak; [] = semua varian dalam packageIds. */
  applicableVariantCodes: z.array(z.string()).default([]),
  includedInVariantCodes: z.array(z.string()).default([]),
  kind: z.enum(["aziziyah_room", "meal", "other"]),
  description: z.string().min(1),
  priceSen: sen.nullable(),
  basis,
  nightCount: z.number().int().positive().nullable().default(null),
  resultingOccupancy: occupancy.nullable().default(null),
  availability: availability.default("inquiry_required"),
  condition: z.string().nullable().default(null),
  evidence: z.array(evidenceSchema).min(1),
});

export const chargeSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  packageIds: z.array(z.string()).min(1),
  description: z.string().min(1),
  priceSen: sen.nullable(),
  basis,
  nightCount: z.number().int().positive().nullable().default(null),
  included: z.boolean(),
  kind: z.enum(["mandatory", "conditional"]),
  evidence: z.array(evidenceSchema).min(1),
});

export const approvalSchema = z
  .object({
    status: z.enum(["unverified", "verified_approved", "not_approved"]),
    /** Nama dokumen rasmi, cth. "Senarai PJH diluluskan Musim Haji 1448H (Tabung Haji)". */
    officialSource: z.string().trim().min(1).nullable().default(null),
    /** URL atau nombor rujukan dokumen rasmi. */
    officialReference: z.string().trim().min(1).nullable().default(null),
    verifiedAt: z.string().nullable().default(null),
    verifiedBy: z.string().nullable().default(null),
  })
  .refine(
    (a) => a.status === "unverified" || (!!a.officialSource && !!a.verifiedAt && !!a.verifiedBy),
    { message: "Status kelulusan yang disahkan mesti ada sumber rasmi, tarikh dan penyemak" },
  );

/** Semakan pentadbir (manusia) ke atas fail ini sebelum diterbitkan. */
export const reviewSchema = z.object({
  status: z.enum(["unreviewed", "approved"]),
  approvedBy: z.string().nullable().default(null),
  approvedAt: z.string().nullable().default(null),
  notes: z.string().nullable().default(null),
});

export const pjhCatalogFileSchema = z.object({
  schemaVersion: z.literal(1),
  seasonId: z.string(),
  pjh: z.object({
    id: z.string().regex(/^[a-z0-9-]+$/),
    label: z.string(),
    name: z.string(),
    legalName: z.string().nullable().default(null),
    website: z.string().nullable().default(null),
    publicContact: z.string().nullable().default(null),
    licenceNumberAsPublished: z.string().nullable().default(null),
    licenceEvidence: evidenceList,
    terms: z.array(z.object({ text: z.string(), evidence: evidenceList })).default([]),
    /**
     * Status kelulusan PJH bagi musim fail ini. Hanya pentadbir boleh menukarnya, dan hanya
     * berdasarkan sumber rasmi (cth. senarai PJH diluluskan TH). Brosur bukan bukti kelulusan.
     */
    approval: approvalSchema.default({
      status: "unverified",
      officialSource: null,
      officialReference: null,
      verifiedAt: null,
      verifiedBy: null,
    }),
  }),
  source: z.object({
    sourceId: z.string().default(DEFAULT_SOURCE_ID),
    pageRange: z.tuple([z.number().int(), z.number().int()]),
    pagesReviewed: z.array(z.number().int()),
    /** Ringkasan kandungan setiap halaman yang disemak. */
    pageNotes: z.array(z.object({ pdfPage: z.number().int(), content: z.string() })),
  }),
  packages: z.array(packageSchema),
  upgrades: z.array(upgradeSchema).default([]),
  charges: z.array(chargeSchema).default([]),
  /** Item dikenal pasti tetapi tidak diimport sebagai varian (cth. pakej umrah, harga promosi berulang). */
  excludedItems: z
    .array(
      z.object({
        description: z.string(),
        reason: z.string(),
        countsAsVariant: z.boolean(),
        evidence: evidenceList,
      }),
    )
    .default([]),
  /** Medan kabur, konflik atau maklumat yang perlu disahkan. */
  gaps: z
    .array(
      z.object({
        severity: z.enum(["blocking", "non_blocking"]),
        packageId: z.string().nullable().default(null),
        field: z.string(),
        note: z.string(),
        pages: z.array(z.number().int()).default([]),
      }),
    )
    .default([]),
  review: reviewSchema.default({
    status: "unreviewed",
    approvedBy: null,
    approvedAt: null,
    notes: null,
  }),
  transcription: z.object({
    reviewer: z.string(),
    reviewedAt: z.string(),
    method: z.string(),
    independentCheck: z
      .object({ reviewer: z.string(), checkedAt: z.string(), notes: z.string() })
      .nullable()
      .default(null),
  }),
});

export type PjhCatalogFile = z.infer<typeof pjhCatalogFileSchema>;
export type PjhCatalogFileInput = z.input<typeof pjhCatalogFileSchema>;
