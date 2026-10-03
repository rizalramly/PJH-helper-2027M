import { describe, expect, it } from "vitest";

import { assessmentDTO } from "@/lib/api/dto";
import { assess } from "@/lib/engine";
import {
  approvalText,
  dateText,
  durationText,
  normalizedWeights,
  pageText,
} from "@/lib/results/format";
import type { AssessResponse } from "@/lib/results/types";

import { busyraCatalog } from "../../fixtures/busyra";
import { scenarioA } from "../../fixtures/requirements";

const d = JSON.parse(
  JSON.stringify(assessmentDTO(assess(busyraCatalog(), scenarioA()))),
) as AssessResponse;

describe("format", () => {
  it("tempoh anggaran ditanda, bukan direka", () => {
    const pkg = d.candidates[0].package;
    expect(
      durationText({ ...pkg, duration: { value: 40, min: null, max: null, approximate: true } }),
    ).toBe("±40 hari (anggaran)");
    expect(
      durationText({ ...pkg, duration: { value: null, min: 30, max: 45, approximate: false } }),
    ).toBe("30–45 hari");
    expect(
      durationText({ ...pkg, duration: { value: null, min: null, max: null, approximate: false } }),
    ).toBe("Tidak dinyatakan");
  });

  it("halaman sumber dan tarikh", () => {
    expect(pageText({ pdfPage: 12, brochurePage: 3 })).toBe("hlm. PDF 12 (brosur hlm. 3)");
    expect(dateText("2026-10-03")).toBe("3 Oktober 2026");
    expect(dateText(null)).toBe("tidak direkodkan");
  });

  it("kelulusan belum disahkan tidak berbunyi diluluskan", () => {
    expect(approvalText("unverified")).toMatch(/belum disahkan/);
    expect(approvalText("unverified")).not.toMatch(/diluluskan/);
  });

  it("pemberat dinormalkan", () => {
    const w = normalizedWeights(d.candidates[0].dimensions);
    expect(w.reduce((s, x) => s + x.share, 0)).toBeCloseTo(w.length ? 1 : 0);
  });
});
