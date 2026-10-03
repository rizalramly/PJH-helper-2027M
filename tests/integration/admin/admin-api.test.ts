// @vitest-environment node
// Ujian integrasi API pentadbir dengan stor dalam memori (tiada Blob, tiada rangkaian).
import { join } from "node:path";

import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { GET as auditGET } from "@/app/api/admin/audit/route";
import { POST as reviewPOST } from "@/app/api/admin/drafts/[season]/[pjh]/review/route";
import {
  DELETE as draftDELETE,
  GET as draftGET,
  PATCH as draftPATCH,
} from "@/app/api/admin/drafts/[season]/[pjh]/route";
import { GET as draftsGET, POST as draftsPOST } from "@/app/api/admin/drafts/route";
import { POST as importPOST } from "@/app/api/admin/import/route";
import { POST as publishPOST } from "@/app/api/admin/publish/route";
import { POST as seasonsPOST } from "@/app/api/admin/seasons/route";
import {
  DELETE as sessionDELETE,
  GET as sessionGET,
  POST as sessionPOST,
} from "@/app/api/admin/session/route";
import { GET as sourceGET } from "@/app/api/admin/sources/[sha]/route";
import { POST as registerPOST } from "@/app/api/admin/sources/register/route";
import { GET as sourcesGET, POST as sourcesPOST } from "@/app/api/admin/sources/route";
import { GET as versionsGET, POST as versionsPOST } from "@/app/api/admin/versions/route";
import { POST as assessPOST } from "@/app/api/assess/route";
import { GET as publicSeasonsGET } from "@/app/api/catalog/seasons/route";
import { resetRateLimit } from "@/lib/auth/rate-limit";
import { createUser } from "@/lib/auth/users";
import { invalidateActiveCatalog } from "@/lib/catalog/active";
import { readRepoCatalog } from "@/lib/catalog/repo-files";
import { invalidateSeasonCache } from "@/lib/catalog/season-store";
import { publishCatalog } from "@/lib/storage/catalog-repo";
import { setStoreForTests, type Store } from "@/lib/storage/env";
import { MemoryFileStore } from "@/lib/storage/files";
import { MemoryKV } from "@/lib/storage/kv";
import { proxy } from "@/proxy";

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const ORIGIN = "http://admin.test";
const FAST = { N: 2 ** 10, r: 8, p: 1 };
const repo = readRepoCatalog(join(__dirname, "../../.."), "1448H");
const PASS = "kata-laluan-ujian-panjang";

let store: Store;

function req(
  path: string,
  init: {
    method?: string;
    body?: unknown;
    cookie?: string;
    origin?: string | null;
    form?: FormData;
  } = {},
) {
  const headers = new Headers();
  if (init.cookie) headers.set("cookie", init.cookie);
  if (init.origin !== null) headers.set("origin", init.origin ?? ORIGIN);
  let body: BodyInit | undefined;
  if (init.form) body = init.form;
  else if (init.body !== undefined) {
    body = JSON.stringify(init.body);
    headers.set("content-type", "application/json");
  }
  return new Request(`${ORIGIN}${path}`, { method: init.method ?? "GET", headers, body });
}

const params = <T>(p: T) => ({ params: Promise.resolve(p) }) as never;

async function login(email: string, password = PASS) {
  const res = await sessionPOST(
    req("/api/admin/session", { method: "POST", body: { email, password } }),
  );
  const set = res.headers.get("set-cookie") ?? "";
  return { res, cookie: set.split(";")[0] };
}

let adminCookie = "";
let reviewerCookie = "";

beforeAll(async () => {
  process.env.AUTH_SECRET = "s".repeat(48);
});
afterAll(() => {
  setStoreForTests(undefined);
  delete process.env.AUTH_SECRET;
});

