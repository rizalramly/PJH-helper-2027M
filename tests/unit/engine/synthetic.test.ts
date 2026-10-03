// Kes struktur harga dan keadaan data yang tidak wujud dalam Busyra (fixture SINTETIK, season TEST).
import { describe, expect, it } from "vitest";

import { assess } from "@/lib/engine";
import { FORBIDDEN_WORDS } from "@/lib/engine/explain";

import { makeReq } from "../../fixtures/requirements";
import {
  synthCatalog,
  synthCharge,
  synthPackage,
  synthUpgrade,
  synthVariant,
} from "../../fixtures/synthetic-catalog";

const req = (o: Parameters<typeof makeReq>[0] = {}) => makeReq(o, "TEST");
const twoRooms = [
  { pilgrims: 2, makkah: 2, madinah: 2, aziziyah: null },
  { pilgrims: 2, makkah: 2, madinah: 2, aziziyah: null },
];

describe("DoD 6: kadar per bilik / per kumpulan / per malam", () => {
  const pkg = synthPackage("s-basis");
  const catalog = synthCatalog({
    packages: [pkg],
    variants: [synthVariant(pkg.id, "D2", 2, 1_000_000n)],
    charges: [
      synthCharge("c-person", [pkg.id], { basis: "per_person", priceSen: 10_000n }),
      synthCharge("c-room", [pkg.id], { basis: "per_room", priceSen: 20_000n }),
      synthCharge("c-group", [pkg.id], { basis: "per_group", priceSen: 30_000n }),
      synthCharge("c-night", [pkg.id], { basis: "per_night", priceSen: 1_000n, nightCount: 5 }),
    ],
  });
  it("tidak mendarab kadar per bilik/kumpulan/malam dengan bilangan jemaah", () => {
    const c = assess(catalog, req({ rooms: twoRooms })).candidates[0];
    const amount = (id: string) => c.cost.lines.find((l) => l.label.includes(id))!.amountSen;
    expect(amount("c-person")).toBe(40_000n); // 4 jemaah
    expect(amount("c-room")).toBe(40_000n); // 2 bilik
    expect(amount("c-group")).toBe(30_000n); // sekali
    expect(amount("c-night")).toBe(10_000n); // 5 malam × 2 bilik
    expect(c.cost.knownGroupSen).toBe(4_000_000n + 40_000n + 40_000n + 30_000n + 10_000n);
  });

  it("naik taraf per_night tanpa bilangan malam dikira Unpriced, bukan sifar", () => {
    const p = synthPackage("s-night");
    const cat = synthCatalog({
      packages: [p],
      variants: [synthVariant(p.id, "D2", 2, 1_000_000n)],
      upgrades: [
        synthUpgrade("u-night", [p.id], { basis: "per_night", priceSen: 5_000n, nightCount: null }),
      ],
    });
    const c = assess(cat, req({ rooms: [{ pilgrims: 2, makkah: 2, madinah: 2, aziziyah: 2 }] }))
      .candidates[0];
    expect(c.cost.complete).toBe(false);
    expect(c.cost.unpriced.length).toBe(1);
  });
});

describe("Senario F: data tidak lengkap", () => {
  const p = synthPackage("s-incomplete", {
    tarwiyah: { status: "not_stated", condition: null, description: null, evidence: [] },
  });
  const catalog = synthCatalog({
    packages: [p],
    variants: [synthVariant(p.id, "D2", 2, 5_000_000n)],
    upgrades: [synthUpgrade("u-az2", [p.id], { priceSen: null })],
  });

  it("harga naik taraf Aziziyah tidak diketahui → jumlah tidak lengkap dan perlu pengesahan", () => {
    const r = assess(catalog, req({ aziziyah: { mode: "required" } }));
    const c = r.candidates[0];
    expect(c.cost.complete).toBe(false);
    expect(c.requirements.find((x) => x.key === "budget")!.status).toBe("BERSYARAT");
    // Spesifikasi §7: naik taraf memenuhi syarat hanya jika harganya diketahui.
    expect(c.requirements.find((x) => x.key === "aziziyah_room")!.status).toBe("PERLU_PENGESAHAN");
    expect(c.group).toBe("needs_verification");
    expect(c.blockedFromPrimary).toBe(true);
    expect(r.recommendations.map((x) => x.label)).toEqual(["CALON_BERSYARAT"]);
  });

  it("Tarwiyah not_stated tidak lulus syarat Tarwiyah wajib", () => {
    const c = assess(catalog, req({ tarwiyah: { mode: "required", acceptConditional: true } }))
      .candidates[0];
    expect(c.requirements.find((x) => x.key === "tarwiyah")!.status).toBe("PERLU_PENGESAHAN");
    expect(c.group).toBe("needs_verification");
  });

  it("varian tanpa harga tidak dikira RM0", () => {
    const q = synthPackage("s-noprice");
    const cat = synthCatalog({ packages: [q], variants: [synthVariant(q.id, "D2", 2, null)] });
    const c = assess(cat, req()).candidates[0];
    expect(c.cost.complete).toBe(false);
    expect(c.cost.unpriced[0]).toMatch(/perlu pengesahan/);
    expect(c.assignments[0].perPersonSen).toBeNull();
  });
});

