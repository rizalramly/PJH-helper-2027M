// Hash kata laluan pentadbir: scrypt (memory-hard, terbina dalam Node; tiada modul natif).
// Format: scrypt$<N>$<r>$<p>$<salt base64url>$<hash base64url>. Tiada kata laluan plaintext disimpan.
import { randomBytes, scrypt as scryptCb, timingSafeEqual, type ScryptOptions } from "node:crypto";

const scrypt = (pw: string, salt: Buffer, keylen: number, opts: ScryptOptions) =>
  new Promise<Buffer>((resolve, reject) =>
    scryptCb(pw.normalize("NFKC"), salt, keylen, opts, (err, key) =>
      err ? reject(err) : resolve(key),
    ),
  );

/** Parameter OWASP untuk scrypt: N=2^17, r=8, p=1 (≈128 MiB). */
export const DEFAULT_COST = { N: 2 ** 17, r: 8, p: 1 };
const KEYLEN = 32;
const maxmem = (N: number, r: number) => 256 * N * r;

export const PASSWORD_MIN = 12;
export const PASSWORD_MAX = 256;

export function passwordProblem(pw: string): string | null {
  if (pw.length < PASSWORD_MIN)
    return `Kata laluan mesti sekurang-kurangnya ${PASSWORD_MIN} aksara.`;
  if (pw.length > PASSWORD_MAX) return `Kata laluan terlalu panjang (maksimum ${PASSWORD_MAX}).`;
  return null;
}

export async function hashPassword(pw: string, cost = DEFAULT_COST): Promise<string> {
  const problem = passwordProblem(pw);
  if (problem) throw new Error(problem);
  const salt = randomBytes(16);
  const key = await scrypt(pw, salt, KEYLEN, { ...cost, maxmem: maxmem(cost.N, cost.r) });
  return [
    "scrypt",
    cost.N,
    cost.r,
    cost.p,
    salt.toString("base64url"),
    key.toString("base64url"),
  ].join("$");
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [N, r, p] = parts.slice(1, 4).map(Number);
  if (![N, r, p].every((x) => Number.isInteger(x) && x > 0) || N > 2 ** 20) return false;
  const salt = Buffer.from(parts[4], "base64url");
  const expected = Buffer.from(parts[5], "base64url");
  if (pw.length > PASSWORD_MAX) return false;
  const key = await scrypt(pw, salt, expected.length, { N, r, p, maxmem: maxmem(N, r) });
  return key.length === expected.length && timingSafeEqual(key, expected);
}

/** Hash tetap untuk menyamakan masa respons apabila emel tidak wujud. */
let dummy: Promise<string> | null = null;
export async function verifyAgainstDummy(pw: string) {
  dummy ??= hashPassword("dummy-password-for-timing");
  await verifyPassword(pw.slice(0, PASSWORD_MAX), await dummy);
  return false;
}
