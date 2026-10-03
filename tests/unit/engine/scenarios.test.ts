// Senario penerimaan spesifikasi §13 pada fixture rujukan Busyra (data sebenar daripada PDF).
import { describe, expect, it } from "vitest";

import { assess } from "@/lib/engine";
import { FORBIDDEN_WORDS } from "@/lib/engine/explain";
import type { AssessmentResult, Candidate } from "@/lib/engine/types";

import { busyraCatalog } from "../../fixtures/busyra";
import { makeReq, scenarioA } from "../../fixtures/requirements";

const catalog = busyraCatalog();
const byCode = (r: AssessmentResult, code: string) =>
  r.candidates.find((c) => c.assignments.some((a) => a.variant.code === code)) as Candidate;
const status = (c: Candidate, key: string) => c.requirements.find((r) => r.key === key)?.status;
const allText = (r: AssessmentResult) =>
  JSON.stringify(r, (_, v) => (typeof v === "bigint" ? v.toString() : v));

describe("Senario A: pasangan, bajet RM100,000 seorang", () => {
  const r = assess(catalog, scenarioA());

  it.each([
    ["MTSP02", 17_298_000n, 2_702_000n],
    ["SFSP02", 18_298_000n, 1_702_000n],
    ["MJPP02", 20_498_000n, -498_000n],
  ])("%s: jumlah pasangan dan baki bajet tepat", (code, total, remaining) => {
    const c = byCode(r, code);
    expect(c.cost.knownGroupSen).toBe(total);
    expect(c.cost.remainingSen).toBe(remaining);
    expect(c.cost.complete).toBe(true);
  });

  it("kos seorang termasuk Aziziyah berdua tanpa caj PMN/TH berganda", () => {
    expect(byCode(r, "MTSP02").assignments[0].perPersonSen).toBe(8_649_000n);
    expect(byCode(r, "SFSP02").assignments[0].perPersonSen).toBe(9_149_000n);
    expect(byCode(r, "MJPP02").assignments[0].perPersonSen).toBe(10_249_000n);
    expect(byCode(r, "MJP02").assignments[0].perPersonSen).toBe(9_449_000n);
    const included = byCode(r, "MTSP02").cost.lines.filter((l) => l.kind === "included");
    expect(included.every((l) => l.amountSen === 0n)).toBe(true);
    expect(included.map((l) => l.label).join(" ")).toMatch(/Bayaran Haji PJH.*sudah termasuk/);
  });

  it("MTSP02 dan SFSP02 memenuhi syarat wajib; MJPP02 melebihi bajet; MJP02 gagal PMN", () => {
    expect(byCode(r, "MTSP02").group).toBe("full_match");
    expect(byCode(r, "SFSP02").group).toBe("full_match");
    expect(byCode(r, "MJPP02").group).toBe("not_matching");
    expect(status(byCode(r, "MJPP02"), "budget")).toBe("TIDAK_MEMENUHI");
    const mjp = byCode(r, "MJP02");
    expect(mjp.group).toBe("not_matching");
    expect(status(mjp, "pmn")).toBe("TIDAK_MEMENUHI");
    expect(status(mjp, "budget")).toBe("MEMENUHI");
  });

  it("mengekalkan label bersyarat dan tidak menggunakan perkataan 'terjamin'", () => {
    const c = byCode(r, "MTSP02");
    expect(status(c, "tarwiyah")).toBe("BERSYARAT");
    expect(status(c, "aziziyah")).toBe("BERSYARAT");
    expect(status(c, "duration")).toBe("BERSYARAT");
    expect(c.uncertainties.join(" ")).toMatch(/Kekosongan belum disahkan/);
    expect(c.uncertainties.join(" ")).toMatch(/kelulusan PJH/);
    expect(allText(r)).not.toMatch(FORBIDDEN_WORDS);
  });

  it("memberi cadangan utama daripada kumpulan padanan penuh", () => {
    const primary = r.recommendations.find((x) => x.label === "CADANGAN_UTAMA");
    expect(primary).toBeDefined();
    expect(r.groups.full_match).toContain(primary!.candidateId);
    expect(r.noMatch).toBeNull();
  });
});

describe("Senario B: Tarwiyah wajib tanpa menerima syarat", () => {
  const r = assess(
    catalog,
    scenarioA({ tarwiyah: { mode: "required", acceptConditional: false } }),
  );
  it("tiada pakej Busyra bersyarat menjadi padanan penuh dan syarat tidak diubah", () => {
    expect(r.groups.full_match).toEqual([]);
    expect(status(byCode(r, "MTSP02"), "tarwiyah")).toBe("TIDAK_MEMENUHI");
    expect(r.noMatch?.message).toBe(
      "Tiada pakej yang memenuhi semua keperluan berdasarkan data tersedia",
    );
  });
});

describe("Senario C: Aziziyah tidak mahu", () => {
  const r = assess(
    catalog,
    makeReq({
      aziziyah: { mode: "not_wanted" },
      rooms: [{ pilgrims: 2, makkah: 2, madinah: 2, aziziyah: null }],
    }),
  );
  it("semua pakej Busyra tidak memenuhi kerana Aziziyah termasuk", () => {
    expect(r.groups.full_match).toEqual([]);
    for (const c of r.candidates) expect(status(c, "aziziyah")).toBe("TIDAK_MEMENUHI");
    expect(r.noMatch).not.toBeNull();
  });
});

