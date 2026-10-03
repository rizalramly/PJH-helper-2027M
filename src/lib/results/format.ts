// Format paparan bagi DTO calon (BM). Fungsi tulen; selari dengan buildComparison dalam engine.
import {
  AVAILABILITY_LABEL,
  AZIZIYAH_LABEL,
  CLASS_LABEL,
  REF_LABEL,
  TARWIYAH_LABEL,
} from "../engine/compare";
import type { Dimension, RecommendationLabel } from "../engine/types";
import type { CandidateDTO } from "./types";

type Pkg = CandidateDTO["package"];
type StayDTO = Pkg["stays"][number];

export const REC_LABEL: Record<RecommendationLabel, string> = {
  CADANGAN_UTAMA: "Cadangan utama",
  ALTERNATIF_JIMAT: "Alternatif lebih jimat",
  ALTERNATIF_KESELESAAN: "Alternatif keselesaan",
  CALON_BERSYARAT: "Calon bersyarat",
};

export const DIMENSION_LABEL: Record<Dimension, string> = {
  savings: "Penjimatan dalam bajet",
  comfort: "Keselesaan bilik/hotel (berbukti)",
  masyair: "Keselesaan masyair/PMN",
  proximity: "Kedekatan hotel",
  duration: "Tempoh berbanding sasaran",
  relocations: "Sedikit perpindahan hotel",
  tarwiyah: "Tarwiyah",
  aziziyah: "Aziziyah",
};

const SOURCE_LABEL: Record<string, string> = {
  "compilation-34pjh-1448h": "Kompilasi Pakej Haji 2027 (34 PJH)",
};

export const sourceLabel = (id: string) => SOURCE_LABEL[id] ?? id;

export function pageText(e: { pdfPage: number; brochurePage?: number }) {
  return `hlm. PDF ${e.pdfPage}${e.brochurePage !== undefined ? ` (brosur hlm. ${e.brochurePage})` : ""}`;
}

/** Tarikh ISO (YYYY-MM-DD atau penuh) → "3 Oktober 2026". */
export function dateText(iso: string | null | undefined, withTime = false): string {
  if (!iso) return "tidak direkodkan";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("ms-MY", {
    day: "numeric",
    month: "long",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(d);
}

export function staysAt(pkg: Pkg, location: StayDTO["location"]) {
  return pkg.stays.filter((s) => s.location === location);
}

export function hotelText(s: StayDTO): string {
  const name = `${s.hotelNameAsPublished}${s.orEquivalent && !/setaraf/i.test(s.hotelNameAsPublished) ? " (atau setaraf)" : ""}`;
  const nights = s.nightCount !== null ? `, ${s.nightCount} malam` : "";
  const dates = s.dateLabel ? `, ${s.dateLabel}` : "";
  if (s.distanceM === null) return `${name}${nights}${dates}`;
  const ref =
    s.distanceReference === "other"
      ? (s.distanceReferenceAsPublished ?? "")
      : REF_LABEL[s.distanceReference];
  return `${name}${nights}${dates}; ${s.distanceIsApproximate ? "±" : ""}${s.distanceM} m ${ref}`.trim();
}

export function hotelsText(pkg: Pkg, location: StayDTO["location"]): string {
  const list = staysAt(pkg, location);
  return list.length ? list.map(hotelText).join(" → ") : "Tidak dinyatakan";
}

export function durationText(pkg: Pkg): string {
  const d = pkg.duration;
  if (d.min !== null && d.max !== null) return `${d.min}–${d.max} hari`;
  if (d.value === null) return "Tidak dinyatakan";
  return d.approximate ? `±${d.value} hari (anggaran)` : `${d.value} hari`;
}

export function aziziyahText(pkg: Pkg): string {
  const a = pkg.aziziyah;
  const nights = staysAt(pkg, "aziziyah")
    .map((s) => s.nightCount)
    .filter((n): n is number => n !== null);
  const label = a.labelAsPublished ? ` (dicetak: "${a.labelAsPublished}")` : "";
  return [
    `${AZIZIYAH_LABEL[a.status as keyof typeof AZIZIYAH_LABEL]}${label}`,
    a.dateLabel ? `tarikh ${a.dateLabel}` : null,
    nights.length ? `${nights.reduce((x, y) => x + y, 0)} malam` : null,
    a.condition ? `tertakluk: ${a.condition}` : null,
  ]
    .filter(Boolean)
    .join("; ");
}

export function tarwiyahText(pkg: Pkg): string {
  const t = pkg.tarwiyah;
  return `${TARWIYAH_LABEL[t.status as keyof typeof TARWIYAH_LABEL]}${t.condition ? `: ${t.condition}` : ""}`;
}

export function pmnText(c: CandidateDTO): string {
  const s = c.assignments.map((a) => a.variant.pmnStatus);
  const pmn = s.every((x) => x === "included")
    ? "PMN termasuk"
    : s.some((x) => x === "not_included")
      ? "Tanpa PMN"
      : "PMN tidak dinyatakan";
  return c.package.masyair.description ? `${pmn}; ${c.package.masyair.description}` : pmn;
}

export function roomText(a: CandidateDTO["assignments"][number]): string {
  const v = a.variant;
  const az = a.room.aziziyah ?? v.aziziyahOccupancy;
  const up = a.aziziyahUpgrade
    ? `; naik taraf Aziziyah: ${a.aziziyahUpgrade.description} (${a.aziziyahUpgrade.price?.text ?? "harga perlu pengesahan"})`
    : "";
  return `${a.room.pilgrims} jemaah: kod ${v.code}${v.codeIsInternal ? " (ID dalaman)" : ""}, Makkah ber-${v.makkahOccupancy}, Madinah ber-${v.madinahOccupancy}${az ? `, Aziziyah ber-${az}` : ", Aziziyah ikut susunan asal"}${up}`;
}

export const availabilityText = (c: CandidateDTO) =>
  AVAILABILITY_LABEL[c.package.availability.status as keyof typeof AVAILABILITY_LABEL];

export const classText = (v: string) => CLASS_LABEL[v as keyof typeof CLASS_LABEL] ?? v;

export function approvalText(status: string): string {
  return status === "verified_approved"
    ? "Kelulusan musim ini disahkan"
    : status === "not_approved"
      ? "Tidak diluluskan bagi musim ini"
      : "Kelulusan PJH musim ini belum disahkan";
}

/** Pemberat dinormalkan (peratus) bagi dimensi aktif. */
export function normalizedWeights(dims: CandidateDTO["dimensions"]) {
  const total = dims.reduce((s, d) => s + d.weight, 0);
  return dims.map((d) => ({ ...d, share: total > 0 ? d.weight / total : 0 }));
}