beforeEach(async () => {
  store = { kind: "memory", kv: new MemoryKV(), files: new MemoryFileStore() };
  setStoreForTests(store);
  resetRateLimit();
  invalidateActiveCatalog();
  invalidateSeasonCache();
  const now = new Date("2026-10-05T01:00:00Z");
  await createUser(
    store.kv,
    { email: "admin@contoh.my", password: PASS, role: "admin" },
    "ujian",
    now,
    FAST,
  );
  await createUser(
    store.kv,
    { email: "semak@contoh.my", password: PASS, role: "reviewer" },
    "ujian",
    now,
    FAST,
  );
  // Seed seperti `pnpm db:seed`
  await publishCatalog(store.kv, {
    seasonId: "1448H",
    files: repo.raw,
    coverage: repo.coverage,
    actor: "seed",
    now,
  });
  adminCookie = (await login("admin@contoh.my")).cookie;
  reviewerCookie = (await login("semak@contoh.my")).cookie;
});

describe("akses tanpa sesi (401)", () => {
  it("semua Route Handler pentadbir memulangkan 401", async () => {
    const calls: Promise<Response>[] = [
      draftsGET(req("/api/admin/drafts")),
      draftsPOST(
        req("/api/admin/drafts", { method: "POST", body: { seasonId: "1448H", pjhId: "busyra" } }),
      ),
      draftGET(req("/api/admin/drafts/1448H/busyra"), params({ season: "1448H", pjh: "busyra" })),
      publishPOST(
        req("/api/admin/publish", {
          method: "POST",
          body: { seasonId: "1448H", pjhIds: ["busyra"] },
        }),
      ),
      versionsGET(req("/api/admin/versions")),
      versionsPOST(req("/api/admin/versions", { method: "POST", body: {} })),
      auditGET(req("/api/admin/audit")),
      sourcesGET(req("/api/admin/sources")),
      importPOST(req("/api/admin/import", { method: "POST", body: {} })),
      seasonsPOST(req("/api/admin/seasons", { method: "POST", body: {} })),
      sessionGET(req("/api/admin/session")),
    ];
    for (const res of await Promise.all(calls)) {
      expect(res.status).toBe(401);
      expect((await res.json()).error.code).toBe("unauthorized");
    }
  });

  it("kuki palsu atau diubah ditolak", async () => {
    const forged = adminCookie.replace(/.$/, (c) => (c === "A" ? "B" : "A"));
    expect((await draftsGET(req("/api/admin/drafts", { cookie: forged }))).status).toBe(401);
    expect(
      (await draftsGET(req("/api/admin/drafts", { cookie: "__Host-pjh_admin=x.y" }))).status,
    ).toBe(401);
  });

  it("proxy: /api/admin → 401 JSON, /admin → ubah hala ke log masuk", () => {
    const api = proxy(new NextRequest(`${ORIGIN}/api/admin/drafts`));
    expect(api.status).toBe(401);
    const page = proxy(new NextRequest(`${ORIGIN}/admin/pjh?x=1`));
    expect(page.status).toBe(307);
    expect(page.headers.get("location")).toBe(
      `${ORIGIN}/admin/log-masuk?next=%2Fadmin%2Fpjh%3Fx%3D1`,
    );
    expect(proxy(new NextRequest(`${ORIGIN}/admin/log-masuk`)).status).toBe(200);
  });
});

