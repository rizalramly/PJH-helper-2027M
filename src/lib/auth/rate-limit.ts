// Had cubaan log masuk (tetingkap gelongsor, dalam memori setiap instans). Pertahanan
// tambahan sahaja; hash scrypt yang mahal turut memperlahankan tekaan. Untuk perlindungan
// merentas instans, tambah peraturan had kadar Vercel WAF pada /api/admin/session.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const MAX_KEYS = 5_000;
/** Bilangan semakan scrypt serentak (setiap satu ≈128 MiB) bagi satu instans. */
const MAX_CONCURRENT = 4;

// IP dan emel disimpan berasingan: emel dipilih penyerang, jadi pengusiran kunci emel tidak
// boleh membuang kiraan IP.
const buckets = { ip: new Map<string, number[]>(), email: new Map<string, number[]>() };
let inFlight = 0;

type Kind = keyof typeof buckets;
export interface AttemptKeys {
  ip: string;
  email: string;
}

const live = (list: number[] | undefined, now: number) =>
  (list ?? []).filter((t) => now - t < WINDOW_MS);

function push(kind: Kind, key: string, stamp: number) {
  const map = buckets[kind];
  const list = live(map.get(key), stamp);
  list.push(stamp);
  map.delete(key);
  map.set(key, list); // susunan sisipan = paling lama digunakan dahulu
  while (map.size > MAX_KEYS) map.delete(map.keys().next().value!);
}

/**
 * Tempah satu cubaan SEBELUM kata laluan disemak (elak letusan serentak melepasi had).
 * Pulangkan null jika had dicapai atau pelayan sibuk; jika tidak, cop masa tempahan.
 */
export function reserveAttempt(
  keys: AttemptKeys,
  now: number,
): { stamp: number } | { blocked: "limit" | "busy" } {
  if (
    live(buckets.ip.get(keys.ip), now).length >= MAX_ATTEMPTS ||
    live(buckets.email.get(keys.email), now).length >= MAX_ATTEMPTS
  ) {
    return { blocked: "limit" };
  }
  if (inFlight >= MAX_CONCURRENT) return { blocked: "busy" };
  inFlight++;
  push("ip", keys.ip, now);
  push("email", keys.email, now);
  return { stamp: now };
}

/** Tamatkan semakan. Jika berjaya, tempahan dibatalkan supaya log masuk sah tidak dikira. */
export function finishAttempt(keys: AttemptKeys, stamp: number, success: boolean) {
  inFlight = Math.max(0, inFlight - 1);
  if (!success) return;
  for (const kind of ["ip", "email"] as const) {
    const list = buckets[kind].get(keys[kind]);
    const i = list?.lastIndexOf(stamp) ?? -1;
    if (list && i >= 0) list.splice(i, 1);
  }
  buckets.email.delete(keys.email);
}

/** Ujian sahaja. */
export function resetRateLimit() {
  buckets.ip.clear();
  buckets.email.clear();
  inFlight = 0;
}

export const RATE_LIMIT = { WINDOW_MS, MAX_ATTEMPTS, MAX_KEYS, MAX_CONCURRENT };
