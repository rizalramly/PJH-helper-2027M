// DoD 18: penilaian merentas katalog penuh 34 PJH (data transkripsi sebenar).
import { readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { toEngineCatalog } from "@/lib/catalog/load";
import { assess } from "@/lib/engine";
import { FORBIDDEN_WORDS } from "@/lib/engine/explain";

import { loadCatalogFiles } from "../../fixtures/busyra";
import { makeReq, scenarioA } from "../../fixtures/requirements";

const ids = readdirSync(join(__dirname, "../../../data/catalog/1448h"))
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(/\.json$/, ""));
const catalog = toEngineCatalog(loadCatalogFiles(ids), "test-full");
const pjhsIn = (r: ReturnType<typeof assess>, group: string) =>
  new Set(r.candidates.filter((c) => c.group === group).map((c) => c.pjh.id));

describe("Katalog penuh", () => {
  it("memuatkan semua PJH dalam katalog tanpa whitelist Busyra", () => {
    expect(catalog.pjhs.length).toBe(ids.length);
    const r = assess(catalog, makeReq({ budget: { perPersonSen: 50_000_000n } }));
    expect(new Set(r.candidates.map((c) => c.pjh.id)).size).toBeGreaterThan(20);
  });

  it("senario A: padanan penuh termasuk rujukan Busyra dan PJH lain; susunan ikut kumpulan", () => {
    const r = assess(catalog, scenarioA());
    const full = r.candidates.filter((c) => c.group === "full_match");
    expect(full.map((c) => c.assignments[0].variant.code)).toEqual(
      expect.arrayContaining(["MTSP02", "SFSP02"]),
    );
    expect(pjhsIn(r, "full_match").size).toBeGreaterThanOrEqual(2);
    const order = { full_match: 0, needs_verification: 1, not_matching: 2 };
    const groups = r.candidates.map((c) => order[c.group]);
    expect(groups).toEqual([...groups].sort((a, b) => a - b));
    for (const c of full) {
      expect(
        c.requirements
          .filter((x) => x.hard)
          .every((x) => x.status === "MEMENUHI" || x.status === "BERSYARAT"),
      ).toBe(true);
    }
  });

  it("struktur harga berlainan menghasilkan cadangan berbeza mengikut input", () => {
    const quad = assess(
      catalog,
      makeReq({
        rooms: [{ pilgrims: 1, makkah: 4, madinah: 4, aziziyah: null }],
        budget: { perPersonSen: 6_000_000n },
      }),
    );
    const a = assess(catalog, scenarioA());
    expect(pjhsIn(quad, "full_match").size).toBeGreaterThan(5);
    expect(quad.recommendations[0].candidateId).not.toBe(a.recommendations[0].candidateId);
  });

  it("Tarwiyah wajib tanpa terima syarat: tiada pakej bersyarat atau tidak dinyatakan dalam padanan penuh", () => {
    const r = assess(
      catalog,
      makeReq({
        rooms: [{ pilgrims: 3, makkah: 3, madinah: 3, aziziyah: null }],
        tarwiyah: { mode: "required", acceptConditional: false },
        budget: { perPersonSen: 30_000_000n },
      }),
    );
    for (const c of r.candidates.filter((c) => c.group === "full_match")) {
      expect(c.package.tarwiyah.status).toBe("offered");
    }
  });

  it("kepelbagaian PJH: setiap slot cadangan daripada PJH berbeza", () => {
    const r = assess(
      catalog,
      makeReq({
        rooms: [{ pilgrims: 1, makkah: 4, madinah: 4, aziziyah: null }],
        budget: { perPersonSen: 7_000_000n },
      }),
      { diversifyPjh: true },
    );
    const pjhs = r.recommendations.map(
      (x) => r.candidates.find((c) => c.id === x.candidateId)!.pjh.id,
    );
    expect(new Set(pjhs).size).toBe(pjhs.length);
  });

  it("bajet terlalu rendah: tiada padanan, sebab dan calon terdekat dengan tambahan bajet", () => {
    const r = assess(catalog, makeReq({ budget: { perPersonSen: 3_000_000n } }));
    expect(r.groups.full_match).toEqual([]);
    expect(r.noMatch!.nearest.length).toBeGreaterThan(0);
    expect(r.noMatch!.nearest[0].extraBudgetPerPersonSen).not.toBeNull();
  });

  it("kos sentiasa integer sen dan tiada perkataan terlarang dalam penjelasan", () => {
    const r = assess(catalog, scenarioA({ privateRoom: "preferred" }));
    for (const c of r.candidates) {
      expect(typeof c.cost.knownGroupSen).toBe("bigint");
      expect(
        [...c.reasons, ...c.compromises, ...c.uncertainties, ...c.questionsForPjh].join(" "),
      ).not.toMatch(FORBIDDEN_WORDS);
      expect(c.approvalStatus).toBe("unverified");
    }
  });

  it("deterministik merentas larian", () => {
    const a = assess(catalog, scenarioA()).candidates.map((c) => c.id);
    const b = assess(
      toEngineCatalog(loadCatalogFiles([...ids].reverse()), "test-full"),
      scenarioA(),
    ).candidates.map((c) => c.id);
    expect(b).toEqual(a);
  });
});
