import "server-only";

import type { NextResponse } from "next/server";

import { apiError } from "../api/http";
import { getStore } from "../storage/env";
import { readCookie, sessionSecret, SESSION_COOKIE, verifySession, type Role } from "./session";
import { findUser } from "./users";

export interface SessionUser {
  email: string;
  role: Role;
}

/**
 * Sahkan sesi sepenuhnya: tandatangan dan tempoh token, pengguna wujud, tidak dilumpuhkan,
 * peranan dan sessionVersion masih sepadan.
 */
export async function authenticate(token: string | null): Promise<SessionUser | null> {
  const secret = sessionSecret();
  const store = getStore();
  if (!secret || !store) return null;
  const payload = verifySession(token, secret, Math.floor(Date.now() / 1000));
  if (!payload) return null;
  const user = await findUser(store.kv, payload.sub);
  if (
    !user ||
    user.disabledAt ||
    user.sessionVersion !== payload.sv ||
    user.role !== payload.role
  ) {
    return null;
  }
  return { email: user.email, role: user.role };
}

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Pertahanan CSRF tambahan kepada kuki SameSite=Strict: permintaan mengubah data mesti datang
 * dari asal yang sama (Origin / Sec-Fetch-Site).
 */
export function sameOrigin(req: Request): boolean {
  if (!MUTATING.has(req.method)) return true;
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return false;
  const origin = req.headers.get("origin");
  if (!origin) return false;
  const host =
    req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? new URL(req.url).host;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Guard untuk Route Handler /api/admin/*: 401 tanpa sesi, 403 jika peranan tidak cukup. */
export async function requireApiUser(
  req: Request,
  role: Role | "any" = "any",
): Promise<{ user: SessionUser; error: null } | { user: null; error: NextResponse }> {
  if (!sessionSecret()) {
    return {
      user: null,
      error: apiError(
        503,
        "service_unavailable",
        "Log masuk pentadbir belum dikonfigurasi (AUTH_SECRET).",
      ),
    };
  }
  const user = await authenticate(readCookie(req.headers.get("cookie"), SESSION_COOKIE));
  if (!user) return { user: null, error: apiError(401, "unauthorized", "Sila log masuk.") };
  if (!sameOrigin(req)) {
    return { user: null, error: apiError(403, "forbidden", "Permintaan merentas asal ditolak.") };
  }
  if (role === "admin" && user.role !== "admin") {
    return {
      user: null,
      error: apiError(403, "forbidden", "Hanya pentadbir boleh melakukan tindakan ini."),
    };
  }
  return { user, error: null };
}

export const actorOf = (u: SessionUser) => `${u.email} (${u.role})`;
