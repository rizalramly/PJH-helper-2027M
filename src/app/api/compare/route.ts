import { z } from "zod";

import { candidateDTO } from "@/lib/api/dto";
import { apiError, ok, readJson, withErrors } from "@/lib/api/http";
import { getActiveCatalog } from "@/lib/catalog/active";
import { getSeason } from "@/lib/catalog/season-store";
import { assess } from "@/lib/engine";
import { buildComparison } from "@/lib/engine/compare";
import { formatIssues, requirementsSchema, toRequirements } from "@/lib/validation/requirements";

const bodySchema = z.object({
  requirements: requirementsSchema,
  candidateIds: z
    .array(z.string().min(1))
    .min(2, "Pilih sekurang-kurangnya 2 calon")
    .max(3, "Maksimum 3 calon"),
});

/** POST /api/compare — perbandingan sebelah-menyebelah (≤3) dengan sebab beza harga. */
export async function POST(req: Request) {
  return withErrors(async () => {
    const body = await readJson(req);
    if (!body.ok) return body.response;
    const parsed = bodySchema.safeParse(body.value);
    if (!parsed.success) {
      return apiError(
        422,
        "validation_failed",
        "Permintaan perbandingan tidak sah.",
        formatIssues(parsed.error),
      );
    }
    const requirements = toRequirements(parsed.data.requirements);
    if (!(await getSeason(requirements.seasonId)))
      return apiError(404, "not_found", `Musim ${requirements.seasonId} tidak disokong.`);
    const active = await getActiveCatalog(requirements.seasonId);
    const result = assess(active.catalog, requirements);
    if (result.inputErrors.length) {
      return apiError(
        422,
        "validation_failed",
        "Keperluan tidak sah.",
        result.inputErrors.map((message) => ({ field: "rooms", message })),
      );
    }
    const ids = [...new Set(parsed.data.candidateIds)];
    const picked = ids.map((id) => result.candidates.find((c) => c.id === id));
    const missing = ids.filter((_, i) => !picked[i]);
    if (missing.length) {
      return apiError(
        404,
        "not_found",
        "Sebahagian calon tidak wujud untuk keperluan ini.",
        missing.map((id) => ({ field: "candidateIds", message: id })),
      );
    }
    const candidates = picked.filter((c) => c !== undefined);
    return ok(
      {
        seasonId: result.seasonId,
        datasetVersion: result.datasetVersion,
        scoringRulesVersion: result.scoringRulesVersion,
        engineVersion: result.engineVersion,
        ...buildComparison(candidates),
        candidates: candidates.map((c) => candidateDTO(c, result.seasonId)),
      },
      { datasetVersion: active.datasetVersion },
    );
  });
}
