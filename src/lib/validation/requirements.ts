// Skema permintaan API → Requirements engine. Wang diterima sebagai RM (teks atau nombor).
import { z } from "zod";

import { parseRMToSen } from "../engine/money";
import type { Requirements } from "../engine/types";

/** Had atas bajet seorang: RM10 juta (melindungi daripada nilai sangat besar / DoS). */
export const MAX_RM_SEN = 1_000_000_000n;

const rm = z.union([z.string().max(32), z.number().finite()]).transform((v, ctx) => {
  const sen = parseRMToSen(String(v));
  if (sen !== null && sen > MAX_RM_SEN) {
    ctx.addIssue({ code: "custom", message: "Nilai RM melebihi had RM10,000,000." });
    return z.NEVER;
  }
  if (sen === null) {
    ctx.addIssue({
      code: "custom",
      message: "Nilai RM tidak sah (contoh: 100000 atau RM100,000.00)",
    });
    return z.NEVER;
  }
  return sen;
});

const occupancy = z.number().int().min(1).max(12);
const importance = z.enum(["important", "normal", "dont_care"]);

export const requirementsSchema = z
  .object({
    seasonId: z.string().min(1),
    rooms: z
      .array(
        z.object({
          pilgrims: z.number().int().min(1).max(12),
          makkah: occupancy,
          madinah: occupancy,
          aziziyah: occupancy.nullable().default(null),
        }),
      )
      .min(1, "Sekurang-kurangnya satu bilik diperlukan")
      .max(10),
    budget: z.object({
      perPersonRM: rm,
      scope: z.enum(["package_only", "all_in"]).default("package_only"),
      extrasPerPersonRM: rm.optional(),
      hard: z.boolean().default(true),
    }),
    aziziyah: z
      .object({
        mode: z.enum(["required", "preferred", "not_wanted", "any"]).default("any"),
        acceptConditional: z.boolean().default(true),
      })
      .default({ mode: "any", acceptConditional: true }),
    duration: z
      .object({
        min: z.number().int().positive().nullable().default(null),
        max: z.number().int().positive().nullable().default(null),
        target: z.number().int().positive().nullable().default(null),
        tolerance: z.number().int().nonnegative().nullable().default(null),
        acceptApproximate: z.boolean().default(true),
        hard: z.boolean().default(true),
      })
      .default({
        min: null,
        max: null,
        target: null,
        tolerance: null,
        acceptApproximate: true,
        hard: true,
      }),
    tarwiyah: z
      .object({
        mode: z.enum(["required", "preferred", "any", "want_not_offered"]).default("any"),
        acceptConditional: z.boolean().default(false),
      })
      .default({ mode: "any", acceptConditional: false }),
    pmn: z.enum(["required", "preferred", "any"]).default("any"),
    privateRoom: z.enum(["required", "preferred", "any"]).default("any"),
    proximity: z
      .object({
        maxMakkahM: z.number().positive().nullable().default(null),
        maxMadinahM: z.number().positive().nullable().default(null),
      })
      .default({ maxMakkahM: null, maxMadinahM: null }),
    comfortFeatures: z
      .array(z.enum(["private_bathroom", "min_room_size", "fullboard"]))
      .default([]),
    minRoomSizeSqm: z.number().positive().nullable().default(null),
    importance: z
      .object({
        savings: importance,
        comfort: importance,
        masyair: importance,
        proximity: importance,
        duration: importance,
        relocations: importance,
        tarwiyah: importance,
        aziziyah: importance,
      })
      .partial()
      .default({}),
  })
  .superRefine((r, ctx) => {
    const d = r.duration;
    if (d.min !== null && d.max !== null && d.min > d.max) {
      ctx.addIssue({
        code: "custom",
        path: ["duration"],
        message: "Tempoh minimum melebihi maksimum",
      });
    }
    if (r.budget.scope === "all_in" && r.budget.extrasPerPersonRM === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["budget", "extrasPerPersonRM"],
        message: "Masukkan peruntukan tambahan untuk bajet menyeluruh",
      });
    }
    if (r.comfortFeatures.includes("min_room_size") && r.minRoomSizeSqm === null) {
      ctx.addIssue({
        code: "custom",
        path: ["minRoomSizeSqm"],
        message: "Masukkan saiz bilik minimum",
      });
    }
  });

export type RequirementsInput = z.input<typeof requirementsSchema>;

export function toRequirements(parsed: z.output<typeof requirementsSchema>): Requirements {
  return {
    seasonId: parsed.seasonId,
    rooms: parsed.rooms,
    budget: {
      perPersonSen: parsed.budget.perPersonRM,
      scope: parsed.budget.scope,
      extrasPerPersonSen: parsed.budget.extrasPerPersonRM ?? 0n,
      hard: parsed.budget.hard,
    },
    aziziyah: parsed.aziziyah,
    duration: parsed.duration,
    tarwiyah: parsed.tarwiyah,
    pmn: parsed.pmn,
    privateRoom: parsed.privateRoom,
    proximity: parsed.proximity,
    comfortFeatures: parsed.comfortFeatures,
    minRoomSizeSqm: parsed.minRoomSizeSqm,
    importance: parsed.importance,
  };
}

/** Ralat Zod → senarai { medan, mesej } untuk paparan BM. */
export function formatIssues(error: z.ZodError) {
  return error.issues.map((i) => ({ field: i.path.join("."), message: i.message }));
}
