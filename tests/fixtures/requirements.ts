import type { Requirements, RoomSpec } from "@/lib/engine/types";

type Overrides = Partial<Omit<Requirements, "budget" | "aziziyah" | "duration" | "tarwiyah">> & {
  budget?: Partial<Requirements["budget"]>;
  aziziyah?: Partial<Requirements["aziziyah"]>;
  duration?: Partial<Requirements["duration"]>;
  tarwiyah?: Partial<Requirements["tarwiyah"]>;
};

export const couple: RoomSpec[] = [{ pilgrims: 2, makkah: 2, madinah: 2, aziziyah: 2 }];

/** Keperluan asas: pasangan, RM100,000 seorang, tiada syarat lain kecuali dinyatakan. */
export function makeReq(o: Overrides = {}, seasonId = "1448H"): Requirements {
  return {
    seasonId,
    rooms: o.rooms ?? couple,
    budget: {
      perPersonSen: 10_000_000n,
      scope: "package_only",
      extrasPerPersonSen: 0n,
      hard: true,
      ...o.budget,
    },
    aziziyah: { mode: "any", acceptConditional: true, ...o.aziziyah },
    duration: {
      min: null,
      max: null,
      target: null,
      tolerance: null,
      acceptApproximate: true,
      hard: true,
      ...o.duration,
    },
    tarwiyah: { mode: "any", acceptConditional: true, ...o.tarwiyah },
    pmn: o.pmn ?? "any",
    privateRoom: o.privateRoom ?? "any",
    proximity: o.proximity ?? { maxMakkahM: null, maxMadinahM: null },
    comfortFeatures: o.comfortFeatures ?? [],
    minRoomSizeSqm: o.minRoomSizeSqm ?? null,
    importance: o.importance ?? {},
  };
}

/** Senario A spesifikasi §13. */
export const scenarioA = (o: Overrides = {}) =>
  makeReq({
    aziziyah: { mode: "required", acceptConditional: true },
    pmn: "required",
    tarwiyah: { mode: "required", acceptConditional: true },
    duration: { target: 40, tolerance: 0, acceptApproximate: true, hard: true },
    ...o,
  });