describe("DoD 8: katalog sifar padanan", () => {
  const a = synthPackage("s-over");
  const b = synthPackage("s-nopmn", { pjhId: "sintetik-b" });
  const catalog = synthCatalog({
    packages: [a, b],
    variants: [
      synthVariant(a.id, "D2", 2, 12_000_000n),
      synthVariant(b.id, "D2", 2, 9_000_000n, { pmnStatus: "not_included" }),
    ],
  });
  const r = assess(catalog, req({ pmn: "required" }));

  it("memberi mesej, sebab dan perubahan minimum tanpa melonggarkan syarat", () => {
    expect(r.groups.full_match).toEqual([]);
    expect(r.recommendations).toEqual([]);
    expect(r.noMatch!.message).toBe(
      "Tiada pakej yang memenuhi semua keperluan berdasarkan data tersedia",
    );
    expect(r.noMatch!.reasons.join(" ")).toMatch(/Bajet/);
    expect(r.noMatch!.reasons.join(" ")).toMatch(/PMN/);
    const over = r.noMatch!.nearest.find((n) => n.candidateId.startsWith("s-over"))!;
    expect(over.extraBudgetPerPersonSen).toBe(2_000_000n);
    expect(over.description).toMatch(/Tambah bajet RM 20,000.00 seorang/);
    const nopmn = r.noMatch!.nearest.find((n) => n.candidateId.startsWith("s-nopmn"))!;
    expect(nopmn.description).toMatch(/Longgarkan satu syarat: PMN/);
    // Keperluan asal kekal: PMN masih wajib dalam hasil.
    expect(r.candidates.every((c) => c.requirements.find((x) => x.key === "pmn")!.hard)).toBe(true);
  });
});

describe("DoD 9: ranking deterministik dan pemberat dinormalkan", () => {
  const pkgs = ["s1", "s2", "s3", "s4"].map((id, i) =>
    synthPackage(id, i === 3 ? { relocations: { count: null, note: null, evidence: [] } } : {}),
  );
  const variants = pkgs.map((p, i) =>
    synthVariant(p.id, "D2", 2, BigInt(6_000_000 + (i % 2) * 1_000_000)),
  );
  const catalog = synthCatalog({ packages: pkgs, variants });

  it("susunan sama walaupun susunan input berubah; tie-break mengikut ID", () => {
    const ids = assess(catalog, req()).candidates.map((c) => c.id);
    const shuffled = synthCatalog({
      packages: [...pkgs].reverse(),
      variants: [...variants].reverse(),
    });
    expect(assess(shuffled, req()).candidates.map((c) => c.id)).toEqual(ids);
    expect(ids.indexOf("s1::D2")).toBeLessThan(ids.indexOf("s3::D2"));
  });

  it("dimensi 'tidak kisah' digugurkan dan pemberat aktif dinormalkan", () => {
    const c = assess(catalog, req({ importance: { relocations: "dont_care" } })).candidates.find(
      (x) => x.id === "s1::D2",
    )!;
    expect(c.dimensions.map((d) => d.dimension)).toEqual(["savings"]);
    expect(c.score).toBe(40); // baki 40% bajet → utility 0.4 → 100 × 0.4
  });

  it("data hilang tidak menghasilkan skor atau liputan penuh", () => {
    const c = assess(catalog, req()).candidates.find((x) => x.id === "s4::D2")!;
    const reloc = c.dimensions.find((d) => d.dimension === "relocations")!;
    expect(reloc.known).toBe(false);
    expect(reloc.utility).toBe(0);
    expect(c.coverage).toBeLessThan(1);
    expect(c.score).toBeLessThan(100);
  });
});