describe("Senario D: maksimum 30 hari", () => {
  const r = assess(
    catalog,
    makeReq({ duration: { max: 30, acceptApproximate: true, hard: true } }),
  );
  it("varian ±40 hari tidak memenuhi; VIP ±25 hari lulus tempoh tetapi melebihi bajet", () => {
    expect(status(byCode(r, "MTSP02"), "duration")).toBe("TIDAK_MEMENUHI");
    const vip = byCode(r, "VIP02");
    expect(status(vip, "duration")).toBe("BERSYARAT");
    expect(status(vip, "budget")).toBe("TIDAK_MEMENUHI");
    expect(r.groups.full_match).toEqual([]);
  });
});

describe("Senario E: tiga jemaah, bilik bertiga", () => {
  it("menggunakan varian bertiga sebenar dan caj Aziziyah bertiga hanya apabila dipilih", () => {
    const withAz = assess(
      catalog,
      makeReq({
        rooms: [{ pilgrims: 3, makkah: 3, madinah: 3, aziziyah: 3 }],
        budget: { perPersonSen: 20_000_000n },
      }),
    );
    const c = byCode(withAz, "MTSP03");
    expect(c.cost.knownGroupSen).toBe((7_199_000n + 750_000n) * 3n);
    const noAz = assess(
      catalog,
      makeReq({
        rooms: [{ pilgrims: 3, makkah: 3, madinah: 3, aziziyah: null }],
        budget: { perPersonSen: 20_000_000n },
      }),
    );
    expect(byCode(noAz, "MTSP03").cost.knownGroupSen).toBe(7_199_000n * 3n);
  });

  it("menolak tiga orang dalam bilik berdua dan pakej tanpa harga bilik yang diminta", () => {
    const bad = assess(
      catalog,
      makeReq({ rooms: [{ pilgrims: 3, makkah: 2, madinah: 2, aziziyah: null }] }),
    );
    expect(bad.inputErrors.join(" ")).toMatch(/tidak muat/);
    expect(bad.candidates).toEqual([]);
    const six = assess(
      catalog,
      makeReq({ rooms: [{ pilgrims: 6, makkah: 6, madinah: 6, aziziyah: null }] }),
    );
    expect(six.rejected.map((x) => x.packageId)).toContain("busyra-menara-jam-premium-pmn");
    expect(six.candidates.map((c) => c.assignments[0].variant.code).sort()).toEqual([
      "MTE06",
      "MTS06",
    ]);
  });

  it("mengira lima jemaah (2 + 3) dengan varian berbeza bagi setiap bilik", () => {
    const r = assess(
      catalog,
      makeReq({
        rooms: [
          { pilgrims: 2, makkah: 2, madinah: 2, aziziyah: null },
          { pilgrims: 3, makkah: 3, madinah: 3, aziziyah: null },
        ],
        budget: { perPersonSen: 20_000_000n },
      }),
    );
    const c = r.candidates.find((x) => x.package.id === "busyra-makkah-tower-standard-pmn")!;
    expect(c.assignments.map((a) => a.variant.code)).toEqual(["MTSP02", "MTSP03"]);
    expect(c.cost.knownGroupSen).toBe(7_799_000n * 2n + 7_199_000n * 3n);
    expect(c.cost.budgetGroupSen).toBe(20_000_000n * 5n);
  });
});

describe("DoD 3: bilik Aziziyah tidak mengikut bilik Makkah", () => {
  it("bilik Makkah ber-4 dengan Aziziyah berdua dikenakan naik taraf; bilik berdua tanpa pilihan Aziziyah tidak", () => {
    const quadWithAzDouble = assess(
      catalog,
      makeReq({ rooms: [{ pilgrims: 2, makkah: 4, madinah: 4, aziziyah: 2 }] }),
    );
    const c = byCode(quadWithAzDouble, "MTSP04");
    expect(c.assignments[0].aziziyahRoom).toBe("upgrade");
    expect(c.cost.knownGroupSen).toBe((6_799_000n + 850_000n) * 2n);
    const doubleNoAz = assess(
      catalog,
      makeReq({ rooms: [{ pilgrims: 2, makkah: 2, madinah: 2, aziziyah: null }] }),
    );
    expect(byCode(doubleNoAz, "MTSP02").assignments[0].aziziyahRoom).toBe("not_requested");
    expect(byCode(doubleNoAz, "MTSP02").cost.knownGroupSen).toBe(7_799_000n * 2n);
  });

  it("Aziziyah ber-4 mengikut susunan asal ber-4/5/6 perlu pengesahan", () => {
    const r = assess(
      catalog,
      makeReq({
        aziziyah: { mode: "required" },
        rooms: [{ pilgrims: 2, makkah: 2, madinah: 2, aziziyah: 4 }],
      }),
    );
    const c = byCode(r, "MTSP02");
    expect(c.assignments[0].aziziyahRoom).toBe("default");
    expect(status(c, "aziziyah_room")).toBe("PERLU_PENGESAHAN");
    expect(c.group).toBe("needs_verification");
  });
});
