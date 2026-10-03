import "server-only";

import { getSeason } from "../catalog/season-store";
import { DEFAULT_SEASON_ID } from "../catalog/seasons";
import { apiError } from "./http";

/** Baca ?season= (lalai musim aktif). Pulangkan respons 404 jika tidak disokong. */
export async function seasonFrom(req: Request) {
  const id = new URL(req.url).searchParams.get("season") ?? DEFAULT_SEASON_ID;
  const season = await getSeason(id);
  return season
    ? { season, error: null }
    : { season: null, error: apiError(404, "not_found", `Musim ${id} tidak disokong.`) };
}
