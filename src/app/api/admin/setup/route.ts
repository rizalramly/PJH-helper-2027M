import { NextResponse } from "next/server";
import { z } from "zod";

import { apiError, readJson, withErrors } from "@/lib/api/http";
import { sameOrigin } from "@/lib/auth/guard";
import { passwordProblem } from "@/lib/auth/password";
import { finishAttempt, reserveAttempt } from "@/lib/auth/rate-limit";
import { setupTokenConfigured, setupTokenMatches } from "@/lib/auth/setup";
import { createUser, EMAIL_RE, normalizeEmail, readUsers } from "@/lib/auth/users";
import { requireStore } from "@/lib/storage/env";

const schema = z.object({
  token: z.string().min(1).max(256),
  email: z.string().trim().max(254),
  password: z.string().min(1).max(256),
});

/**
 * POST /api/admin/setup — cipta pentadbir PERTAMA (hanya jika belum ada pengguna) dengan
 * token persediaan. Selepas itu titik akhir ini sentiasa ditolak.
 */
export async function POST(req: Request) {
  return withErrors(async () => {
    if (!setupTokenConfigured()) return apiError(404, "not_found", "Persediaan tidak diaktifkan.");
    if (!sameOrigin(req)) return apiError(403, "forbidden", "Permintaan merentas asal ditolak.");
    const store = requireStore();
    const body = await readJson(req, 2_000);
    if (!body.ok) return body.response;
    const parsed = schema.safeParse(body.value);
    if (!parsed.success) return apiError(422, "validation_failed", "Lengkapkan semua medan.");

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "tempatan";
    const keys = { ip, email: "persediaan" };
    const slot = reserveAttempt(keys, Date.now());
    if ("blocked" in slot)
      return apiError(429, "rate_limited", "Terlalu banyak cubaan. Cuba lagi kemudian.");
    let ok = false;
    try {
      if (!setupTokenMatches(parsed.data.token)) {
        return apiError(403, "forbidden", "Token persediaan tidak sah.");
      }
      if ((await readUsers(store.kv)).users.length > 0) {
        return apiError(409, "conflict", "Persediaan telah selesai. Log masuk sebagai pentadbir.");
      }
      const email = normalizeEmail(parsed.data.email);
      if (!EMAIL_RE.test(email)) return apiError(422, "validation_failed", "Emel tidak sah.");
      const problem = passwordProblem(parsed.data.password);
      if (problem) return apiError(422, "validation_failed", problem);
      // Tulis createOnly: jika dua permintaan serentak, hanya satu berjaya (ConflictError → 409).
      await createUser(
        store.kv,
        { email, password: parsed.data.password, role: "admin" },
        "persediaan-pertama",
        new Date(),
      );
      ok = true;
      return NextResponse.json({ ok: true, email }, { headers: { "cache-control": "no-store" } });
    } finally {
      finishAttempt(keys, slot.stamp, ok);
    }
  });
}