describe("log masuk", () => {
  it("kuki sesi HttpOnly, Secure, SameSite=Strict; log keluar membatalkan kuki", async () => {
    const { res } = await login("ADMIN@contoh.my");
    expect(res.status).toBe(200);
    const set = res.headers.get("set-cookie")!;
    expect(set).toMatch(/^__Host-pjh_admin=/);
    expect(set).toMatch(/HttpOnly/i);
    expect(set).toMatch(/Secure/i);
    expect(set).toMatch(/SameSite=strict/i);
    const me = await sessionGET(req("/api/admin/session", { cookie: adminCookie }));
    expect((await me.json()).user).toEqual({ email: "admin@contoh.my", role: "admin" });
    const out = await sessionDELETE(
      req("/api/admin/session", { method: "DELETE", cookie: adminCookie }),
    );
    expect(out.headers.get("set-cookie")).toMatch(/Max-Age=0/i);
  });

  it("kata laluan salah: mesej generik, audit, dan had cubaan", async () => {
    const bad = await login("admin@contoh.my", "salah-kata-laluan-xx");
    expect(bad.res.status).toBe(401);
    expect((await bad.res.json()).error.message).toBe("Emel atau kata laluan tidak sah.");
    const unknown = await login("tiada@contoh.my", "salah-kata-laluan-xx");
    expect((await unknown.res.json()).error.message).toBe("Emel atau kata laluan tidak sah.");
    for (let i = 0; i < 4; i++) await login("admin@contoh.my", "salah-kata-laluan-xx");
    expect((await login("admin@contoh.my")).res.status).toBe(429);
    const audit: Json = await (
      await auditGET(req("/api/admin/audit?month=2026-10", { cookie: reviewerCookie }))
    ).json();
    expect(audit.events.length).toBeGreaterThan(0);
  });

  it("permintaan merentas asal ditolak walaupun kuki sah", async () => {
    const res = await draftsPOST(
      req("/api/admin/drafts", {
        method: "POST",
        cookie: adminCookie,
        origin: "https://jahat.example",
        body: { seasonId: "1448H", pjhId: "busyra" },
      }),
    );
    expect(res.status).toBe(403);
    const noOrigin = await draftsPOST(
      req("/api/admin/drafts", {
        method: "POST",
        cookie: adminCookie,
        origin: null,
        body: { seasonId: "1448H", pjhId: "busyra" },
      }),
    );
    expect(noOrigin.status).toBe(403);
  });
});

async function openBusyra(cookie: string) {
  const res = await draftsPOST(
    req("/api/admin/drafts", {
      method: "POST",
      cookie,
      body: { seasonId: "1448H", pjhId: "busyra" },
    }),
  );
  expect(res.status).toBe(200);
  const got: Json = await (
    await draftGET(
      req("/api/admin/drafts/1448H/busyra", { cookie }),
      params({ season: "1448H", pjh: "busyra" }),
    )
  ).json();
  return got;
}

const scenarioA = {
  seasonId: "1448H",
  rooms: [{ pilgrims: 2, makkah: 2, madinah: 2, aziziyah: 2 }],
  budget: { perPersonRM: "RM100,000" },
  aziziyah: { mode: "required", acceptConditional: true },
  pmn: "required",
  tarwiyah: { mode: "required", acceptConditional: true },
  duration: { target: 40, tolerance: 0, acceptApproximate: true },
};

