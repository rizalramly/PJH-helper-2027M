"use client";

// Panggilan API pentadbir dari pelayar (asal sama; kuki sesi dihantar automatik).
export type AdminResult<T> =
  { ok: true; data: T } | { ok: false; status: number; message: string; details: string[] };

export async function adminFetch<T = unknown>(
  url: string,
  init: { method?: string; body?: unknown; form?: FormData } = {},
): Promise<AdminResult<T>> {
  try {
    const res = await fetch(url, {
      method: init.method ?? (init.body !== undefined || init.form ? "POST" : "GET"),
      headers: init.form ? undefined : { "content-type": "application/json" },
      body: init.form ?? (init.body !== undefined ? JSON.stringify(init.body) : undefined),
      cache: "no-store",
    });
    const json = (await res.json().catch(() => null)) as
      (T & { error?: undefined }) | { error: { message: string; details?: unknown } } | null;
    if (!res.ok || !json || (json as { error?: unknown }).error) {
      const err = (json as { error?: { message?: string; details?: unknown } } | null)?.error;
      const details = Array.isArray(err?.details)
        ? err.details.map((d) =>
            typeof d === "string"
              ? d
              : `${(d as { field?: string }).field ?? ""} ${(d as { message?: string }).message ?? ""}`.trim(),
          )
        : [];
      return {
        ok: false,
        status: res.status,
        message:
          res.status === 401 && url !== "/api/admin/session"
            ? "Sesi tamat atau tidak sah. Muat semula halaman dan log masuk semula."
            : (err?.message ?? "Permintaan gagal."),
        details,
      };
    }
    return { ok: true, data: json as T };
  } catch {
    return { ok: false, status: 0, message: "Tiada sambungan ke pelayan.", details: [] };
  }
}

/** RM → sen (nombor) untuk API; null jika kosong, NaN jika tidak sah. */
export function rmToSen(v: string): number | null {
  const t = v.trim();
  if (!t) return null;
  const m = t.replace(/^RM\s*/i, "").replace(/[,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(m)) return Number.NaN;
  const [r, c = ""] = m.split(".");
  return Number(r) * 100 + Number(c.padEnd(2, "0"));
}

export const senToRm = (sen: number | null | undefined) =>
  sen === null || sen === undefined
    ? ""
    : `${Math.floor(sen / 100).toLocaleString("en-MY")}${sen % 100 ? `.${String(sen % 100).padStart(2, "0")}` : ""}`;
