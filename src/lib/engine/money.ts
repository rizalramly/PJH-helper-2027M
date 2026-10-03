// Wang sebagai integer sen (bigint). Tiada nombor titik terapung dalam pengiraan.

const groupFormatter = new Intl.NumberFormat("en-MY", { maximumFractionDigits: 0 });

/** Format sen kepada "RM 86,490.00" (negatif: "-RM 4,980.00"). */
export function formatRM(sen: bigint): string {
  const negative = sen < 0n;
  const abs = negative ? -sen : sen;
  const ringgit = abs / 100n;
  const cents = (abs % 100n).toString().padStart(2, "0");
  return `${negative ? "-" : ""}RM ${groupFormatter.format(ringgit)}.${cents}`;
}

/** Terima "86490", "86,490", "RM86,490.00", "RM 86 490.5". Pulangkan null jika tidak sah. */
export function parseRMToSen(input: string): bigint | null {
  const cleaned = input.replace(/rm/gi, "").replace(/[\s,]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [whole, frac = ""] = cleaned.split(".");
  return BigInt(whole) * 100n + BigInt(frac.padEnd(2, "0") || "0");
}

/** Lebar julat bajet lalai: pakej dicari dalam RM10,000 di bawah bajet seorang hingga bajet. */
export const BUDGET_RANGE_SEN = 1_000_000n;

/** Had bawah julat bajet seorang (tidak kurang daripada RM0). */
export function budgetFloorSen(perPersonSen: bigint, rangeSen: bigint = BUDGET_RANGE_SEN): bigint {
  return perPersonSen > rangeSen ? perPersonSen - rangeSen : 0n;
}

export function sumSen(values: bigint[]): bigint {
  return values.reduce((a, b) => a + b, 0n);
}

/** Nisbah a/b sebagai nombor 0..1 (untuk skor sahaja, bukan wang). */
export function ratio(a: bigint, b: bigint): number {
  if (b === 0n) return 0;
  return Number((a * 1_000_000n) / b) / 1_000_000;
}
