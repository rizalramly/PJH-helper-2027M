// Regresi bagi penemuan semakan kod bebas Fasa 9 (engine dan katalog).
import { readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { toEngineCatalog } from "@/lib/catalog/load";
import { assess } from "@/lib/engine";

import { loadCatalogFiles } from "../../fixtures/busyra";
import { makeReq } from "../../fixtures/requirements";
import {
  synthCatalog,
  synthPackage,
  synthUpgrade,
  synthVariant,
} from "../../fixtures/synthetic-catalog";

const ids = readdirSync(join(__dirname, "../../../data/catalog/1448h"))
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(/\.json$/, ""));
const full = toEngineCatalog(loadCatalogFiles(ids), "test-full");
const req = (o: Parameters<typeof makeReq>[0] = {}) => makeReq(o, "TEST");
const azReq = (status: string) => (c: ReturnType<typeof assess>["candidates"][number]) =>
  c.requirements.find((r) => r.key === "aziziyah_room")?.status === status;

describe("Pemilihan varian mengikut bilik Aziziyah yang diminta", () => {
  it("memilih varian Aziziyah ber-2 walaupun varian ber-4 lebih murah", () => {
    const r = assess(
      full,
      makeReq({
        rooms: [{ pilgrims: 2, makkah: 2, madinah: 2, aziziyah: 2 }],
        aziziyah: { mode: "required", acceptConditional: true },
        budget: { perPersonSen: 20_000_000n },
      }),
    );
    const c = r.candidates.find((x) => x.package.id === "amani-safwah-standard-pmn")!;
    expect(c.assignments[0].variant.code).toBe("ASDN2");
    expect(c.requirements.find((x) => x.key === "aziziyah_room")!.status).toBe("MEMENUHI");
  });

  it("tanpa permintaan Aziziyah, varian termurah dipilih", () => {
    const r = assess(
      full,
      makeReq({
        rooms: [{ pilgrims: 2, makkah: 2, madinah: 2, aziziyah: null }],
        budget: { perPersonSen: 20_000_000n },
      }),
    );
    const c = r.candidates.find((x) => x.package.id === "amani-safwah-standard-pmn")!;
    expect(c.assignments[0].variant.code).toBe("ASDA4N2");
  });

  it("ID varian unik merentas katalog penuh (5/4 dan 5/5 tidak bertembung)", () => {
    expect(new Set(full.variants.map((v) => v.id)).size).toBe(full.variants.length);
  });
});

describe("Naik taraf Aziziyah: syarat, kekosongan dan susunan tidak diketahui", () => {
  const room = [{ pilgrims: 2, makkah: 2, madinah: 2, aziziyah: 2 }];
  const pkg = synthPackage("s-az");

  it("naik taraf bersyarat tidak memenuhi jika pengguna tidak menerima syarat; teks syarat dikekalkan", () => {
    const cat = synthCatalog({
      packages: [pkg],
      variants: [synthVariant(pkg.id, "D2", 2, 1_000_000n)],
      upgrades: [synthUpgrade("u-cond", [pkg.id], { condition: "Tertakluk kepada kekosongan" })],
    });
    const no = assess(
      cat,
      req({ rooms: room, aziziyah: { mode: "required", acceptConditional: false } }),
    );
    expect(azReq("TIDAK_MEMENUHI")(no.candidates[0])).toBe(true);
    const yes = assess(
      cat,
      req({ rooms: room, aziziyah: { mode: "required", acceptConditional: true } }),
    );
    const r = yes.candidates[0].requirements.find((x) => x.key === "aziziyah_room")!;
    expect(r.status).toBe("BERSYARAT");
    expect(r.detail).toContain("Tertakluk kepada kekosongan");
  });

  it("naik taraf yang habis tidak digunakan", () => {
    const cat = synthCatalog({
      packages: [pkg],
      variants: [synthVariant(pkg.id, "D2", 2, 1_000_000n)],
      upgrades: [synthUpgrade("u-habis", [pkg.id], { availability: "sold_out" })],
    });
    const r = assess(cat, req({ rooms: room, aziziyah: { mode: "required" } }));
    expect(azReq("TIDAK_MEMENUHI")(r.candidates[0])).toBe(true);
    expect(r.candidates[0].cost.lines.some((l) => l.kind === "upgrade")).toBe(false);
  });

  it("susunan asal tidak dinyatakan dan tiada naik taraf → perlu pengesahan, bukan tidak memenuhi", () => {
    const unknown = synthPackage("s-az-unknown", {
      aziziyah: { ...pkg.aziziyah, defaultOccupancies: null },
    });
    const cat = synthCatalog({
      packages: [unknown],
      variants: [synthVariant(unknown.id, "D2", 2, 1_000_000n)],
    });
    const r = assess(cat, req({ rooms: room, aziziyah: { mode: "required" } }));
    expect(azReq("PERLU_PENGESAHAN")(r.candidates[0])).toBe(true);
    expect(r.candidates[0].group).toBe("needs_verification");
  });

  it("'Mahu pakej tanpa Aziziyah' tidak mengenakan caj naik taraf", () => {
    const optional = synthPackage("s-az-opt", {
      aziziyah: { ...pkg.aziziyah, status: "optional" },
    });
    const cat = synthCatalog({
      packages: [optional],
      variants: [synthVariant(optional.id, "D2", 2, 1_000_000n)],
      upgrades: [synthUpgrade("u-opt", [optional.id], {})],
    });
    const r = assess(cat, req({ rooms: room, aziziyah: { mode: "not_wanted" } }));
    expect(r.candidates[0].cost.lines.some((l) => l.kind === "upgrade")).toBe(false);
    expect(r.candidates[0].cost.knownGroupSen).toBe(2_000_000n);
  });
});

