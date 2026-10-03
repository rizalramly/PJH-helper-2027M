// Semak pakej secara manual: semua pakej satu PJH, dari harga terendah hingga paling premium.
// Fungsi tulen (tiada I/O).
import type { Catalog, Package, Pjh, Variant } from "../engine/types";

export interface BrowsePackage {
  pkg: Package;
  /** Varian dewasa dahulu (harga menaik, harga tidak diketahui di akhir), kemudian kategori lain. */
  variants: Variant[];
  /** Varian dewasa berharga terendah; null jika tiada harga dewasa diterbitkan. */
  from: Variant | null;
}

export interface PjhOption {
  id: string;
  name: string;
  packages: number;
}

const CATEGORY_ORDER: Record<Variant["travellerCategory"], number> = {
  adult: 0,
  child_with_bed: 1,
  child_no_bed: 2,
  infant: 3,
};

/** Harga menaik; harga tidak diketahui (null) sentiasa di akhir. */
const byPrice = (a: bigint | null, b: bigint | null) =>
  a === null ? (b === null ? 0 : 1) : b === null ? -1 : a < b ? -1 : a > b ? 1 : 0;

export function compareVariants(a: Variant, b: Variant): number {
  return (
    CATEGORY_ORDER[a.travellerCategory] - CATEGORY_ORDER[b.travellerCategory] ||
    byPrice(a.priceSen, b.priceSen) ||
    b.makkahOccupancy - a.makkahOccupancy ||
    a.code.localeCompare(b.code)
  );
}

/** Senarai PJH untuk pemilih, ikut nama. */
export function pjhOptions(catalog: Catalog): PjhOption[] {
  return catalog.pjhs
    .map((p) => ({
      id: p.id,
      name: p.name,
      packages: catalog.packages.filter((x) => x.pjhId === p.id).length,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "ms"));
}

/** Pakej satu PJH, disusun ikut harga dewasa terendah (pakej tanpa harga di akhir). */
export function browsePjh(
  catalog: Catalog,
  pjhId: string,
): { pjh: Pjh; packages: BrowsePackage[] } | null {
  const pjh = catalog.pjhs.find((p) => p.id === pjhId);
  if (!pjh) return null;
  const packages = catalog.packages
    .filter((p) => p.pjhId === pjhId)
    .map((pkg) => {
      const variants = catalog.variants.filter((v) => v.packageId === pkg.id).sort(compareVariants);
      const from =
        variants.find((v) => v.travellerCategory === "adult" && v.priceSen !== null) ?? null;
      return { pkg, variants, from };
    })
    .sort(
      (a, b) =>
        byPrice(a.from?.priceSen ?? null, b.from?.priceSen ?? null) ||
        a.pkg.name.localeCompare(b.pkg.name, "ms"),
    );
  return { pjh, packages };
}
