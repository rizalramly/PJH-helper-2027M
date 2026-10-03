// Perbandingan sebelah-menyebelah (maksimum 3 calon) dan sebab beza harga. Fungsi tulen.
import { formatRM, sumSen } from "./money";
import type { Candidate, CostLine, ReqStatus, Stay } from "./types";

export const STATUS_LABEL: Record<ReqStatus, string> = {
  MEMENUHI: "Memenuhi",
  BERSYARAT: "Bersyarat",
  PERLU_PENGESAHAN: "Perlu pengesahan",
  TIDAK_MEMENUHI: "Tidak memenuhi",
};

export const GROUP_LABEL = {
  full_match: "Memenuhi syarat wajib",
  needs_verification: "Perlu pengesahan",
  not_matching: "Tidak memenuhi",
} as const;

export const TARWIYAH_LABEL = {
  offered: "Ditawarkan",
  offered_subject_to_approval: "Ditawarkan tertakluk kelulusan",
  explicitly_not_offered: "Tidak dilaksanakan",
  not_stated: "Tidak dinyatakan",
} as const;

export const AZIZIYAH_LABEL = {
  included: "Termasuk",
  optional: "Pilihan",
  explicitly_not_included: "Tidak termasuk",
  not_stated: "Tidak dinyatakan",
} as const;

export const CLASS_LABEL = {
  business: "Kelas perniagaan",
  economy: "Kelas ekonomi",
  not_stated: "Tidak dinyatakan",
} as const;
export const AVAILABILITY_LABEL = {
  published: "Diterbitkan (kekosongan belum disahkan)",
  inquiry_required: "Perlu pertanyaan",
  sold_out: "Habis",
  withdrawn: "Ditarik balik",
} as const;

export const REF_LABEL: Record<Stay["distanceReference"], string> = {
  haram_courtyard: "ke perkarangan Masjidil Haram",
  nabawi_courtyard: "ke perkarangan Masjid Nabawi",
  jamarat: "ke Kompleks Jamarat",
  other: "",
  not_stated: "(titik ukuran tidak dinyatakan)",
};

function hotel(c: Candidate, location: Stay["location"]): string {
  const s = [...c.package.stays]
    .filter((x) => x.location === location)
    .sort((a, b) => a.sequence - b.sequence)[0];
  if (!s) return "Tidak dinyatakan";
  const name = `${s.hotelNameAsPublished}${s.orEquivalent && !/setaraf/i.test(s.hotelNameAsPublished) ? " (atau setaraf)" : ""}`;
  if (s.distanceM === null) return name;
  const ref =
    s.distanceReference === "other"
      ? (s.distanceReferenceAsPublished ?? "")
      : REF_LABEL[s.distanceReference];
  return `${name}, ${s.distanceIsApproximate ? "±" : ""}${s.distanceM} m ${ref}`.trim();
}

function duration(c: Candidate): string {
  const d = c.package.duration;
  if (d.min !== null && d.max !== null) return `${d.min}–${d.max} hari`;
  if (d.value === null) return "Tidak dinyatakan";
  return `${d.approximate ? "±" : ""}${d.value} hari${d.approximate ? " (anggaran)" : ""}`;
}

function rooms(c: Candidate): string {
  return c.assignments
    .map((a) => {
      const az = a.room.aziziyah ?? a.variant.aziziyahOccupancy;
      return `${a.room.pilgrims} jemaah: Makkah ber-${a.variant.makkahOccupancy}, Madinah ber-${a.variant.madinahOccupancy}${az ? `, Aziziyah ber-${az}` : ""}`;
    })
    .join("; ");
}

export interface ComparisonRow {
  key: string;
  label: string;
  values: string[];
  differs: boolean;
}

const sumKind = (lines: CostLine[], kinds: CostLine["kind"][]) =>
  sumSen(
    lines
      .filter((l) => kinds.includes(l.kind) && l.amountSen !== null)
      .map((l) => l.amountSen as bigint),
  );

/** Terangkan beza kos setiap calon berbanding calon termurah, ikut komponen. */
export function priceDifferences(candidates: Candidate[]): string[] {
  if (candidates.length < 2) return [];
  const cheapest = [...candidates].sort((a, b) =>
    a.cost.knownGroupSen < b.cost.knownGroupSen
      ? -1
      : a.cost.knownGroupSen > b.cost.knownGroupSen
        ? 1
        : a.id.localeCompare(b.id),
  )[0];
  const name = (c: Candidate) =>
    `${c.pjh.name}: ${c.package.name} (${c.assignments.map((a) => a.variant.code).join("+")})`;
  const out: string[] = [];
  for (const c of candidates) {
    if (c === cheapest) continue;
    const diff = c.cost.knownGroupSen - cheapest.cost.knownGroupSen;
    const parts: string[] = [];
    for (const [label, kinds] of [
      ["harga varian", ["variant"]],
      ["naik taraf", ["upgrade"]],
      ["caj tambahan", ["charge"]],
    ] as const) {
      const d = sumKind(c.cost.lines, [...kinds]) - sumKind(cheapest.cost.lines, [...kinds]);
      if (d !== 0n) parts.push(`${label} ${d > 0n ? "+" : "-"}${formatRM(d > 0n ? d : -d)}`);
    }
    const incomplete =
      !c.cost.complete || !cheapest.cost.complete
        ? " Kos belum lengkap bagi sekurang-kurangnya satu calon; beza sebenar mungkin berubah."
        : "";
    out.push(
      `${name(c)} ${diff === 0n ? "sama harga dengan" : `lebih mahal ${formatRM(diff)} berbanding`} ${name(cheapest)}${parts.length ? `: ${parts.join(", ")}` : ""}.${incomplete}`,
    );
  }
  return out;
}

