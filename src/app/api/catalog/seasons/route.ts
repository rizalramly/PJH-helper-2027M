import { ok, withErrors } from "@/lib/api/http";
import { listSeasons } from "@/lib/catalog/season-store";

/** GET /api/catalog/seasons */
export async function GET() {
  return withErrors(async () => ok({ seasons: await listSeasons() }, { cacheSeconds: 60 }));
}
