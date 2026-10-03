// @vitest-environment node
// Regresi bagi penemuan semakan kod bebas Fasa 9 (pentadbir, wizard, hasil).
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { csvToVariantOps } from "@/lib/admin/csv";
import { diffFiles } from "@/lib/admin/diff";
import { fileFromEditor, jsonForRole } from "@/lib/admin/json-edit";
import { applyOps, type OpContext } from "@/lib/admin/ops";
import { readRepoCatalog } from "@/lib/catalog/repo-files";
import type { PjhCatalogFileInput } from "@/lib/catalog/schema";
import { initialState, summarize, validateStep } from "@/lib/wizard/state";

const repo = readRepoCatalog(join(__dirname, "../../.."), "1448H");
const busyra = () => structuredClone(repo.raw.find((f) => f.pjh.id === "busyra")!);
const ctx: OpContext = {
  actor: "ujian (admin)",
  now: new Date("2026-10-05T00:00:00Z"),
  role: "admin",
};

describe("Import CSV tidak memadam medan yang tiada dalam fail", () => {
  it("lajur pilihan yang tiada dan pmn kosong mengekalkan nilai sedia ada", () => {
    const f = busyra();
    const pkg = f.packages[0];
    const v = {
      ...pkg.variants[0],
      aziziyahOccupancy: 2,
      roomLabelAsPublished: "Bilik Ber-2",
      notes: "nota",
      pmnStatus: "included" as const,
    };
    pkg.variants[0] = v;
    const csv = [
      "package_id,code,makkah,madinah,price_rm,pmn,pdf_page,evidence_text",
      `${pkg.id},${v.code},${v.makkahOccupancy},${v.madinahOccupancy},${(v.priceSen ?? 0) / 100},,${v.priceEvidence?.[0]?.pdfPage ?? 34},harga sama`,
    ].join("\n");
    const { ops, errors } = csvToVariantOps(
      csv,
      f.packages.map((p) => ({ packageId: p.id, variants: p.variants })),
    );
    expect(errors).toEqual([]);
    const next = applyOps(f, ops, ctx).packages[0].variants[0];
    expect(next).toMatchObject({
      aziziyahOccupancy: 2,
      roomLabelAsPublished: "Bilik Ber-2",
      notes: "nota",
      pmnStatus: "included",
    });
  });
});

describe("Perbezaan merangkumi butiran kelulusan", () => {
  it("perubahan sumber rasmi sahaja dilaporkan", () => {
    const a = busyra();
    a.pjh.approval = {
      status: "verified_approved",
      officialSource: "Senarai A",
      officialReference: null,
      verifiedAt: "2026-10-01",
      verifiedBy: "x",
    };
    const b = structuredClone(a);
    b.pjh.approval!.officialSource = "Senarai B";
    expect(diffFiles(a, b).map((d) => d.text)).toContain(
      "Maklumat kelulusan (sumber rasmi/rujukan) berubah",
    );
  });
});

describe("Wizard", () => {
  it("jarak tersembunyi ('Tidak kisah') tidak menghalang langkah keutamaan", () => {
    const s = { ...initialState(), proximityMakkahM: "300m" };
    expect(validateStep(s, 4)).toEqual([]);
    expect(
      validateStep({ ...s, importance: { ...s.importance, proximity: "important" } }, 4),
    ).toHaveLength(1);
  });

  it("ringkasan bajet menggunakan format wang bigint", () => {
    const s = { ...initialState(), budgetPerPersonRM: "9,999,999.99" };
    expect(summarize(s).find((i) => i.label === "Bajet seorang")!.value).toContain(
      "RM 9,999,999.99",
    );
  });
});

describe("JSON draf mengikut peranan", () => {
  const file = {
    pjh: { id: "x", name: "X", approval: { status: "verified", source: "TH" } },
    packages: [],
  } as unknown as PjhCatalogFileInput;

  it("penyemak tidak melihat kelulusan; simpan memulihkan kelulusan asal", () => {
    const text = jsonForRole(file, "reviewer");
    expect(text).not.toContain("approval");
    const edited = JSON.parse(text);
    edited.pjh.name = "X baharu";
    edited.pjh.approval = { status: "verified", source: "palsu" };
    const out = fileFromEditor(edited, file, "reviewer") as { pjh: Record<string, unknown> };
    expect(out.pjh.name).toBe("X baharu");
    expect(out.pjh.approval).toEqual(file.pjh.approval);
  });

  it("pentadbir melihat dan menyimpan kelulusan seperti disunting", () => {
    expect(jsonForRole(file, "admin")).toContain("approval");
    const edited = { pjh: { id: "x", approval: { status: "unverified" } } };
    expect(fileFromEditor(edited, file, "admin")).toBe(edited);
  });
});
