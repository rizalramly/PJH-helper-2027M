// @vitest-environment node
import { describe, expect, it } from "vitest";

import { hashPassword, passwordProblem, verifyPassword } from "@/lib/auth/password";
import { readCookie, signSession, verifySession } from "@/lib/auth/session";

const FAST = { N: 2 ** 10, r: 8, p: 1 };
const SECRET = "x".repeat(40);

describe("kata laluan", () => {
  it("hash scrypt boleh disahkan dan tidak menyimpan plaintext", async () => {
    const h = await hashPassword("kata-laluan-panjang-1", FAST);
    expect(h).toMatch(/^scrypt\$1024\$8\$1\$/);
    expect(h).not.toContain("kata-laluan");
    expect(await verifyPassword("kata-laluan-panjang-1", h)).toBe(true);
    expect(await verifyPassword("kata-laluan-panjang-2", h)).toBe(false);
    expect(await verifyPassword("x", "bukan-hash")).toBe(false);
  });

  it("menolak kata laluan pendek", async () => {
    expect(passwordProblem("pendek")).toMatch(/sekurang-kurangnya 12/);
    await expect(hashPassword("pendek", FAST)).rejects.toThrow();
  });
});

describe("token sesi", () => {
  const payload = { sub: "a@b.my", role: "admin" as const, sv: 1, iat: 100, exp: 200 };

  it("sah sebelum tamat tempoh, ditolak selepasnya", () => {
    const t = signSession(payload, SECRET);
    expect(verifySession(t, SECRET, 150)).toMatchObject({ sub: "a@b.my", role: "admin" });
    expect(verifySession(t, SECRET, 200)).toBeNull();
  });

  it("menolak token diubah, rahsia lain dan format rosak", () => {
    const t = signSession(payload, SECRET);
    const [body, mac] = t.split(".");
    const forged = Buffer.from(
      JSON.stringify({ ...payload, role: "admin", sub: "x@y.my" }),
    ).toString("base64url");
    expect(verifySession(`${forged}.${mac}`, SECRET, 150)).toBeNull();
    expect(verifySession(t, "y".repeat(40), 150)).toBeNull();
    expect(verifySession(`${body}`, SECRET, 150)).toBeNull();
    expect(verifySession(`${t}.x`, SECRET, 150)).toBeNull();
    expect(verifySession(null, SECRET, 150)).toBeNull();
  });

  it("membaca kuki daripada pengepala", () => {
    expect(readCookie("a=1; __Host-pjh_admin=abc.def; b=2", "__Host-pjh_admin")).toBe("abc.def");
    expect(readCookie(null, "x")).toBeNull();
  });
});
