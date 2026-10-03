import { ok, withErrors } from "@/lib/api/http";
import { seasonFrom } from "@/lib/api/season";
import { getActiveCatalog } from "@/lib/catalog/active";

/** GET /api/coverage?season= — manifest liputan katalog aktif (spesifikasi §23.3). */
export async function GET(req: Request) {
  return withErrors(async () => {
    const { season, error } = seasonFrom(req);
    if (error) return error;
    const { coverage, datasetVersion, source } = await getActiveCatalog(season.id);
    return ok({ seasonId: season.id, datasetVersion, source, coverage }, { cacheSeconds: 60, datasetVersion });
  });
}
