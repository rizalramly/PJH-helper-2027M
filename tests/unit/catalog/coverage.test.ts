import { describe, expect, it } from "vitest";

import coverage from "../../../data/catalog-coverage.json";
import manifest from "../../../data/sources/manifest.json";

type Entry = (typeof coverage.pjhs)[number];

const compilation = manifest.sources.find((s) => s.id === "compilation-34pjh-1448h")!;

describe("Manifest liputan katalog (spesifikasi §23.3)", () => {
  it("mempunyai tepat 34 PJH dengan ID unik", () => {
    expect(coverage.pjhs).toHaveLength(34);
    expect(new Set(coverage.pjhs.map((p) => p.id)).size).toBe(34);
  });

  it("memetakan setiap halaman 1–141 kepada tepat satu PJH atau halaman bukan PJH", () => {
    const owner = new Map<number, string>();
    for (const page of coverage.nonPjhPages) owner.set(page, "non_pjh");
    for (const p of coverage.pjhs) {
      for (let page = p.pageRange[0]; page <= p.pageRange[1]; page++) {
        expect(owner.has(page), `hlm. ${page} dipetakan dua kali`).toBe(false);
        owner.set(page, p.id);
      }
      expect(p.pagesExpected).toBe(p.pageRange[1] - p.pageRange[0] + 1);
    }
    expect([...owner.keys()].sort((a, b) => a - b)).toEqual(
      Array.from({ length: coverage.pagesTotal }, (_, i) => i + 1),
    );
  });

  it("selaras dengan indeks halaman dalam manifest sumber", () => {
    const fromManifest = compilation.page_index!.pjhs.map((p) => [p.id, p.pdf_pages]);
    const fromCoverage = coverage.pjhs.map((p) => [p.id, p.pageRange]);
    expect(fromCoverage).toEqual(fromManifest);
    expect(compilation.page_count).toBe(coverage.pagesTotal);
  });

  it("hanya menanda 'reviewed' apabila semua halaman disemak dan varian direkonsiliasi", () => {
    for (const p of coverage.pjhs as Entry[]) {
      const reviewedPages = new Set(p.pagesReviewed);
      for (const page of reviewedPages) {
        expect(page >= p.pageRange[0] && page <= p.pageRange[1]).toBe(true);
      }
      if (p.processingStatus !== "reviewed") continue;
      expect(reviewedPages.size, `${p.id}: halaman belum disemak`).toBe(p.pagesExpected);
      expect(p.variantsIdentified).toBe(p.variantsImported + p.excludedVariants.length);
      expect(p.unreadablePages).toEqual([]);
      expect(p.unresolvedVariants).toEqual([]);
    }
  });

  it("tidak menganggap mana-mana PJH diluluskan tanpa pengesahan", () => {
    for (const p of coverage.pjhs) {
      expect(["unverified", "verified_approved", "not_approved"]).toContain(p.approvalStatus);
    }
    // Belum ada sumber rasmi kelulusan 1448H dalam repo.
    expect(coverage.pjhs.every((p) => p.approvalStatus === "unverified")).toBe(true);
  });
});