describe("draf → semakan → terbit → rollback (DoD 10)", () => {
  it("aliran penuh mengekalkan sejarah tanpa pendua", async () => {
    const d = await openBusyra(reviewerCookie);
    expect(d.validation.ok).toBe(true);
    expect(d.diff).toEqual([]);
    const pkg = d.draft.file.packages.find((p: Json) =>
      p.variants.some((v: Json) => v.code === "MTSP02"),
    );
    const v = pkg.variants.find((x: Json) => x.code === "MTSP02");
    const key = {
      code: v.code,
      makkahOccupancy: v.makkahOccupancy,
      madinahOccupancy: v.madinahOccupancy,
      travellerCategory: "adult",
    };
    const variant = {
      ...key,
      aziziyahOccupancy: v.aziziyahOccupancy ?? null,
      priceSen: v.priceSen + 100_000,
      pmnStatus: v.pmnStatus,
      roomLabelAsPublished: v.roomLabelAsPublished ?? null,
      notes: v.notes ?? null,
    };
    const op = { op: "upsert_variant", packageId: pkg.id, original: key, variant };

    // Tanpa bukti → 422
    const noEv = await draftPATCH(
      req("/api/admin/drafts/1448H/busyra", {
        method: "PATCH",
        cookie: reviewerCookie,
        body: { etag: d.etag, ops: [op] },
      }),
      params({ season: "1448H", pjh: "busyra" }),
    );
    expect(noEv.status).toBe(422);
    // ETag lama → 409
    const edited = await draftPATCH(
      req("/api/admin/drafts/1448H/busyra", {
        method: "PATCH",
        cookie: reviewerCookie,
        body: {
          etag: d.etag,
          ops: [{ ...op, evidence: { pdfPage: 34, text: "MTSP02 RM 78,990 (ujian)" } }],
        },
      }),
      params({ season: "1448H", pjh: "busyra" }),
    );
    expect(edited.status).toBe(200);
    const stale = await draftPATCH(
      req("/api/admin/drafts/1448H/busyra", {
        method: "PATCH",
        cookie: reviewerCookie,
        body: { etag: d.etag, ops: [{ ...op, evidence: { pdfPage: 34, text: "x y z" } }] },
      }),
      params({ season: "1448H", pjh: "busyra" }),
    );
    expect(stale.status).toBe(409);

    const after: Json = await (
      await draftGET(
        req("/api/admin/drafts/1448H/busyra", { cookie: reviewerCookie }),
        params({ season: "1448H", pjh: "busyra" }),
      )
    ).json();
    expect(after.diff.map((x: Json) => x.text).join("\n")).toMatch(
      /MTSP02.*RM 77,990\.00 → RM 78,990\.00/,
    );

    // Terbit sebelum lulus semakan → 422; penyemak tidak boleh terbit → 403
    const early = await publishPOST(
      req("/api/admin/publish", {
        method: "POST",
        cookie: adminCookie,
        body: { seasonId: "1448H", pjhIds: ["busyra"] },
      }),
    );
    expect(early.status).toBe(422);
    const approve = await reviewPOST(
      req("/api/admin/drafts/1448H/busyra/review", {
        method: "POST",
        cookie: reviewerCookie,
        body: { etag: after.etag, action: "approve", notes: "Disemak dengan hlm. 34" },
      }),
      params({ season: "1448H", pjh: "busyra" }),
    );
    expect(approve.status).toBe(200);
    const byReviewer = await publishPOST(
      req("/api/admin/publish", {
        method: "POST",
        cookie: reviewerCookie,
        body: { seasonId: "1448H", pjhIds: ["busyra"] },
      }),
    );
    expect(byReviewer.status).toBe(403);

    const before: Json = await (
      await versionsGET(req("/api/admin/versions", { cookie: adminCookie }))
    ).json();
    const pub = await publishPOST(
      req("/api/admin/publish", {
        method: "POST",
        cookie: adminCookie,
        body: { seasonId: "1448H", pjhIds: ["busyra"] },
      }),
    );
    expect(pub.status).toBe(200);
    const out: Json = await pub.json();
    expect(out.result.status).toBe("published");
    expect(out.result.previousVersion).toBe(before.active.datasetVersion);

    // Katalog aktif kini menggunakan harga baharu
    const assessed: Json = await (
      await assessPOST(
        req("/api/assess", {
          method: "POST",
          body: {
            requirements: {
              ...scenarioA,
              rooms: [{ pilgrims: 2, makkah: 2, madinah: 2, aziziyah: null }],
            },
          },
        }),
      )
    ).json();
    expect(assessed.datasetVersion).toBe(out.result.datasetVersion);
    const mtsp = assessed.candidates.find(
      (c: Json) => c.package.id === pkg.id && c.assignments[0].variant.code === "MTSP02",
    );
    expect(mtsp.assignments[0].variant.price.text).toBe("RM 78,990.00");

    // Draf dibuang selepas terbit; liputan mengira varian yang diluluskan pentadbir
    expect(
      (await (await draftsGET(req("/api/admin/drafts", { cookie: adminCookie }))).json()).drafts,
    ).toEqual([]);
    const v2: Json = await (
      await versionsGET(req("/api/admin/versions", { cookie: adminCookie }))
    ).json();
    expect(v2.versions).toHaveLength(2);
    expect(v2.events.map((e: Json) => e.action)).toEqual([
      "publish",
      "activate",
      "publish",
      "activate",
    ]);

    // Rollback → versi asal aktif semula; tiada snapshot baharu
    const rb = await versionsPOST(
      req("/api/admin/versions", {
        method: "POST",
        cookie: adminCookie,
        body: { seasonId: "1448H", datasetVersion: before.active.datasetVersion },
      }),
    );
    expect(rb.status).toBe(200);
    const v3: Json = await (
      await versionsGET(req("/api/admin/versions", { cookie: adminCookie }))
    ).json();
    expect(v3.active.datasetVersion).toBe(before.active.datasetVersion);
    expect(v3.versions).toHaveLength(2);
    const again: Json = await (
      await assessPOST(
        req("/api/assess", {
          method: "POST",
          body: {
            requirements: {
              ...scenarioA,
              rooms: [{ pilgrims: 2, makkah: 2, madinah: 2, aziziyah: null }],
            },
          },
        }),
      )
    ).json();
    expect(
      again.candidates.find(
        (c: Json) => c.package.id === pkg.id && c.assignments[0].variant.code === "MTSP02",
      ).assignments[0].variant.price.text,
    ).toBe("RM 77,990.00");
  });

  it("draf basi ditolak jika fail aktif berubah sejak draf dibuka", async () => {
    const d = await openBusyra(adminCookie);
    const approve = await reviewPOST(
      req("/api/admin/drafts/1448H/busyra/review", {
        method: "POST",
        cookie: adminCookie,
        body: { etag: d.etag, action: "approve", notes: null },
      }),
      params({ season: "1448H", pjh: "busyra" }),
    );
    expect(approve.status).toBe(200);
    // Perubahan lain diterbitkan terus (cth. seed baharu)
    const files = structuredClone(repo.raw);
    files.find((f) => f.pjh.id === "busyra")!.packages[0].name += " (dikemas kini)";
    await publishCatalog(store.kv, {
      seasonId: "1448H",
      files,
      coverage: repo.coverage,
      actor: "lain",
      now: new Date(),
    });
    invalidateActiveCatalog();
    const pub = await publishPOST(
      req("/api/admin/publish", {
        method: "POST",
        cookie: adminCookie,
        body: { seasonId: "1448H", pjhIds: ["busyra"] },
      }),
    );
    expect(pub.status).toBe(422);
    expect(JSON.stringify(await pub.json())).toMatch(/telah berubah sejak draf dibuka/);
  });

  it("penyemak tidak boleh menukar kelulusan PJH; buang draf berfungsi", async () => {
    const d = await openBusyra(reviewerCookie);
    const res = await draftPATCH(
      req("/api/admin/drafts/1448H/busyra", {
        method: "PATCH",
        cookie: reviewerCookie,
        body: {
          etag: d.etag,
          ops: [
            {
              op: "set_approval",
              status: "verified_approved",
              officialSource: "Senarai TH",
              officialReference: null,
            },
          ],
        },
      }),
      params({ season: "1448H", pjh: "busyra" }),
    );
    expect(res.status).toBe(422);
    const del = await draftDELETE(
      req("/api/admin/drafts/1448H/busyra", {
        method: "DELETE",
        cookie: reviewerCookie,
        body: { etag: d.etag },
      }),
      params({ season: "1448H", pjh: "busyra" }),
    );
    expect(del.status).toBe(200);
  });
});

