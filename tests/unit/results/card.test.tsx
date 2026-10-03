import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ScoreExplainer } from "@/components/results/ScoreExplainer";
import { CandidateCard } from "@/components/results/CandidateCard";
import { assessmentDTO } from "@/lib/api/dto";
import { assess } from "@/lib/engine";
import { FORBIDDEN_WORDS } from "@/lib/engine/explain";
import type { AssessResponse, CandidateDTO } from "@/lib/results/types";

import { busyraCatalog } from "../../fixtures/busyra";
import { makeReq, scenarioA } from "../../fixtures/requirements";
import {
  synthCatalog,
  synthCharge,
  synthPackage,
  synthVariant,
} from "../../fixtures/synthetic-catalog";

/** DTO seperti diterima pelayar (melalui JSON). */
const asBrowser = (r: ReturnType<typeof assess>) =>
  JSON.parse(JSON.stringify(assessmentDTO(r))) as AssessResponse;

describe("CandidateCard (DoD 5, 11)", () => {
  const d = asBrowser(assess(busyraCatalog(), scenarioA()));
  const top = d.candidates.find((c) => c.id === d.recommendations[0]?.candidateId) as CandidateDTO;

  it("memaparkan maklumat wajib kad hasil", () => {
    render(<CandidateCard c={top} recLabel={d.recommendations[0].label} />);
    const card = screen.getByRole("article");
    expect(within(card).getByText("Cadangan utama")).toBeInTheDocument();
    expect(card.textContent).toContain(top.package.name);
    expect(card.textContent).toContain("Musim 1448H");
    expect(card.textContent).toContain(top.cost.knownGroup.text);
    expect(card.textContent).toMatch(/kod \S+/);
    expect(card.textContent).toContain("Aziziyah ber-2");
    expect(card.textContent).toMatch(/Skor kesesuaian [\d.]+ \/ 100/);
    expect(card.textContent).toMatch(/Liputan bukti \d+%/);
    for (const h of ["Hotel Makkah", "Hotel Madinah", "Tarwiyah", "PMN / masyair", "Tempoh"]) {
      expect(within(card).getByText(h)).toBeInTheDocument();
    }
  });

  it("status keperluan ialah ikon + teks, bukan warna sahaja", () => {
    render(<CandidateCard c={top} />);
    const list = screen.getByText("Status keperluan anda").nextElementSibling as HTMLElement;
    for (const r of top.requirements) {
      expect(list.textContent).toContain(r.label);
    }
    expect(list.querySelectorAll("svg[aria-hidden='true']").length).toBe(top.requirements.length);
  });

  it("kelulusan belum disahkan dan kekosongan tidak dilabel 'diluluskan' / 'tersedia'", () => {
    const { container } = render(<CandidateCard c={top} expanded />);
    expect(container.textContent).toContain("Kelulusan PJH musim ini belum disahkan");
    expect(container.textContent).not.toMatch(/PJH diluluskan/i);
    expect(container.textContent).toContain("Kekosongan: Perlu pertanyaan");
    expect(container.textContent).not.toMatch(/Kekosongan: Tersedia/i);
    expect(container.textContent).not.toMatch(FORBIDDEN_WORDS);
  });

  it("mod laporan memaparkan semua bahagian tanpa perlu dibuka", () => {
    const { container } = render(<CandidateCard c={top} expanded />);
    expect(container.querySelector("details")).toBeNull();
    for (const t of ["Bagaimana skor dikira", "Pecahan kos", "Sumber"]) {
      expect(screen.getByRole("heading", { name: new RegExp(t) })).toBeInTheDocument();
    }
  });

  it("kotak pilih banding dilumpuhkan apabila 3 telah dipilih", () => {
    render(
      <CandidateCard c={top} compare={{ selected: false, disabled: true, onToggle: () => {} }} />,
    );
    expect(screen.getByLabelText(/Pilih untuk dibanding/)).toBeDisabled();
  });
});

describe("Caj tanpa harga tidak dipaparkan sebagai RM0", () => {
  it("menunjukkan 'Harga perlu pengesahan' dan kos belum lengkap", () => {
    const pkg = synthPackage("s-unpriced");
    const catalog = synthCatalog({
      packages: [pkg],
      variants: [synthVariant(pkg.id, "D2", 2, 1_000_000n)],
      charges: [synthCharge("c-null", [pkg.id], { priceSen: null })],
    });
    const d = asBrowser(assess(catalog, makeReq({}, "TEST")));
    const c = d.candidates[0];
    const { container } = render(<CandidateCard c={c} expanded />);
    expect(container.textContent).toContain("Harga perlu pengesahan");
    expect(container.textContent).toMatch(/caj belum berharga/);
    expect(container.textContent).not.toMatch(/RM 0\.00/);
  });

  it("caj yang sudah termasuk dalam harga tidak dipaparkan sebagai RM0", () => {
    const d = asBrowser(assess(busyraCatalog(), scenarioA()));
    const { container } = render(<CandidateCard c={d.candidates[0]} expanded />);
    expect(container.textContent).toContain("Termasuk dalam harga");
    expect(container.textContent).not.toMatch(/RM 0\.00/);
  });
});

describe("ScoreExplainer", () => {
  it("pemberat dinormalkan berjumlah 100% dan data hilang dinyatakan", () => {
    const d = asBrowser(
      assess(
        busyraCatalog(),
        scenarioA({ importance: { savings: "important", proximity: "important" } }),
      ),
    );
    const c = d.candidates[0];
    render(<ScoreExplainer c={c} />);
    const shares = screen
      .getAllByRole("row")
      .slice(1)
      .map((r) => Number(within(r).getAllByRole("cell")[0].textContent!.replace("%", "")));
    const total = shares.reduce((a, b) => a + b, 0);
    expect(Math.abs(total - 100)).toBeLessThanOrEqual(shares.length);
    expect(screen.getByText(/bukan penilaian negatif/)).toBeInTheDocument();
    expect(document.body.textContent).toMatch(/bukan\s*penarafan mutu PJH/);
  });
});
