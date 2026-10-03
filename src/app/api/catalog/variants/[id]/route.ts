import { evidenceDTO, moneyOrNull, packageDTO, pjhDTO, variantDTO } from "@/lib/api/dto";
import { apiError, ok, withErrors } from "@/lib/api/http";
import { seasonFrom } from "@/lib/api/season";
import { getActiveCatalog } from "@/lib/catalog/active";

/** GET /api/catalog/variants/:id?season= — butiran varian dengan pakej, naik taraf, caj dan bukti. */
export async function GET(req: Request, ctx: RouteContext<"/api/catalog/variants/[id]">) {
  return withErrors(async () => {
    const { season, error } = seasonFrom(req);
    if (error) return error;
    const { id } = await ctx.params;
    const { catalog, datasetVersion } = await getActiveCatalog(season.id);
    const variant = catalog.variants.find((v) => v.id === decodeURIComponent(id));
    if (!variant) return apiError(404, "not_found", "Varian tidak ditemui.");
    const pkg = catalog.packages.find((p) => p.id === variant.packageId)!;
    const pjh = catalog.pjhs.find((p) => p.id === pkg.pjhId)!;
    const upgrades = catalog.upgrades
      .filter((u) => u.packageIds.includes(pkg.id))
      .filter(
        (u) =>
          u.applicableVariantIds.length === 0 ||
          u.applicableVariantIds.includes(variant.id) ||
          u.includedInVariantIds.includes(variant.id),
      )
      .map((u) => ({
        id: u.id,
        kind: u.kind,
        description: u.description,
        price: moneyOrNull(u.priceSen),
        basis: u.basis,
        nightCount: u.nightCount,
        resultingOccupancy: u.resultingOccupancy,
        includedInThisVariant: u.includedInVariantIds.includes(variant.id),
        condition: u.condition,
        evidence: u.evidence.map(evidenceDTO),
      }));
    const charges = catalog.charges
      .filter((c) => c.packageIds.includes(pkg.id))
      .map((c) => ({
        id: c.id,
        description: c.description,
        price: moneyOrNull(c.priceSen),
        basis: c.basis,
        included: c.included,
        kind: c.kind,
        evidence: c.evidence.map(evidenceDTO),
      }));
    return ok(
      {
        seasonId: season.id,
        datasetVersion,
        variant: { ...variantDTO(variant), evidence: variant.evidence.map(evidenceDTO) },
        package: packageDTO(pkg),
        pjh: { ...pjhDTO(pjh, season.id), terms: pjh.terms.map((t) => t.text) },
        upgrades,
        charges,
      },
      { cacheSeconds: 60, datasetVersion },
    );
  });
}