describe("DoD 11 / 16: kelulusan dan kekosongan", () => {
  const a = synthPackage("s-unverified");
  const b = synthPackage("s-verified", { pjhId: "sintetik-b" });
  const sold = synthPackage("s-sold", {
    availability: { status: "sold_out", verifiedAt: null, note: null },
  });
  const catalog = synthCatalog({
    packages: [a, b, sold],
    variants: [
      synthVariant(a.id, "D2", 2, 6_000_000n),
      synthVariant(b.id, "D2", 2, 7_000_000n),
      synthVariant(sold.id, "D2", 2, 1_000_000n),
    ],
  });

  it("pakej habis tidak masuk cadangan aktif tetapi direkod dalam arkib", () => {
    const r = assess(catalog, req());
    expect(r.archived).toEqual(["s-sold"]);
    expect(r.candidates.map((c) => c.package.id)).not.toContain("s-sold");
  });

  it("PJH belum disahkan kekal dalam katalog tetapi boleh dikecualikan daripada cadangan", () => {
    const r = assess(catalog, req(), { requireVerifiedApproval: true });
    expect(r.candidates.map((c) => c.package.id)).toContain("s-unverified");
    expect(r.recommendations.every((x) => x.candidateId.startsWith("s-verified"))).toBe(true);
    const unverified = r.candidates.find((c) => c.package.id === "s-unverified")!;
    expect(unverified.approvalStatus).toBe("unverified");
    expect(unverified.uncertainties.join(" ")).toMatch(/kelulusan PJH .* belum disahkan/);
    expect(unverified.uncertainties.join(" ")).toMatch(/Kekosongan belum disahkan/);
  });

  it("kepelbagaian PJH memilih calon daripada PJH berbeza tanpa menyembunyikan calon lain", () => {
    const extra = synthPackage("s-unverified-2");
    const cat = synthCatalog({
      packages: [a, extra, b],
      variants: [
        synthVariant(a.id, "D2", 2, 6_000_000n),
        synthVariant(extra.id, "D2", 2, 6_500_000n),
        synthVariant(b.id, "D2", 2, 9_000_000n),
      ],
    });
    const plain = assess(cat, req({ proximity: { maxMakkahM: 50, maxMadinahM: null } }));
    const diverse = assess(cat, req({ proximity: { maxMakkahM: 50, maxMadinahM: null } }), {
      diversifyPjh: true,
    });
    const pjhOf = (id: string) => diverse.candidates.find((c) => c.id === id)!.pjh.id;
    expect(new Set(diverse.recommendations.map((x) => pjhOf(x.candidateId))).size).toBe(
      diverse.recommendations.length,
    );
    expect(diverse.candidates.length).toBe(plain.candidates.length);
  });

  it("tiada perkataan 'terjamin' dalam mana-mana teks", () => {
    const r = assess(catalog, req({ tarwiyah: { mode: "required", acceptConditional: true } }));
    expect(JSON.stringify(r, (_, v) => (typeof v === "bigint" ? v.toString() : v))).not.toMatch(
      FORBIDDEN_WORDS,
    );
  });
});

describe("Input", () => {
  it("menolak musim yang tidak sepadan supaya data musim tidak bercampur", () => {
    const r = assess(synthCatalog({}), makeReq({}, "1448H"));
    expect(r.inputErrors.join(" ")).toMatch(/tidak sepadan/);
  });
});

describe("Susunan Aziziyah khusus varian (aziziyahOccupancy)", () => {
  const p = synthPackage("s-azvar", {
    aziziyah: {
      status: "included",
      condition: null,
      defaultOccupancies: [5],
      defaultArrangementNote: null,
      labelAsPublished: null,
      dateLabel: null,
      nightCount: null,
      evidence: [],
    },
  });
  const catalog = synthCatalog({
    packages: [p],
    variants: [synthVariant(p.id, "D2-AZ4", 2, 6_000_000n, { aziziyahOccupancy: 4 })],
  });
  it("menggunakan susunan varian, bukan susunan pakej, tanpa caj naik taraf", () => {
    const c = assess(
      catalog,
      req({
        aziziyah: { mode: "required" },
        rooms: [{ pilgrims: 2, makkah: 2, madinah: 2, aziziyah: 4 }],
      }),
    ).candidates[0];
    expect(c.assignments[0].aziziyahRoom).toBe("default");
    expect(c.requirements.find((r) => r.key === "aziziyah_room")!.status).toBe("MEMENUHI");
    expect(c.cost.knownGroupSen).toBe(12_000_000n);
  });
  it("Aziziyah berdua tidak dipenuhi apabila varian ditetapkan ber-4 dan tiada naik taraf", () => {
    const c = assess(
      catalog,
      req({
        aziziyah: { mode: "required" },
        rooms: [{ pilgrims: 2, makkah: 2, madinah: 2, aziziyah: 2 }],
      }),
    ).candidates[0];
    expect(c.assignments[0].aziziyahRoom).toBe("not_offered");
    expect(c.group).toBe("not_matching");
  });
});
