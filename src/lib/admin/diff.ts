// Ringkasan perubahan antara fail katalog aktif dan draf (untuk semakan dan penerbitan).
import { formatRM } from "../engine/money";
import type { PjhCatalogFileInput } from "../catalog/schema";

export interface DiffItem {
  kind: "added" | "removed" | "changed";
  area: "pjh" | "package" | "variant" | "upgrade" | "charge" | "other";
  text: string;
}

type File = PjhCatalogFileInput;
type Variant = File["packages"][number]["variants"][number];

const price = (sen: number | null | undefined) =>
  sen === null || sen === undefined ? "harga perlu pengesahan" : formatRM(BigInt(sen));
const vkey = (v: Variant) =>
  `${v.code} (Makkah ber-${v.makkahOccupancy}, Madinah ber-${v.madinahOccupancy}${(v.travellerCategory ?? "adult") === "adult" ? "" : `, ${v.travellerCategory}`})`;

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export const sameContent = (a: unknown, b: unknown) => canonical(a) === canonical(b);

export function diffFiles(before: File | null, after: File): DiffItem[] {
  const out: DiffItem[] = [];
  if (!before) {
    out.push({
      kind: "added",
      area: "pjh",
      text: `PJH baharu ${after.pjh.name} (${after.packages.length} pakej)`,
    });
    return out;
  }
  const ba = before.pjh.approval?.status ?? "unverified";
  const aa = after.pjh.approval?.status ?? "unverified";
  if (ba !== aa)
    out.push({ kind: "changed", area: "pjh", text: `Status kelulusan: ${ba} → ${aa}` });
  else if (!sameContent(before.pjh.approval ?? null, after.pjh.approval ?? null))
    out.push({
      kind: "changed",
      area: "pjh",
      text: "Maklumat kelulusan (sumber rasmi/rujukan) berubah",
    });

  const bp = new Map(before.packages.map((p) => [p.id, p]));
  const ap = new Map(after.packages.map((p) => [p.id, p]));
  for (const [id, p] of ap) {
    const old = bp.get(id);
    if (!old) {
      out.push({
        kind: "added",
        area: "package",
        text: `Pakej baharu ${p.name} (${p.variants.length} varian)`,
      });
      continue;
    }
    const fields: [string, unknown, unknown][] = [
      ["nama", old.name, p.name],
      ["status terbit", old.publishedStatus ?? "published", p.publishedStatus ?? "published"],
      ["kekosongan", old.availability.status, p.availability.status],
      ["Tarwiyah", old.tarwiyah.status, p.tarwiyah.status],
      ["Aziziyah", old.aziziyah.status, p.aziziyah.status],
      ["tempoh", old.duration.value, p.duration.value],
    ];
    for (const [label, x, y] of fields) {
      if (x !== y)
        out.push({
          kind: "changed",
          area: "package",
          text: `${p.name}: ${label} ${String(x)} → ${String(y)}`,
        });
    }
    const bv = new Map(old.variants.map((v) => [vkey(v), v]));
    const av = new Map(p.variants.map((v) => [vkey(v), v]));
    for (const [k, v] of av) {
      const o = bv.get(k);
      if (!o)
        out.push({
          kind: "added",
          area: "variant",
          text: `${p.name}: varian ${k} ${price(v.priceSen)}`,
        });
      else if (o.priceSen !== v.priceSen)
        out.push({
          kind: "changed",
          area: "variant",
          text: `${p.name}: ${k} ${price(o.priceSen)} → ${price(v.priceSen)}`,
        });
      else if (!sameContent(o, v))
        out.push({
          kind: "changed",
          area: "variant",
          text: `${p.name}: ${k} butiran lain berubah`,
        });
    }
    for (const k of bv.keys())
      if (!av.has(k))
        out.push({ kind: "removed", area: "variant", text: `${p.name}: varian ${k} dibuang` });
  }
  for (const [id, p] of bp)
    if (!ap.has(id))
      out.push({ kind: "removed", area: "package", text: `Pakej ${p.name} dibuang` });

  for (const [area, b, a] of [
    ["upgrade", before.upgrades ?? [], after.upgrades ?? []],
    ["charge", before.charges ?? [], after.charges ?? []],
  ] as const) {
    const label = area === "upgrade" ? "Naik taraf" : "Caj";
    const bm = new Map(b.map((x) => [x.id, x]));
    const am = new Map(a.map((x) => [x.id, x]));
    for (const [id, x] of am) {
      const o = bm.get(id);
      if (!o)
        out.push({
          kind: "added",
          area,
          text: `${label} baharu ${x.description} ${price(x.priceSen)}`,
        });
      else if (o.priceSen !== x.priceSen)
        out.push({
          kind: "changed",
          area,
          text: `${label} ${x.description}: ${price(o.priceSen)} → ${price(x.priceSen)}`,
        });
      else if (!sameContent(o, x))
        out.push({ kind: "changed", area, text: `${label} ${x.description}: butiran berubah` });
    }
    for (const [id, x] of bm)
      if (!am.has(id))
        out.push({ kind: "removed", area, text: `${label} ${x.description} dibuang` });
  }

  const strip = (f: File) => ({
    ...f,
    packages: [],
    upgrades: [],
    charges: [],
    review: null,
    pjh: { ...f.pjh, approval: null },
  });
  const packagesOther = after.packages.some((p) => {
    const o = bp.get(p.id);
    return o && !sameContent({ ...o, variants: [] }, { ...p, variants: [] });
  });
  if (
    !sameContent(strip(before), strip(after)) ||
    (packagesOther && !out.some((d) => d.area === "package"))
  ) {
    out.push({ kind: "changed", area: "other", text: "Medan lain berubah (lihat editor JSON)" });
  }
  return out;
}
