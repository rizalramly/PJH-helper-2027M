import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "@/app/page";

describe("Halaman utama", () => {
  it("memaparkan tajuk dan musim", () => {
    render(<Home />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Perancang Pakej Haji PJH" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Musim 1448H / 2027M")).toBeInTheDocument();
  });

  it("memaparkan status dengan teks, bukan warna sahaja", () => {
    render(<Home />);
    for (const label of ["Memenuhi", "Bersyarat", "Perlu pengesahan", "Tidak memenuhi"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("tidak mendakwa semua PJH telah dianalisis", () => {
    const { container } = render(<Home />);
    expect(container.textContent).not.toMatch(/34 PJH|semua PJH/i);
  });
});
