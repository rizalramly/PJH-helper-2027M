// Skor kesesuaian yang telus (spesifikasi §9). Skor = padanan kepada keperluan pengguna,
// bukan penarafan mutu PJH. Nilai tidak diketahui menyumbang 0 dan mengurangkan liputan bukti.
import { ratio } from "./money";
import type {
  CostBreakdown,
  Dimension,
  DimensionScore,
  Package,
  Requirements,
  RoomAssignment,
  ScoringRules,
  Stay,
} from "./types";

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const round2 = (x: number) => Math.round(x * 100) / 100;

interface Measure {
  utility: number;
  knownFraction: number;
  note: string;
}

const firstStay = (pkg: Package, location: Stay["location"]) =>
  [...pkg.stays].filter((s) => s.location === location).sort((a, b) => a.sequence - b.sequence)[0];

/** Purata sub-ukuran; sub-ukuran tidak diketahui = 0 dan tidak dikira dalam liputan. */
function combine(parts: { utility: number | null; note: string }[]): Measure {
  if (parts.length === 0) return { utility: 0, knownFraction: 0, note: "Tiada data." };
  const known = parts.filter((p) => p.utility !== null);
  return {
    utility: known.reduce((s, p) => s + (p.utility as number), 0) / parts.length,
    knownFraction: known.length / parts.length,
    note: parts.map((p) => p.note).join(" "),
  };
}

function isActive(dim: Dimension, req: Requirements): boolean {
  if (req.importance[dim] === "dont_care") return false;
  switch (dim) {
    case "savings":
    case "relocations":
      return true;
    case "comfort":
      return req.comfortFeatures.length > 0;
    case "masyair":
      return req.pmn !== "any";
    case "proximity":
      return req.proximity.maxMakkahM !== null || req.proximity.maxMadinahM !== null;
    case "duration":
      return req.duration.target !== null;
    case "tarwiyah":
      return req.tarwiyah.mode === "preferred";
    case "aziziyah":
      return req.aziziyah.mode === "preferred";
  }
}

