import type { ScoringRules } from "./types";

export const ENGINE_VERSION = "1.0.0";

/** Pemberat awal spesifikasi §9 (jumlah dimensi asas = 100). Pentadbir boleh menerbitkan versi baharu. */
export const SCORING_RULES_V1: ScoringRules = {
  version: "v1",
  weights: {
    savings: 25,
    comfort: 25,
    masyair: 20,
    proximity: 15,
    duration: 10,
    relocations: 5,
    // Dimensi pilihan apabila Tarwiyah/Aziziyah hanya "diutamakan".
    tarwiyah: 10,
    aziziyah: 10,
  },
  importanceMultiplier: { important: 2, normal: 1 },
};
