// Import varian daripada CSV (satu baris = satu varian). Fungsi tulen.
// Lajur wajib: package_id, code, makkah, madinah, price_rm, pmn, pdf_page, evidence_text
// Lajur pilihan: aziziyah, category, room_label, notes. price_rm kosong = harga perlu pengesahan.
import { parseRMToSen } from "../engine/money";
import type { DraftOp } from "./ops";

export const CSV_REQUIRED = [
  "package_id",
  "code",
  "makkah",
  "madinah",
  "price_rm",
  "pmn",
  "pdf_page",
  "evidence_text",
] as const;
export const CSV_OPTIONAL = ["aziziyah", "category", "room_label", "notes"] as const;
export const CSV_MAX_ROWS = 1000;

/** Penghurai CSV RFC 4180 ringkas: petikan berganda, koma dan baris baharu dalam petikan. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"' && cell === "") quoted = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += ch;
  }
  if (quoted) throw new Error("CSV tidak sah: petikan tidak ditutup.");
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

const PMN: Record<string, "included" | "not_included" | "not_stated"> = {
  included: "included",
  termasuk: "included",
  ya: "included",
  not_included: "not_included",
  tidak: "not_included",
  tanpa: "not_included",
  not_stated: "not_stated",
  "": "not_stated",
};
const CATEGORY = ["adult", "child_with_bed", "child_no_bed", "infant"] as const;

export interface CsvResult {
  ops: DraftOp[];
  errors: string[];
}

export function csvToVariantOps(
  text: string,
  existing: {
    packageId: string;
    variants: {
      code: string;
      makkahOccupancy: number;
      madinahOccupancy: number;
      travellerCategory?: string;
    }[];
  }[],
): CsvResult {
  const errors: string[] = [];
  let rows: string[][];
  try {
    rows = parseCsv(text);
  } catch (e) {
    return { ops: [], errors: [(e as Error).message] };
  }
  if (rows.length < 2)
    return {
      ops: [],
      errors: ["CSV mesti ada baris tajuk dan sekurang-kurangnya satu baris data."],
    };
  if (rows.length - 1 > CSV_MAX_ROWS)
    return { ops: [], errors: [`Maksimum ${CSV_MAX_ROWS} baris.`] };
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const missing = CSV_REQUIRED.filter((c) => !header.includes(c));
  if (missing.length) return { ops: [], errors: [`Lajur wajib tiada: ${missing.join(", ")}`] };
  const unknown = header.filter(
    (h) =>
      !(CSV_REQUIRED as readonly string[]).includes(h) &&
      !(CSV_OPTIONAL as readonly string[]).includes(h),
  );
  if (unknown.length) errors.push(`Lajur tidak dikenali diabaikan: ${unknown.join(", ")}`);
  const col = (r: string[], name: string) => (r[header.indexOf(name)] ?? "").trim();
  const int = (v: string) => (/^\d+$/.test(v) ? Number(v) : null);

  const ops: DraftOp[] = [];
  const seen = new Set<string>();
  rows.slice(1).forEach((r, i) => {
    const line = i + 2;
    const fail = (m: string) => errors.push(`Baris ${line}: ${m}`);
    const packageId = col(r, "package_id");
    const pkg = existing.find((p) => p.packageId === packageId);
    if (!pkg) return fail(`pakej "${packageId}" tidak wujud dalam draf.`);
    const code = col(r, "code");
    if (!code) return fail("kod kosong.");
    const makkah = int(col(r, "makkah"));
    const madinah = int(col(r, "madinah"));
    if (!makkah || makkah > 12 || !madinah || madinah > 12)
      return fail("makkah/madinah mesti 1–12.");
    const azRaw = header.includes("aziziyah") ? col(r, "aziziyah") : "";
    const aziziyah = azRaw ? int(azRaw) : null;
    if (azRaw && (!aziziyah || aziziyah > 12)) return fail("aziziyah mesti 1–12 atau kosong.");
    const priceRaw = col(r, "price_rm");
    const priceSen = priceRaw ? parseRMToSen(priceRaw) : null;
    if (priceRaw && (priceSen === null || priceSen < 0n))
      return fail(`harga "${priceRaw}" tidak sah.`);
    const pmnRaw = col(r, "pmn").toLowerCase();
    const pmn = PMN[pmnRaw];
    if (!pmn) return fail(`pmn "${col(r, "pmn")}" tidak sah (included/not_included/not_stated).`);
    const catRaw = (header.includes("category") ? col(r, "category") : "") || "adult";
    if (!(CATEGORY as readonly string[]).includes(catRaw))
      return fail(`kategori "${catRaw}" tidak sah.`);
    const category = catRaw as (typeof CATEGORY)[number];
    const page = int(col(r, "pdf_page"));
    const evText = col(r, "evidence_text");
    if (priceSen !== null && (!page || evText.length < 3)) {
      return fail("varian berharga mesti ada pdf_page dan evidence_text.");
    }
    const key = `${packageId}|${code}|${makkah}|${madinah}|${category}`;
    if (seen.has(key)) return fail("baris pendua dalam CSV.");
    seen.add(key);
    const original = pkg.variants.find(
      (v) =>
        v.code === code &&
        v.makkahOccupancy === makkah &&
        v.madinahOccupancy === madinah &&
        (v.travellerCategory ?? "adult") === category,
    );
    ops.push({
      op: "upsert_variant",
      packageId,
      original: original
        ? { code, makkahOccupancy: makkah, madinahOccupancy: madinah, travellerCategory: category }
        : null,
      // Lajur yang tiada (atau pmn kosong) tidak menimpa nilai varian sedia ada.
      variant: {
        code,
        makkahOccupancy: makkah,
        madinahOccupancy: madinah,
        priceSen: priceSen === null ? null : Number(priceSen),
        travellerCategory: category,
        ...(header.includes("aziziyah") ? { aziziyahOccupancy: aziziyah } : {}),
        ...(pmnRaw !== "" || !original ? { pmnStatus: pmn } : {}),
        ...(header.includes("room_label")
          ? { roomLabelAsPublished: col(r, "room_label") || null }
          : {}),
        ...(header.includes("notes") ? { notes: col(r, "notes") || null } : {}),
      },
      ...(page && evText.length >= 3 ? { evidence: { pdfPage: page, text: evText } } : {}),
    });
  });
  return { ops, errors };
}
