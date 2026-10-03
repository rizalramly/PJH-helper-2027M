// Token sesi pentadbir: payload JSON + HMAC-SHA256 (AUTH_SECRET). Disimpan dalam kuki
// HttpOnly, Secure, SameSite=Strict. Pengesahan penuh (pengguna wujud, tidak dilumpuhkan,
// sessionVersion sepadan) dibuat oleh guard pada setiap permintaan.
import { createHmac, timingSafeEqual } from "node:crypto";

export type Role = "admin" | "reviewer";

export interface SessionPayload {
  sub: string;
  role: Role;
  /** sessionVersion pengguna; dinaikkan untuk membatalkan semua sesi. */
  sv: number;
  iat: number;
  exp: number;
}

export const SESSION_COOKIE = "__Host-pjh_admin";
export const SESSION_TTL_S = 8 * 60 * 60;

export function sessionSecret(): string | null {
  const s = process.env.AUTH_SECRET;
  return s && s.length >= 32 ? s : null;
}

const sign = (data: string, secret: string) =>
  createHmac("sha256", secret).update(data).digest("base64url");

export function signSession(payload: SessionPayload, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body, secret)}`;
}

export function verifySession(
  token: string | undefined | null,
  secret: string,
  nowS: number,
): SessionPayload | null {
  if (!token || token.length > 2048) return null;
  const [body, mac, extra] = token.split(".");
  if (!body || !mac || extra !== undefined) return null;
  const expected = Buffer.from(sign(body, secret));
  const given = Buffer.from(mac);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (typeof p.sub !== "string" || (p.role !== "admin" && p.role !== "reviewer")) return null;
    if (typeof p.exp !== "number" || p.exp <= nowS) return null;
    return p;
  } catch {
    return null;
  }
}

/** Baca nilai kuki daripada pengepala Cookie. */
export function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}

export const sessionCookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: true,
  sameSite: "strict" as const,
  path: "/",
  maxAge,
});
