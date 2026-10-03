// Penjelasan dalam Bahasa Melayu daripada data berstruktur (tanpa LLM).
// Jangan guna "terjamin"/"dijamin" untuk perkara bersyarat (spesifikasi §6).
import { formatRM } from "./money";
import type {
  ApprovalStatus,
  CostBreakdown,
  DimensionScore,
  Package,
  RecommendationLabel,
  RequirementResult,
  Requirements,
  RoomAssignment,
} from "./types";

export const FORBIDDEN_WORDS = /\b(terjamin|dijamin|jaminan)\b/i;

const ORDER: RequirementResult["key"][] = [
  "budget",
  "pmn",
  "aziziyah",
  "aziziyah_room",
  "tarwiyah",
  "duration",
  "rooms",
  "private_room",
];
const byOrder = (a: RequirementResult, b: RequirementResult) =>
  ORDER.indexOf(a.key) - ORDER.indexOf(b.key);

export interface Explanation {
  reasons: string[];
  compromises: string[];
  uncertainties: string[];
  questionsForPjh: string[];
}

export function explainCandidate(
  pkg: Package,
  assignments: RoomAssignment[],
  cost: CostBreakdown,
  requirements: RequirementResult[],
  dimensions: DimensionScore[],
  approval: ApprovalStatus,
  req: Requirements,
): Explanation {
  const reasons: string[] = [];
  const compromises: string[] = [];
  const uncertainties: string[] = [];
  const questions: string[] = [];

  const sorted = [...requirements].sort(byOrder);
  for (const r of sorted.filter((r) => r.hard && r.status === "MEMENUHI" && r.key !== "rooms"))
    reasons.push(`${r.label}: ${r.detail}`);
  for (const r of sorted.filter((r) => r.hard && r.status === "BERSYARAT"))
    reasons.push(`${r.label} (bersyarat): ${r.detail}`);
  const strong = [...dimensions]
    .filter((d) => d.known && d.utility >= 0.75)
    .sort((a, b) => b.weight * b.utility - a.weight * a.utility);
  for (const d of strong) reasons.push(d.note);

  for (const r of sorted.filter((r) => !r.hard && r.status !== "MEMENUHI"))
    compromises.push(`${r.label}: ${r.detail}`);
  for (const r of sorted.filter((r) => r.status === "BERSYARAT"))
    compromises.push(`${r.label} tertakluk syarat yang anda terima.`);
  for (const d of dimensions.filter((d) => d.known && d.utility < 0.5)) compromises.push(d.note);

  for (const r of sorted.filter((r) => r.status === "PERLU_PENGESAHAN"))
    uncertainties.push(`${r.label}: ${r.detail}`);
  for (const d of dimensions.filter((d) => d.knownFraction < 1)) {
    uncertainties.push(`${d.note} Ini bukan penilaian negatif terhadap mutu hotel atau PJH.`);
  }
  if (!cost.complete)
    uncertainties.push(`Kos diketahui; caj tambahan belum lengkap: ${cost.unpriced.join("; ")}.`);
  for (const c of cost.conditionalCharges)
    uncertainties.push(`Caj bersyarat mungkin dikenakan: ${c}.`);
  for (const a of assignments) {
    if (a.variant.roomLabelAsPublished && /\d\s*[/-]\s*\d/.test(a.variant.roomLabelAsPublished)) {
      uncertainties.push(
        `Susunan bilik varian ${a.variant.code} dicetak "${a.variant.roomLabelAsPublished}"; bilangan sebenar sebilik perlu disahkan.`,
      );
    }
  }
  if (pkg.aziziyah.labelAsPublished) {
    uncertainties.push(
      `Penginapan yang direkod sebagai Aziziyah dicetak sebagai "${pkg.aziziyah.labelAsPublished}".`,
    );
  }
  if (pkg.duration.approximate && pkg.duration.value !== null) {
    uncertainties.push(
      `Tempoh ialah anggaran ±${pkg.duration.value} hari; tarikh sebenar belum diterbitkan.`,
    );
  }
  for (const s of pkg.stays.filter((s) => s.orEquivalent)) {
    uncertainties.push(
      `Hotel ${s.location} "${s.hotelNameAsPublished}" boleh diganti dengan hotel setaraf; hotel sebenar perlu disahkan.`,
    );
  }
  if (pkg.availability.status === "inquiry_required" || pkg.availability.status === "published") {
    uncertainties.push(
      "Kekosongan belum disahkan; semakan brosur tidak membuktikan bilik masih tersedia.",
    );
  }
  if (approval !== "verified_approved") {
    uncertainties.push("Status kelulusan PJH bagi musim ini belum disahkan daripada sumber rasmi.");
  }

  questions.push(
    `Adakah varian ${assignments.map((a) => a.variant.code).join(", ")} masih ada kekosongan untuk ${cost.pilgrims} jemaah?`,
  );
  if (requirements.some((r) => r.key === "private_room" && r.status === "PERLU_PENGESAHAN")) {
    questions.push(
      "Adakah bilik hotel dikhususkan untuk pasangan/rombongan kami tanpa jemaah lain?",
    );
  }
  if (requirements.some((r) => r.key === "aziziyah_room" && r.status !== "MEMENUHI")) {
    questions.push(
      "Bagaimanakah susunan bilik Aziziyah ditetapkan, dan bolehkah susunan pilihan kami disahkan secara bertulis?",
    );
  }
  for (const u of cost.unpriced) questions.push(`Berapakah harga: ${u}?`);
  if (pkg.stays.some((s) => s.orEquivalent))
    questions.push(
      "Apakah nama hotel sebenar yang akan digunakan di Makkah, Madinah dan Aziziyah?",
    );
  if (pkg.tarwiyah.status === "offered_subject_to_approval")
    questions.push("Apakah syarat kelulusan Tarwiyah dan bila ia akan disahkan?");
  if (pkg.aziziyah.condition)
    questions.push(
      `Apakah yang berlaku jika Aziziyah tidak diluluskan (${pkg.aziziyah.condition})?`,
    );
  if (pkg.duration.approximate)
    questions.push(
      "Apakah tarikh berlepas dan pulang yang dijangka, dan adakah caj hari tambahan?",
    );
  if (approval !== "verified_approved")
    questions.push("Bolehkah anda kongsikan bukti kelulusan PJH bagi musim 1448H/2027M?");
  if (req.budget.scope === "all_in")
    questions.push("Adakah terdapat caj lain yang tidak termasuk dalam harga pakej?");

  const unique = (xs: string[]) => [...new Set(xs)];
  return {
    reasons: unique(reasons).slice(0, 3),
    compromises: unique(compromises),
    uncertainties: unique(uncertainties),
    questionsForPjh: unique(questions),
  };
}

