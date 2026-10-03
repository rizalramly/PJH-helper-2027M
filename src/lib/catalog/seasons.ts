import type { Season } from "../engine/types";

/** Musim yang disokong. Data musim berlainan tidak dicampur (spesifikasi §2). */
export const SEASONS: Season[] = [
  {
    id: "1448H",
    hijriYear: 1448,
    gregorianYear: 2027,
    label: "Musim Haji 1448H / 2027M",
    active: true,
  },
];

export const DEFAULT_SEASON_ID = "1448H";

export const findSeason = (id: string | null | undefined) =>
  SEASONS.find((s) => s.id === id) ?? null;
