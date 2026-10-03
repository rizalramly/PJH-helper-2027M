import { z } from "zod";

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

export const seasonSchema = z.object({
  id: z.string().regex(/^\d{4}H$/, "ID musim mesti seperti 1449H"),
  hijriYear: z.number().int().min(1440).max(1500),
  gregorianYear: z.number().int().min(2018).max(2080),
  label: z.string().trim().min(3).max(80),
  active: z.boolean(),
});

/** Gabung musim terbina dengan musim yang disimpan pentadbir (simpanan mengatasi ikut ID). */
export function mergeSeasons(builtIn: Season[], stored: Season[]): Season[] {
  const byId = new Map(builtIn.map((s) => [s.id, s]));
  for (const s of stored) byId.set(s.id, s);
  return [...byId.values()].sort((a, b) => b.hijriYear - a.hijriYear);
}