const OPENERS: Record<RecommendationLabel, string> = {
  CADANGAN_UTAMA: "Pakej ini paling sesuai berdasarkan keutamaan yang anda masukkan",
  ALTERNATIF_JIMAT: "Alternatif lebih jimat yang memenuhi syarat wajib anda",
  ALTERNATIF_KESELESAAN: "Alternatif dengan kelebihan keselesaan yang mempunyai bukti",
  CALON_BERSYARAT:
    "Calon bersyarat: maklumat kritikal belum disahkan atau masih ada syarat terbuka",
};

export function narrative(
  label: RecommendationLabel,
  pkgName: string,
  cost: CostBreakdown,
  reasons: string[],
  uncertainties: string[],
): string {
  const costText = cost.complete
    ? `kos ${formatRM(cost.knownGroupSen)} untuk ${cost.pilgrims} jemaah`
    : `kos diketahui ${formatRM(cost.knownGroupSen)} untuk ${cost.pilgrims} jemaah (caj tambahan belum lengkap)`;
  const why = reasons.length ? ` ${reasons.join(" ")}` : "";
  const open = uncertainties.length
    ? ` Masih perlu disahkan: ${uncertainties.length} perkara, termasuk kekosongan.`
    : "";
  return `${OPENERS[label]} (${pkgName}, ${costText}).${why}${open}`;
}
