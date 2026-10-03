import "server-only";

import type { Season } from "../engine/types";
import { appendAudit } from "../storage/catalog-repo";
import { getStore } from "../storage/env";
import type { JsonKV } from "../storage/kv";
import { mergeSeasons, SEASONS } from "./seasons";

export const SEASONS_PATH = "catalog/seasons.json";
const TTL_MS = 30_000;
let cache: { at: number; seasons: Season[] } | null = null;

interface StoredSeasons {
  seasons: Season[];
}

/** Semua musim (terbina + disimpan pentadbir). Dicache 30 saat. */
export async function listSeasons(kv: JsonKV | null = getStore()?.kv ?? null): Promise<Season[]> {
  if (!kv) return SEASONS;
  if (cache && Date.now() - cache.at < TTL_MS) return cache.seasons;
  const stored = await kv.getJSON<StoredSeasons>(SEASONS_PATH);
  const seasons = mergeSeasons(SEASONS, stored?.value.seasons ?? []);
  cache = { at: Date.now(), seasons };
  return seasons;
}

export async function getSeason(id: string | null | undefined, kv?: JsonKV | null) {
  return (await listSeasons(kv)).find((s) => s.id === id) ?? null;
}

/** Cipta atau kemas kini satu musim (ifMatch) dan rekod audit. */
export async function saveSeason(kv: JsonKV, season: Season, actor: string, now: Date) {
  const current = await kv.getJSON<StoredSeasons>(SEASONS_PATH);
  const list = (current?.value.seasons ?? []).filter((s) => s.id !== season.id);
  await kv.putJSON(
    SEASONS_PATH,
    { seasons: [...list, season] },
    current ? { ifMatch: current.etag } : { createOnly: true },
  );
  cache = null;
  await appendAudit(kv, {
    at: now.toISOString(),
    actor,
    action: "season_update",
    seasonId: season.id,
    note: `${season.label}; ${season.active ? "aktif" : "tidak aktif"}`,
  });
}

export function invalidateSeasonCache() {
  cache = null;
}
