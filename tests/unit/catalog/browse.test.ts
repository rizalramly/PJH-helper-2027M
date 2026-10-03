import { readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { browsePjh, pjhOptions } from "@/lib/catalog/browse";
import { toEngineCatalog } from "@/lib/catalog/load";

import { loadCatalogFiles } from "../../fixtures/busyra";
import { synthCatalog, synthPackage, synthVariant } from "../../fixtures/synthetic-catalog";

describe("Semak pakej (browsePjh)", () => {
  it("menyusun pakej dari harga terendah ke paling premium; tanpa harga di akhir", () => {
    const cat = synthCatalog({
      packages: [synthPackage("premium"), synthPackage("asas"), synthPackage("tiada-harga")],
      variants: [
        synthVariant("premium", "P2", 2, 15_000_000n),
        synthVariant("premium", "P4", 4, 12_000_000n),
        synthVariant("asas", "A4", 4, 6_000_000n),
        synthVariant("asas", "A2", 2, null),
        synthVariant("tiada-harga", "T2", 2, null),
      ],
    });
    const r = browsePjh(cat, "sintetik-a")!;
    expect(r.packages.map((p) => p.pkg.id)).toEqual(["asas", "premium", "tiada-harga"]);
    expect(r.packages[1].from?.code).toBe("P4");
    expect(r.packages[1].variants.map((v) => v.code)).toEqual(["P4", "P2"]);
    expect(r.packages[0].variants.map((v) => v.code)).toEqual(["A4", "A2"]);
    expect(r.packages[2].from).toBeNull();
    expect(browsePjh(cat, "tiada")).toBeNull();
  });

  it("katalog sebenar: semua 34 PJH boleh dipilih; Busyra disusun menaik ikut harga", () => {
    const ids = readdirSync(join(__dirname, "../../../data/catalog/1448h"))
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(/\.json$/, ""));
    const cat = toEngineCatalog(loadCatalogFiles(ids), "test");
    expect(pjhOptions(cat)).toHaveLength(34);
    const r = browsePjh(cat, "busyra")!;
    expect(r.packages.length).toBeGreaterThan(1);
    const prices = r.packages.map((p) => p.from?.priceSen ?? null).filter((x) => x !== null);
    expect([...prices].sort((a, b) => (a! < b! ? -1 : a! > b! ? 1 : 0))).toEqual(prices);
  });
});