export function buildComparison(candidates: Candidate[]) {
  const row = (key: string, label: string, f: (c: Candidate) => string): ComparisonRow => {
    const values = candidates.map(f);
    return { key, label, values, differs: new Set(values).size > 1 };
  };
  const reqKeys = [...new Set(candidates.flatMap((c) => c.requirements.map((r) => r.key)))];
  const rows: ComparisonRow[] = [
    row("pjh", "PJH", (c) => c.pjh.name),
    row("package", "Pakej", (c) => c.package.name),
    row("codes", "Kod varian", (c) => c.assignments.map((a) => a.variant.code).join(" + ")),
    row("rooms", "Susunan bilik", rooms),
    row(
      "groupCost",
      "Kos kumpulan",
      (c) =>
        `${formatRM(c.cost.knownGroupSen)}${c.cost.complete ? "" : " (kos diketahui; caj tambahan belum lengkap)"}`,
    ),
    row("perPerson", "Kos seorang", (c) =>
      c.assignments
        .map((a) => (a.perPersonSen === null ? "Perlu pengesahan" : formatRM(a.perPersonSen)))
        .join(" / "),
    ),
    row("remaining", "Baki bajet", (c) => formatRM(c.cost.remainingSen)),
    row("group", "Kumpulan", (c) => GROUP_LABEL[c.group]),
    row("score", "Skor kesesuaian", (c) => `${c.score.toFixed(1)} / 100`),
    row("coverage", "Liputan bukti", (c) => `${Math.round(c.coverage * 100)}%`),
    ...reqKeys.map((key) =>
      row(
        `req:${key}`,
        candidates.flatMap((c) => c.requirements).find((r) => r.key === key)!.label,
        (c) => {
          const r = c.requirements.find((x) => x.key === key);
          return r ? STATUS_LABEL[r.status] : "Tidak dinilai";
        },
      ),
    ),
    row("duration", "Tempoh", duration),
    row("aziziyah", "Aziziyah", (c) => {
      const a = c.package.aziziyah;
      return `${AZIZIYAH_LABEL[a.status]}${a.dateLabel ? ` (${a.dateLabel})` : ""}${a.condition ? `; tertakluk: ${a.condition}` : ""}`;
    }),
    row(
      "tarwiyah",
      "Tarwiyah",
      (c) =>
        `${TARWIYAH_LABEL[c.package.tarwiyah.status]}${c.package.tarwiyah.condition ? `: ${c.package.tarwiyah.condition}` : ""}`,
    ),
    row("pmn", "PMN / masyair", (c) => {
      const s = c.assignments.map((a) => a.variant.pmnStatus);
      const pmn = s.every((x) => x === "included")
        ? "PMN termasuk"
        : s.some((x) => x === "not_included")
          ? "Tanpa PMN"
          : "PMN tidak dinyatakan";
      return c.package.masyair.description ? `${pmn}; ${c.package.masyair.description}` : pmn;
    }),
    row("hotelMakkah", "Hotel Makkah", (c) => hotel(c, "makkah")),
    row("hotelMadinah", "Hotel Madinah", (c) => hotel(c, "madinah")),
    row("hotelAziziyah", "Penginapan Aziziyah", (c) => hotel(c, "aziziyah")),
    row("flight", "Penerbangan", (c) => CLASS_LABEL[c.package.flightClass.value]),
    row("train", "Kereta api Haramain", (c) => CLASS_LABEL[c.package.trainClass.value]),
    row("meals", "Makanan", (c) => c.package.meals.description ?? "Tidak dinyatakan"),
    row("availability", "Kekosongan", (c) => AVAILABILITY_LABEL[c.package.availability.status]),
    row("approval", "Kelulusan PJH musim ini", (c) =>
      c.approvalStatus === "verified_approved"
        ? "Disahkan"
        : c.approvalStatus === "not_approved"
          ? "Tidak diluluskan"
          : "Belum disahkan",
    ),
  ];
  return {
    candidateIds: candidates.map((c) => c.id),
    rows,
    priceDifferences: priceDifferences(candidates),
  };
}
