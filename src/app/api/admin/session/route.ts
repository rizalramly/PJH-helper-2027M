import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError, readJson, withErrors } from "@/lib/api/http";
import { requireApiUser, sameOrigin } from "@/lib/auth/guard";
import { verifyAgainstDummy, verifyPassword } from "@/lib/auth/password";
import { finishAttempt, reserveAttempt } from "@/lib/auth/rate-limit";
import {
  sessionCookieOptions,
  sessionSecret,
  SESSION_COOKIE,
  SESSION_TTL_S,
  signSession,
} from "@/lib/auth/session";
import { findUser, normalizeEmail, updateUser } from "@/lib/auth/users";
import { appendAudit } from "@/lib/storage/catalog-repo";
import { requireStore } from "@/lib/storage/env";

const bodySchema = z.object({
  email: z.string().trim().min(3).max(254),
  password: z.string().min(1).max(256),
});

const FAIL = "Emel atau kata laluan tidak sah.";

const clientIp = (req: Request) =>
  req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "tempatan";

/** GET /api/admin/session — pengguna semasa (401 jika tiada sesi). */
export async function GET(req: Request) {
  return withErrors(async () => {
    const { user, error } = await requireApiUser(req);
    if (error) return error;
    return NextResponse.json({ user }, { headers: { "cache-control": "no-store" } });
  });
}

/** POST /api/admin/session — log masuk. */
export async function POST(req: Request) {
  return withErrors(async () => {
    const secret = sessionSecret();
    if (!secret)
      return apiError(503, "service_unavailable", "Log masuk pentadbir belum dikonfigurasi.");
    if (!sameOrigin(req)) return apiError(403, "forbidden", "Permintaan merentas asal ditolak.");
    const store = requireStore();
    const body = await readJson(req, 2_000);
    if (!body.ok) return body.response;
    const parsed = bodySchema.safeParse(body.value);
    if (!parsed.success) return apiError(422, "validation_failed", FAIL);

    const email = normalizeEmail(parsed.data.email);
    const now = new Date();
    const keys = { ip: clientIp(req), email };
    const slot = reserveAttempt(keys, now.getTime());
    if ("blocked" in slot) {
      return apiError(
        429,
        "rate_limited",
        slot.blocked === "busy"
          ? "Pelayan sibuk. Cuba lagi sebentar."
          : "Terlalu banyak cubaan log masuk. Cuba lagi selepas 15 minit.",
      );
    }

    let user: Awaited<ReturnType<typeof findUser>> = null;
    let valid = false;
    try {
      user = await findUser(store.kv, email);
      valid =
        user && !user.disabledAt
          ? await verifyPassword(parsed.data.password, user.passwordHash)
          : await verifyAgainstDummy(parsed.data.password);
    } finally {
      finishAttempt(keys, slot.stamp, valid);
    }
    if (!user || user.disabledAt || !valid) {
      await appendAudit(store.kv, {
        at: now.toISOString(),
        actor: "tanpa-sesi",
        action: "login_failed",
        target: email.slice(0, 120),
      });
      return apiError(401, "unauthorized", FAIL);
    }

    await updateUser(store.kv, email, (u) => ({ ...u, lastLoginAt: now.toISOString() }), null);
    await appendAudit(store.kv, {
      at: now.toISOString(),
      actor: `${user.email} (${user.role})`,
      action: "login",
    });
    const iat = Math.floor(now.getTime() / 1000);
    const token = signSession(
      { sub: user.email, role: user.role, sv: user.sessionVersion, iat, exp: iat + SESSION_TTL_S },
      secret,
    );
    const res = NextResponse.json(
      { user: { email: user.email, role: user.role } },
      { headers: { "cache-control": "no-store" } },
    );
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(SESSION_TTL_S));
    return res;
  });
}

/** DELETE /api/admin/session — log keluar. */
export async function DELETE(req: Request) {
  return withErrors(async () => {
    if (!sameOrigin(req)) return apiError(403, "forbidden", "Permintaan merentas asal ditolak.");
    const { user } = await requireApiUser(req);
    if (user) {
      // Batalkan token secara pelayan (semua sesi pengguna ini), bukan sekadar memadam kuki.
      const now = new Date();
      await updateUser(
        requireStore().kv,
        user.email,
        (u) => ({ ...u, sessionVersion: u.sessionVersion + 1 }),
        null,
      );
      await appendAudit(requireStore().kv, {
        at: now.toISOString(),
        actor: `${user.email} (${user.role})`,
        action: "logout",
      });
    }
    const res = NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
    res.cookies.set(SESSION_COOKIE, "", sessionCookieOptions(0));
    return res;
  });
}
