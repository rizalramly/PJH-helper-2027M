import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Token persediaan sekali guna (ADMIN_SETUP_TOKEN, ≥ 32 aksara) untuk mencipta pentadbir
 * pertama melalui pelayar apabila stor belum mempunyai pengguna. Tanpa pemboleh ubah ini,
 * persediaan dimatikan.
 */
export function setupTokenConfigured(): boolean {
  return (process.env.ADMIN_SETUP_TOKEN ?? "").length >= 32;
}

export function setupTokenMatches(given: string): boolean {
  const expected = process.env.ADMIN_SETUP_TOKEN ?? "";
  if (expected.length < 32) return false;
  // Banding cincangan (panjang tetap) supaya masa tidak bergantung pada panjang input.
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
