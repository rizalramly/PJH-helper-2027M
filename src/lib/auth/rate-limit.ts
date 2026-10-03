// Had cubaan log masuk (tetingkap gelongsor, dalam memori setiap instans). Pertahanan
// tambahan sahaja; hash scrypt yang mahal turut memperlahankan tekaan.
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const buckets = new Map<string, number[]>();

export function tooManyAttempts(keys: string[], now: number): boolean {
  return keys.some(
    (k) => (buckets.get(k) ?? []).filter((t) => now - t < WINDOW_MS).length >= MAX_ATTEMPTS,
  );
}

export function recordFailure(keys: string[], now: number) {
  for (const k of keys) {
    const list = (buckets.get(k) ?? []).filter((t) => now - t < WINDOW_MS);
    list.push(now);
    buckets.set(k, list);
  }
  if (buckets.size > 10_000) buckets.clear();
}

export function clearFailures(keys: string[]) {
  for (const k of keys) buckets.delete(k);
}

export const RATE_LIMIT = { WINDOW_MS, MAX_ATTEMPTS };

/** Ujian sahaja. */
export function resetRateLimit() {
  buckets.clear();
}