describe("import", () => {
  it("CSV: baris sah dikemas kini dalam draf; ralat dilaporkan ikut baris", async () => {
    const pkgId = repo.raw.find((f) => f.pjh.id === "busyra")!.packages[0].id;
    const bad = await importPOST(
      req("/api/admin/import", {
        method: "POST",
        cookie: reviewerCookie,
        body: {
          kind: "csv",
          seasonId: "1448H",
          pjhId: "busyra",
          csv: `package_id,code,makkah,madinah,price_rm,pmn,pdf_page,evidence_text\n${pkgId},X1,2,2,abc,included,34,teks harga`,
        },
      }),
    );
    expect(bad.status).toBe(422);
    expect((await bad.json()).error.details[0]).toMatch(/^Baris 2: harga "abc"/);
    const good = await importPOST(
      req("/api/admin/import", {
        method: "POST",
        cookie: reviewerCookie,
        body: {
          kind: "csv",
          seasonId: "1448H",
          pjhId: "busyra",
          csv: `package_id,code,makkah,madinah,price_rm,pmn,pdf_page,evidence_text\n${pkgId},UJI02,2,2,"95,000",included,34,UJI02 RM95000`,
        },
      }),
    );
    expect(good.status).toBe(200);
    const body: Json = await good.json();
    expect(body.rows).toBe(1);
    expect(body.validation.ok).toBe(true);
  });

  it("JSON: fail musim lain ditolak; fail sah menjadi draf", async () => {
    const file = structuredClone(repo.raw.find((f) => f.pjh.id === "thts")!);
    const wrong = await importPOST(
      req("/api/admin/import", {
        method: "POST",
        cookie: reviewerCookie,
        body: { kind: "json", seasonId: "1448H", file: { ...file, seasonId: "1447H" } },
      }),
    );
    expect(wrong.status).toBe(422);
    const ok = await importPOST(
      req("/api/admin/import", {
        method: "POST",
        cookie: reviewerCookie,
        body: { kind: "json", seasonId: "1448H", file },
      }),
    );
    expect(ok.status).toBe(200);
    const again = await importPOST(
      req("/api/admin/import", {
        method: "POST",
        cookie: reviewerCookie,
        body: { kind: "json", seasonId: "1448H", file },
      }),
    );
    expect(again.status).toBe(422);
  });
});