function measure(
  dim: Dimension,
  pkg: Package,
  assignments: RoomAssignment[],
  cost: CostBreakdown,
  req: Requirements,
): Measure {
  switch (dim) {
    case "savings": {
      if (!cost.complete) {
        return {
          utility: 0,
          knownFraction: 0,
          note: "Kos belum lengkap; penjimatan tidak dapat dibandingkan.",
        };
      }
      const u = clamp01(ratio(cost.remainingSen, cost.budgetGroupSen));
      return { utility: u, knownFraction: 1, note: `Baki ${Math.round(u * 100)}% daripada bajet.` };
    }
    case "comfort": {
      const hotels = (["makkah", "madinah"] as const)
        .map((l) => firstStay(pkg, l))
        .filter(Boolean) as Stay[];
      const parts = req.comfortFeatures.flatMap((f) =>
        hotels.map((s) => {
          const city = s.location === "makkah" ? "Makkah" : "Madinah";
          if (f === "private_bathroom") {
            return s.privateBathroom === null
              ? { utility: null, note: `Bilik air sendiri (${city}) tidak dinyatakan.` }
              : {
                  utility: s.privateBathroom ? 1 : 0,
                  note: `Bilik air sendiri (${city}): ${s.privateBathroom ? "ya" : "tidak"}.`,
                };
          }
          if (f === "min_room_size") {
            if (s.roomSizeSqm === null || req.minRoomSizeSqm === null) {
              return { utility: null, note: `Saiz bilik (${city}) tidak dinyatakan.` };
            }
            return {
              utility: s.roomSizeSqm >= req.minRoomSizeSqm ? 1 : 0,
              note: `Saiz bilik (${city}) ${s.roomSizeSqm} m².`,
            };
          }
          if (s.meals === null)
            return { utility: null, note: `Makanan (${city}) tidak dinyatakan.` };
          const full = /full\s*-?\s*board/i.test(s.meals);
          return { utility: full ? 1 : 0, note: `Makanan (${city}): ${s.meals}.` };
        }),
      );
      return combine(parts);
    }
    case "masyair": {
      const statuses = assignments.map((a) => a.variant.pmnStatus);
      if (statuses.some((s) => s === "not_stated")) {
        return { utility: 0, knownFraction: 0, note: "Status PMN tidak dinyatakan." };
      }
      const u = statuses.every((s) => s === "included") ? 1 : 0;
      return { utility: u, knownFraction: 1, note: u ? "PMN termasuk." : "Tanpa PMN." };
    }
    case "proximity": {
      const parts: { utility: number | null; note: string }[] = [];
      const check = (
        location: "makkah" | "madinah",
        max: number | null,
        ref: Stay["distanceReference"],
        name: string,
      ) => {
        if (max === null) return;
        const s = firstStay(pkg, location);
        if (!s || s.distanceM === null || s.distanceReference !== ref) {
          parts.push({
            utility: null,
            note: `Jarak hotel ${name} ke perkarangan tidak dinyatakan dengan titik ukuran yang sama.`,
          });
          return;
        }
        const u = clamp01(1 - s.distanceM / max);
        parts.push({
          utility: u,
          note: `Hotel ${name} ${s.distanceIsApproximate ? "±" : ""}${s.distanceM} m ke perkarangan (had anda ${max} m).`,
        });
      };
      check("makkah", req.proximity.maxMakkahM, "haram_courtyard", "Makkah");
      check("madinah", req.proximity.maxMadinahM, "nabawi_courtyard", "Madinah");
      return combine(parts);
    }
    case "duration": {
      const target = req.duration.target as number;
      const pd = pkg.duration;
      const v = pd.min !== null && pd.max !== null ? (pd.min + pd.max) / 2 : pd.value;
      if (v === null) return { utility: 0, knownFraction: 0, note: "Tempoh tidak dinyatakan." };
      const tol = req.duration.tolerance ?? 0;
      const diff = Math.abs(v - target);
      const u = tol > 0 ? clamp01(1 - diff / tol) : diff === 0 ? 1 : 0;
      return {
        utility: u,
        knownFraction: 1,
        note: `Tempoh ${pd.approximate ? "anggaran ±" : ""}${v} hari berbanding sasaran ${target}.`,
      };
    }
    case "relocations": {
      const c = pkg.relocations.count;
      if (c === null)
        return {
          utility: 0,
          knownFraction: 0,
          note: "Bilangan perpindahan hotel tidak dinyatakan.",
        };
      return {
        utility: clamp01(1 - c / 4),
        knownFraction: 1,
        note: `${c} perpindahan hotel${pkg.relocations.note ? ` (${pkg.relocations.note})` : ""}.`,
      };
    }
    case "tarwiyah": {
      const s = pkg.tarwiyah.status;
      if (s === "not_stated")
        return { utility: 0, knownFraction: 0, note: "Tarwiyah tidak dinyatakan." };
      // Tawaran bersyarat hanya bernilai jika pengguna menerima tawaran bersyarat.
      const conditional = s === "offered_subject_to_approval";
      const u =
        s === "explicitly_not_offered" || (conditional && !req.tarwiyah.acceptConditional) ? 0 : 1;
      return {
        utility: u,
        knownFraction: 1,
        note: conditional
          ? `Tarwiyah ditawarkan tertakluk kelulusan${u ? "" : "; anda tidak menerima tawaran bersyarat"}.`
          : u
            ? "Tarwiyah ditawarkan."
            : "Tarwiyah tidak dilaksanakan.",
      };
    }
    case "aziziyah": {
      const s = pkg.aziziyah.status;
      if (s === "not_stated")
        return { utility: 0, knownFraction: 0, note: "Aziziyah tidak dinyatakan." };
      const conditional = !!pkg.aziziyah.condition && s !== "explicitly_not_included";
      const u =
        s === "explicitly_not_included" || (conditional && !req.aziziyah.acceptConditional) ? 0 : 1;
      return {
        utility: u,
        knownFraction: 1,
        note: !u
          ? conditional
            ? "Aziziyah tertakluk syarat; anda tidak menerima tawaran bersyarat."
            : "Tiada Aziziyah."
          : conditional
            ? "Aziziyah tersedia tertakluk syarat."
            : "Aziziyah tersedia.",
      };
    }
  }
}

const DIMENSIONS: Dimension[] = [
  "savings",
  "comfort",
  "masyair",
  "proximity",
  "duration",
  "relocations",
  "tarwiyah",
  "aziziyah",
];

export function scoreCandidate(
  pkg: Package,
  assignments: RoomAssignment[],
  cost: CostBreakdown,
  req: Requirements,
  rules: ScoringRules,
): { score: number; coverage: number; dimensions: DimensionScore[] } {
  const dimensions: DimensionScore[] = [];
  for (const dim of DIMENSIONS) {
    if (!isActive(dim, req)) continue;
    const importance = req.importance[dim] ?? "normal";
    const weight =
      rules.weights[dim] *
      rules.importanceMultiplier[importance === "important" ? "important" : "normal"];
    if (weight <= 0) continue;
    const m = measure(dim, pkg, assignments, cost, req);
    dimensions.push({
      dimension: dim,
      weight,
      utility: round2(m.utility),
      known: m.knownFraction === 1,
      knownFraction: round2(m.knownFraction),
      note: m.note,
    });
  }
  const total = dimensions.reduce((s, d) => s + d.weight, 0);
  if (total === 0) return { score: 0, coverage: 0, dimensions };
  const score = (100 * dimensions.reduce((s, d) => s + d.weight * d.utility, 0)) / total;
  const coverage = dimensions.reduce((s, d) => s + d.weight * d.knownFraction, 0) / total;
  return { score: round2(score), coverage: round2(coverage), dimensions };
}
