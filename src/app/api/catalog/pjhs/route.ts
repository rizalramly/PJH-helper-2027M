import { pjhDTO } from "@/lib/api/dto";
import { ok, withErrors } from "@/lib/api/http";
import { seasonFrom } from "@/lib/api/season";
import { getActiveCatalog } from "@/lib/catalog/active";

type CoverageEntry = { id: string; processingStatus: string; pageRange: [number, number] };

/** GET /api/catalog/pjhs?season= — semua PJH dalam katalog aktif, termasuk yang belum disahkan. */
export async function GET(req: Request) {
  return withErrors(async () => {
    const { season, error } = seasonFrom(req);
    if (error) return error;
    const { catalog, coverage, datasetVersion } = await getActiveCatalog(season.id);
    const cov = ((coverage as { pjhs?: CoverageEntry[] }).pjhs ?? []) as CoverageEntry[];
    const pjhs = catalog.pjhs
      .map((p) => {
        const pkgs = catalog.packages.filter((x) => x.pjhId === p.id);
        const entry = cov.find((c) => c.id === p.id);
        return {
          ...pjhDTO(p, season.id),
          packageCount: pkgs.length,
          variantCount: catalog.variants.filter((v) => pkgs.some((x) => x.id === v.packageId))
            .length,
          processingStatus: entry?.processingStatus ?? null,
          sourcePages: entry?.pageRange ?? null,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, "ms"));
    return ok({ seasonId: season.id, datasetVersion, pjhs }, { cacheSeconds: 60, datasetVersion });
  });
}
