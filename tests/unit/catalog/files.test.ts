import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { coverageEntry } from "@/lib/catalog/coverage";
import { toEngineCatalog } from "@/lib/catalog/load";
import type { PjhCatalogFile } from "@/lib/catalog/schema";
import { validateCatalogFile, type PageIndexEntry } from "@/lib/catalog/validate";

import coverage from "../../../data/catalog-coverage.json";
import manifest from "../../../data/sources/manifest.json";

const dir = join(__dirname, "../../../data/catalog/1448h");
const pageIndex = manifest.sources[0].page_index!.pjhs as (PageIndexEntry & {
  index: number;
  label: string;
})[];
const ids = readdirSync(dir)
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(/\.json$/, ""));
const reports = new Map(
  ids.map((id) => [
    id,
    validateCatalogFile(JSON.parse(readFileSync(join(dir, `${id}.json`), "utf8")), id, pageIndex),
  ]),
);

describe("Fail katalog data/catalog/1448h", () => {
  it.each(ids)("%s lulus skema dan semakan integriti", (id) => {
    const r = reports.get(id)!;
    expect(r.errors).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it("hanya mengandungi PJH dalam indeks sumber", () => {
    const known = new Set(pageIndex.map((p) => p.id));
    for (const id of ids) expect(known.has(id), id).toBe(true);
  });

  it("manifest liputan selaras dengan fail katalog (jalankan pnpm catalog:coverage)", () => {
    for (const p of pageIndex) {
      const expected = coverageEntry(
        {
          index: p.index,
          id: p.id,
          label: p.label,
          pageRange: [p.pdf_pages[0], p.pdf_pages[1]],
          seasonId: "1448H",
        },
        reports.get(p.id) ?? null,
      );
      const actual = coverage.pjhs.find((e) => e.id === p.id);
      expect(actual, p.id).toEqual(expected);
    }
  });
});

describe("Fixture rujukan Busyra (spesifikasi §12)", () => {
  const busyra = reports.get("busyra")!.file as PjhCatalogFile;
  const catalog = toEngineCatalog([busyra], "test");
  const price = (code: string) => catalog.variants.find((v) => v.code === code)!.priceSen;
  const aziziyahDouble = catalog.upgrades.find((u) => u.id === "busyra-aziziyah-bilik-berdua")!;

  it.each([
    ["MTSP02", 7_799_000n, 8_649_000n],
    ["SFSP02", 8_299_000n, 9_149_000n],
    ["MJPP02", 9_399_000n, 10_249_000n],
    ["MJP02", 8_599_000n, 9_449_000n],
  ])("%s: harga asas dan jumlah dengan Aziziyah berdua", (code, base, total) => {
    expect(price(code)).toBe(base);
    expect(aziziyahDouble.priceSen).toBe(850_000n);
    expect(aziziyahDouble.basis).toBe("per_person");
    expect(price(code)! + aziziyahDouble.priceSen!).toBe(total);
  });

  it("menanda Bayaran Haji PJH dan caj PMN sebagai sudah termasuk", () => {
    const included = catalog.charges.filter((c) => c.included).map((c) => c.id);
    expect(included).toEqual(expect.arrayContaining(["busyra-bayaran-haji-pjh", "busyra-caj-pmn"]));
  });

  it("menyimpan Tarwiyah dan Aziziyah sebagai bersyarat dan tempoh sebagai anggaran", () => {
    const pkg = catalog.packages.find((p) => p.id === "busyra-makkah-tower-standard-pmn")!;
    expect(pkg.tarwiyah.status).toBe("offered_subject_to_approval");
    expect(pkg.aziziyah.condition).toMatch(/kebenaran/i);
    expect(pkg.duration).toMatchObject({ value: 40, approximate: true, min: null, max: null });
    expect(catalog.pjhs[0].approvals[0].status).toBe("unverified");
  });
});
