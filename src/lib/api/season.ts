import "server-only";

import { DEFAULT_SEASON_ID, findSeason } from "../catalog/seasons";
import { apiError } from "./http";

/** Baca ?season= (lalai musim aktif). Pulangkan respons 404 jika tidak disokong. */
export function seasonFrom(req: Request) {
  const id = new URL(req.url).searchParams.get("season") ?? DEFAULT_SEASON_ID;
  const season = findSeason(id);
  return season
    ? { season, error: null }
    : { season: null, error: apiError(404, "not_found", `Musim ${id} tidak disokong.`) };
}
