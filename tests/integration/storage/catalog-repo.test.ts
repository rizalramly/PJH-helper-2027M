// DoD 10: penerbitan baharu mengekalkan sejarah dan menggantikan versi aktif tanpa pendua.
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { getActiveCatalog, invalidateActiveCatalog } from "@/lib/catalog/active";
import { readRepoCatalog } from "@/lib/catalog/repo-files";
import { listSeasons } from "@/lib/catalog/season-store";
import {
  activateVersion,
  getActivePointer,
  getActiveSnapshot,
  listAuditEvents,
  listDatasetVersions,
  publishCatalog,
} from "@/lib/storage/catalog-repo";
import { publicStore, requireStore, StoreUnavailableError } from "@/lib/storage/env";
import { ConflictError, MemoryKV } from "@/lib/storage/kv";

const repo = readRepoCatalog(join(__dirname, "../../.."), "1448H");
const T0 = new Date("2026-10-03T08:00:00Z");
const T1 = new Date("2026-10-04T08:00:00Z");
const base = { seasonId: "1448H", files: repo.raw, coverage: repo.coverage, actor: "ujian" };

/** Salinan katalog dengan harga satu varian Busyra berubah (meniru brosur baharu). */
function withChangedPrice() {
  const files = structuredClone(repo.raw);
  const busyra = files.find((f) => f.pjh.id === "busyra")!;
  busyra.packages[0].variants[0].priceSen =
    (busyra.packages[0].variants[0].priceSen ?? 0) + 100_000;
  return files;
}

describe("Katalog repo", () => {
  it("34 PJH sah dan manifest liputan selaras", () => {
    expect(repo.errors).toEqual([]);
    expect(repo.raw).toHaveLength(34);
  });
});

describe("publishCatalog / activateVersion (MemoryKV)", () => {
  it("menerbitkan snapshot, menetapkan penunjuk aktif dan merekod audit", async () => {
    const kv = new MemoryKV();
    const r = await publishCatalog(kv, { ...base, now: T0 });
    expect(r.status).toBe("published");
    const pointer = await getActivePointer(kv, "1448H");
    expect(pointer).toMatchObject({
      datasetVersion: r.datasetVersion,
      previousVersion: null,
      activatedBy: "ujian",
    });
    const snap = await getActiveSnapshot(kv, "1448H");
    expect(snap!.files).toHaveLength(34);
    expect((await listAuditEvents(kv)).map((e) => e.action)).toEqual(["publish", "activate"]);
  });

  it("idempotent: kandungan sama tidak mencipta versi atau audit baharu", async () => {
    const kv = new MemoryKV();
    const a = await publishCatalog(kv, { ...base, now: T0 });
    const b = await publishCatalog(kv, { ...base, now: T1 });
    expect(b).toEqual({ status: "unchanged", datasetVersion: a.datasetVersion });
    expect(await listDatasetVersions(kv, "1448H")).toEqual([a.datasetVersion]);
    expect(await listAuditEvents(kv)).toHaveLength(2);
  });

  it("brosur baharu menggantikan versi aktif dan mengekalkan sejarah; rollback tanpa pendua", async () => {
    const kv = new MemoryKV();
    const v1 = await publishCatalog(kv, { ...base, now: T0 });
    const v2 = await publishCatalog(kv, { ...base, files: withChangedPrice(), now: T1 });
    expect(v2.status).toBe("published");
    expect(v2.datasetVersion).not.toBe(v1.datasetVersion);
    expect(v2.status === "published" && v2.previousVersion).toBe(v1.datasetVersion);
    expect((await getActivePointer(kv, "1448H"))!.datasetVersion).toBe(v2.datasetVersion);
    expect((await listDatasetVersions(kv, "1448H")).sort()).toEqual(
      [v1.datasetVersion, v2.datasetVersion].sort(),
    );

    await activateVersion(kv, "1448H", v1.datasetVersion, "ujian", T1);
    expect((await getActivePointer(kv, "1448H"))!.datasetVersion).toBe(v1.datasetVersion);
    // Menerbitkan semula v1 tidak menduplikasi snapshot.
    expect((await publishCatalog(kv, { ...base, now: T1 })).status).toBe("unchanged");
    expect(await listDatasetVersions(kv, "1448H")).toHaveLength(2);
  });

  it("penulisan serentak dikesan: penunjuk lapuk ditolak dengan ConflictError", async () => {
    const kv = new MemoryKV();
    const v1 = await publishCatalog(kv, { ...base, now: T0 });
    const stale = await kv.getJSON<never>("catalog/1448h/active.json");
    await publishCatalog(kv, { ...base, files: withChangedPrice(), now: T1 });
    await expect(
      activateVersion(kv, "1448H", v1.datasetVersion, "ujian", T1, stale),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("menolak versi yang tidak wujud dan data musim bercampur", async () => {
    const kv = new MemoryKV();
    await expect(activateVersion(kv, "1448H", "ds-1448h-tiada", "ujian", T0)).rejects.toThrow(
      /tidak wujud/,
    );
    const mixed = structuredClone(repo.raw);
    mixed[0].seasonId = "1449H";
    await expect(publishCatalog(kv, { ...base, files: mixed, now: T0 })).rejects.toThrow(
      /musim lain/,
    );
  });
});

describe("getActiveCatalog", () => {
  it("memuatkan katalog aktif daripada stor dan cache ikut versi", async () => {
    const kv = new MemoryKV();
    const r = await publishCatalog(kv, { ...base, now: T0 });
    const spy = vi.spyOn(kv, "getJSON");
    const a = await getActiveCatalog("1448H", kv);
    expect(a.source).toBe("blob");
    expect(a.datasetVersion).toBe(r.datasetVersion);
    expect(a.catalog.pjhs).toHaveLength(34);
    expect(a.catalog.datasetVersion).toBe(r.datasetVersion);
    const calls = spy.mock.calls.length;
    const b = await getActiveCatalog("1448H", kv);
    expect(b).toBe(a);
    expect(spy.mock.calls.length).toBe(calls); // penunjuk dicache (TTL) dan snapshot dicache ikut versi
  });

  it("tanpa stor (pembangunan) membaca fail repo", async () => {
    const a = await getActiveCatalog("1448H", null);
    expect(a.source).toBe("repo");
    expect(a.catalog.pjhs).toHaveLength(34);
  });

  it("stor tanpa katalog diterbitkan (penggunaan baharu) membaca katalog asas repo", async () => {
    invalidateActiveCatalog();
    const a = await getActiveCatalog("1448H", new MemoryKV());
    expect(a.source).toBe("repo");
    expect(a.catalog.pjhs).toHaveLength(34);
  });

  it("tanpa katalog aktif dan tanpa fail repo memberi ralat yang jelas", async () => {
    await expect(getActiveCatalog("1449H", new MemoryKV())).rejects.toThrow(/Tiada katalog aktif/);
  });
});

describe("production tanpa BLOB_READ_WRITE_TOKEN", () => {
  it("halaman awam guna katalog asas repo; fungsi pentadbir memberi ralat konfigurasi", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "");
    vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(publicStore()).toBeNull();
      const a = await getActiveCatalog("1448H");
      expect(a.source).toBe("repo");
      expect((await listSeasons()).map((s) => s.id)).toContain("1448H");
      expect(() => requireStore()).toThrow(StoreUnavailableError);
    } finally {
      vi.unstubAllEnvs();
      vi.restoreAllMocks();
    }
  });
});
