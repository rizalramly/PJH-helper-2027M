import { packageDTO, pjhDTO, variantDTO } from "@/lib/api/dto";
import { apiError, ok, withErrors } from "@/lib/api/http";
import { seasonFrom } from "@/lib/api/season";
import { getActiveCatalog } from "@/lib/catalog/active";

/** GET /api/catalog/packages?season=&pjh= — pakej dan varian (harga diketahui atau "perlu pengesahan"). */
export async function GET(req: Request) {
  return withErrors(async () => {
    const { season, error } = await seasonFrom(req);
    if (error) return error;
    const pjhId = new URL(req.url).searchParams.get("pjh");
    const { catalog, datasetVersion } = await getActiveCatalog(season.id);
    if (pjhId && !catalog.pjhs.some((p) => p.id === pjhId))
      return apiError(404, "not_found", `PJH ${pjhId} tiada dalam katalog.`);
    const packages = catalog.packages
      .filter((p) => !pjhId || p.pjhId === pjhId)
      .map((p) => ({
        ...packageDTO(p),
        pjh: pjhDTO(
          catalog.pjhs.find((x) => x.id === p.pjhId)!,
          season.id,
        ),
        variants: catalog.variants.filter((v) => v.packageId === p.id).map(variantDTO),
      }));
    return ok(
      { seasonId: season.id, datasetVersion, packages },
      { cacheSeconds: 60, datasetVersion },
    );
  });
}