describe("dokumen sumber", () => {
  const form = (bytes: Uint8Array | string, name: string, type: string) => {
    const f = new FormData();
    f.set(
      "file",
      new File([typeof bytes === "string" ? bytes : Buffer.from(bytes)], name, { type }),
    );
    return f;
  };
  const pdf = "%PDF-1.4\n1 0 obj << /Type /Page >> endobj\n%%EOF\n";

  it("menolak fail bukan PDF walaupun bernama .pdf", async () => {
    const res = await sourcesPOST(
      req("/api/admin/sources", {
        method: "POST",
        cookie: reviewerCookie,
        form: form("MZ\x90\x00 bukan pdf", "brosur.pdf", "application/pdf"),
      }),
    );
    expect(res.status).toBe(415);
    const typed = await sourcesPOST(
      req("/api/admin/sources", {
        method: "POST",
        cookie: reviewerCookie,
        form: form("hello", "a.txt", "text/plain"),
      }),
    );
    expect(typed.status).toBe(415);
  });

  it("menyimpan PDF ikut SHA-256, menolak pendua dan menyajikannya kepada pentadbir sahaja", async () => {
    const res = await sourcesPOST(
      req("/api/admin/sources", {
        method: "POST",
        cookie: reviewerCookie,
        form: form(pdf, "../Brosur Ujian.pdf", "application/pdf"),
      }),
    );
    expect(res.status).toBe(200);
    const { source }: Json = await res.json();
    expect(source.filename).toBe("Brosur_Ujian.pdf");
    expect(source.sha256).toMatch(/^[0-9a-f]{64}$/);
    const dup = await sourcesPOST(
      req("/api/admin/sources", {
        method: "POST",
        cookie: reviewerCookie,
        form: form(pdf, "lain.pdf", "application/pdf"),
      }),
    );
    expect(dup.status).toBe(409);
    const file = await sourceGET(
      req(`/api/admin/sources/${source.sha256}`, { cookie: reviewerCookie }),
      params({ sha: source.sha256 }),
    );
    expect(file.status).toBe(200);
    expect(file.headers.get("content-type")).toBe("application/pdf");
    const anon = await sourceGET(
      req(`/api/admin/sources/${source.sha256}`),
      params({ sha: source.sha256 }),
    );
    expect(anon.status).toBe(401);
  });
});

