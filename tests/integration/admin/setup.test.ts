// @vitest-environment node
// Persediaan pertama production: pentadbir pertama melalui token, kemudian katalog awal.
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { POST as seedPOST } from "@/app/api/admin/seed/route";
import { POST as sessionPOST } from "@/app/api/admin/session/route";
import { POST as setupPOST } from "@/app/api/admin/setup/route";
import { resetRateLimit } from "@/lib/auth/rate-limit";
import { readUsers } from "@/lib/auth/users";
import { invalidateActiveCatalog } from "@/lib/catalog/active";
import { getActivePointer, listAuditEvents } from "@/lib/storage/catalog-repo";
import { setStoreForTests, type Store } from "@/lib/storage/env";
import { MemoryFileStore } from "@/lib/storage/files";
import { MemoryKV } from "@/lib/storage/kv";
import { proxy } from "@/proxy";
import { NextRequest } from "next/server";

const ORIGIN = "http://persediaan.test";
const TOKEN = "t".repeat(40);
const post = (path: string, body: unknown, cookie?: string) =>
  new Request(`${ORIGIN}${path}`, {
    method: "POST",
    headers: { origin: ORIGIN, "content-type": "application/json", ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });

let store: Store;
beforeEach(() => {
  store = { kind: "memory", kv: new MemoryKV(), files: new MemoryFileStore() };
  setStoreForTests(store);
  resetRateLimit();
  invalidateActiveCatalog();
  process.env.AUTH_SECRET = "s".repeat(48);
  process.env.ADMIN_SETUP_TOKEN = TOKEN;
});
afterAll(() => {
  setStoreForTests(undefined);
  delete process.env.ADMIN_SETUP_TOKEN;
  delete process.env.AUTH_SECRET;
});

const setup = (token = TOKEN) =>
  setupPOST(
    post("/api/admin/setup", {
      token,
      email: "Pentadbir@Contoh.my",
      password: "kata-laluan-pertama-1",
    }),
  );

describe("persediaan pentadbir pertama", () => {
  it("dimatikan tanpa ADMIN_SETUP_TOKEN", async () => {
    delete process.env.ADMIN_SETUP_TOKEN;
    expect((await setup()).status).toBe(404);
  });

  it("menolak token salah dan hanya mencipta pentadbir sekali", async () => {
    expect((await setup("salah".repeat(10))).status).toBe(403);
    const ok = await setup();
    expect(ok.status).toBe(200);
    const { users } = await readUsers(store.kv);
    expect(users).toHaveLength(1);
    expect(users[0]).toMatchObject({ email: "pentadbir@contoh.my", role: "admin" });
    expect(users[0].passwordHash).toMatch(/^scrypt\$/);
    expect((await setup()).status).toBe(409);
  });

  it("laluan persediaan boleh dicapai tanpa sesi melalui proxy", () => {
    expect(proxy(new NextRequest(`${ORIGIN}/admin/persediaan`)).status).toBe(200);
    expect(proxy(new NextRequest(`${ORIGIN}/api/admin/setup`, { method: "POST" })).status).toBe(
      200,
    );
  });
});

describe("katalog awal", () => {
  it("pentadbir menerbitkan katalog repo sekali; kali kedua ditolak", async () => {
    expect((await setup()).status).toBe(200);
    const login = await sessionPOST(
      post("/api/admin/session", {
        email: "pentadbir@contoh.my",
        password: "kata-laluan-pertama-1",
      }),
    );
    const cookie = (login.headers.get("set-cookie") ?? "").split(";")[0];
    expect((await seedPOST(post("/api/admin/seed", {}))).status).toBe(401);
    const res = await seedPOST(post("/api/admin/seed", {}, cookie));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.result.status).toBe("published");
    expect((await getActivePointer(store.kv, "1448H"))?.datasetVersion).toBe(
      body.result.datasetVersion,
    );
    expect((await seedPOST(post("/api/admin/seed", {}, cookie))).status).toBe(409);
    const audit = await listAuditEvents(store.kv);
    expect(audit.map((e) => e.action)).toEqual(
      expect.arrayContaining(["user_create", "publish", "activate"]),
    );
  });
});