describe("Tempoh julat anggaran dan utiliti bersyarat", () => {
  it("julat ±40–45 hari tidak 'memenuhi' jika pengguna tidak menerima anggaran", () => {
    const p = synthPackage("s-range", {
      duration: {
        value: null,
        min: 40,
        max: 45,
        approximate: true,
        evidence: synthPackage("x").duration.evidence,
      },
    });
    const cat = synthCatalog({
      packages: [p],
      variants: [synthVariant(p.id, "D2", 2, 1_000_000n)],
    });
    const dur = (accept: boolean) =>
      assess(
        cat,
        req({ duration: { min: 40, max: 45, acceptApproximate: accept } }),
      ).candidates[0].requirements.find((x) => x.key === "duration")!.status;
    expect(dur(false)).toBe("PERLU_PENGESAHAN");
    expect(dur(true)).toBe("BERSYARAT");
  });

  it("Tarwiyah bersyarat bernilai 0 dalam skor jika pengguna tidak menerima syarat", () => {
    const p = synthPackage("s-tar", {
      tarwiyah: {
        status: "offered_subject_to_approval",
        condition: "Kebenaran",
        description: null,
        evidence: synthPackage("x").tarwiyah.evidence,
      },
    });
    const cat = synthCatalog({
      packages: [p],
      variants: [synthVariant(p.id, "D2", 2, 1_000_000n)],
    });
    const util = (accept: boolean) =>
      assess(
        cat,
        req({ tarwiyah: { mode: "preferred", acceptConditional: accept } }),
      ).candidates[0].dimensions.find((d) => d.dimension === "tarwiyah")!.utility;
    expect(util(false)).toBe(0);
    expect(util(true)).toBe(1);
  });
});

describe("Julat bajet (had bawah)", () => {
  const cat = synthCatalog({
    packages: [synthPackage("murah"), synthPackage("dalam"), synthPackage("mahal")],
    variants: [
      synthVariant("murah", "M2", 2, 8_500_000n),
      synthVariant("dalam", "D2", 2, 9_500_000n),
      synthVariant("mahal", "H2", 2, 10_500_000n),
    ],
  });
  const group = (r: ReturnType<typeof assess>, id: string) =>
    r.candidates.find((c) => c.package.id === id)!.group;

  it("hanya pakej dalam RM90,000–RM100,000 seorang memenuhi; yang lebih murah tidak memenuhi", () => {
    const r = assess(
      cat,
      req({ budget: { perPersonSen: 10_000_000n, minPerPersonSen: 9_000_000n } }),
    );
    expect(group(r, "dalam")).toBe("full_match");
    expect(group(r, "murah")).toBe("not_matching");
    expect(group(r, "mahal")).toBe("not_matching");
    const b = r.candidates
      .find((c) => c.package.id === "murah")!
      .requirements.find((x) => x.key === "budget")!;
    expect(b.status).toBe("TIDAK_MEMENUHI");
    expect(b.detail).toContain("di bawah julat bajet");
  });

  it("tiada padanan: cadangan menurunkan bajet bagi pakej di bawah julat", () => {
    const r = assess(
      synthCatalog({
        packages: [synthPackage("murah")],
        variants: [synthVariant("murah", "M2", 2, 8_500_000n)],
      }),
      req({ budget: { perPersonSen: 10_000_000n, minPerPersonSen: 9_000_000n } }),
    );
    expect(r.noMatch?.nearest[0].description).toContain("RM 85,000.00 seorang");
  });

  it("tanpa had bawah, pakej lebih murah kekal memenuhi", () => {
    const r = assess(cat, req({ budget: { perPersonSen: 10_000_000n } }));
    expect(group(r, "murah")).toBe("full_match");
  });
});