describe("musim", () => {
  it("pentadbir boleh menambah musim; penyemak tidak", async () => {
    const season = {
      id: "1449H",
      hijriYear: 1449,
      gregorianYear: 2028,
      label: "Musim Haji 1449H / 2028M",
      active: false,
    };
    expect(
      (
        await seasonsPOST(
          req("/api/admin/seasons", { method: "POST", cookie: reviewerCookie, body: season }),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await seasonsPOST(
          req("/api/admin/seasons", { method: "POST", cookie: adminCookie, body: season }),
        )
      ).status,
    ).toBe(200);
    const pub: Json = await (await publicSeasonsGET()).json();
    expect(pub.seasons.map((s: Json) => s.id)).toEqual(["1449H", "1448H"]);
  });
});

describe("pengerasan keselamatan (semakan bebas)", () => {
  it("laluan stor dengan .., # atau %2F ditolak (tiada bacaan admin/users.json)", async () => {
    const traversal = await versionsGET(
      req("/api/admin/versions?season=..%2Fadmin%2Fusers.json%23", { cookie: reviewerCookie }),
    );
    expect(traversal.status).toBe(400);
    expect(await traversal.text()).not.toContain("passwordHash");
    const listing = await draftsGET(
      req("/api/admin/drafts?season=../admin", { cookie: reviewerCookie }),
    );
    expect(listing.status).toBe(400);
    for (const p of [
      { season: "../admin", pjh: "users" },
      { season: "1448H", pjh: "../../admin/users" },
      { season: "1448H", pjh: "busyra#x" },
    ]) {
      const res = await draftGET(
        req("/api/admin/drafts/x/y", { cookie: reviewerCookie }),
        params(p),
      );
      expect(res.status).toBe(400);
    }
    await expect(store.kv.getJSON("catalog/../admin/users.json#/active.json")).rejects.toThrow(
      /Laluan stor tidak sah/,
    );
  });

  it("penyemak tidak boleh mengubah metadata kelulusan melalui editor JSON", async () => {
    const d = await openBusyra(adminCookie);
    const approved = await draftPATCH(
      req("/api/admin/drafts/1448H/busyra", {
        method: "PATCH",
        cookie: adminCookie,
        body: {
          etag: d.etag,
          ops: [
            {
              op: "set_approval",
              status: "verified_approved",
              officialSource: "Senarai TH 1448H",
              officialReference: null,
            },
          ],
        },
      }),
      params({ season: "1448H", pjh: "busyra" }),
    );
    expect(approved.status).toBe(200);
    const cur: Json = await (
      await draftGET(
        req("/api/admin/drafts/1448H/busyra", { cookie: reviewerCookie }),
        params({ season: "1448H", pjh: "busyra" }),
      )
    ).json();
    const file = structuredClone(cur.draft.file);
    file.pjh.approval.verifiedBy = "ketua@contoh.my (admin)";
    file.pjh.approval.officialSource = "Sumber palsu";
    const forged = await draftPATCH(
      req("/api/admin/drafts/1448H/busyra", {
        method: "PATCH",
        cookie: reviewerCookie,
        body: { etag: cur.etag, ops: [{ op: "replace_file", file }] },
      }),
      params({ season: "1448H", pjh: "busyra" }),
    );
    expect(forged.status).toBe(422);
  });

  it("letusan log masuk serentak tidak melepasi had cubaan", async () => {
    const burst = await Promise.all(
      Array.from({ length: 12 }, () => login("admin@contoh.my", "salah-kata-laluan-xx")),
    );
    let checked = burst.filter((r) => r.res.status === 401).length;
    expect(burst.filter((r) => r.res.status === 429).length).toBeGreaterThan(0);
    // Teruskan secara berurutan: jumlah kata laluan salah yang benar-benar disemak ≤ 5.
    for (let i = 0; i < 10; i++) {
      const r = await login("admin@contoh.my", "salah-kata-laluan-xx");
      if (r.res.status === 401) checked++;
      else expect(r.res.status).toBe(429);
    }
    expect(checked).toBe(5);
    expect((await login("admin@contoh.my")).res.status).toBe(429);
  });

  it("log keluar membatalkan token di pelayan, bukan sekadar kuki", async () => {
    const { cookie } = await login("semak@contoh.my");
    expect((await sessionGET(req("/api/admin/session", { cookie }))).status).toBe(200);
    await sessionDELETE(req("/api/admin/session", { method: "DELETE", cookie }));
    expect((await sessionGET(req("/api/admin/session", { cookie }))).status).toBe(401);
  });

  it("badan permintaan terlalu besar ditolak sebelum diproses", async () => {
    const res = await sessionPOST(
      req("/api/admin/session", {
        method: "POST",
        body: { email: "a@b.my", password: "x".repeat(50_000) },
      }),
    );
    expect(res.status).toBe(413);
  });

  it("pengguna tidak boleh mendaftar atau membuang fail muat naik pengguna lain", async () => {
    const res = await registerPOST(
      req("/api/admin/sources/register", {
        method: "POST",
        cookie: reviewerCookie,
        body: { pathname: "uploads/0123456789abcdef/brosur-abc.pdf", filename: "brosur.pdf" },
      }),
    );
    expect(res.status).toBe(403);
  });
});
