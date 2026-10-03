import { z } from "zod";

import { assessmentDTO } from "@/lib/api/dto";
import { apiError, ok, readJson, withErrors } from "@/lib/api/http";
import { getActiveCatalog } from "@/lib/catalog/active";
import { findSeason } from "@/lib/catalog/seasons";
import { assess } from "@/lib/engine";
import { formatIssues, requirementsSchema, toRequirements } from "@/lib/validation/requirements";

const bodySchema = z.object({
  requirements: requirementsSchema,
  options: z
    .object({
      diversifyPjh: z.boolean().default(false),
      requireVerifiedApproval: z.boolean().default(false),
      notMatchingLimit: z.number().int().min(0).max(200).default(10),
    })
    .default({ diversifyPjh: false, requireVerifiedApproval: false, notMatchingLimit: 10 }),
});

/** POST /api/assess — nilai keperluan pengguna terhadap katalog aktif musim. */
export async function POST(req: Request) {
  return withErrors(async () => {
    const body = await readJson(req);
    if (!body.ok) return body.response;
    const parsed = bodySchema.safeParse(body.value);
    if (!parsed.success) {
      return apiError(
        422,
        "validation_failed",
        "Keperluan tidak lengkap atau tidak sah.",
        formatIssues(parsed.error),
      );
    }
    const requirements = toRequirements(parsed.data.requirements);
    if (!findSeason(requirements.seasonId)) {
      return apiError(404, "not_found", `Musim ${requirements.seasonId} tidak disokong.`);
    }
    const active = await getActiveCatalog(requirements.seasonId);
    const result = assess(active.catalog, requirements, parsed.data.options);
    if (result.inputErrors.length) {
      return apiError(
        422,
        "validation_failed",
        "Keperluan tidak sah.",
        result.inputErrors.map((message) => ({ field: "rooms", message })),
      );
    }
    return ok(
      { ...assessmentDTO(result, parsed.data.options), coverageSummary: summary(active.coverage) },
      { datasetVersion: active.datasetVersion },
    );
  });
}

function summary(coverage: unknown) {
  const totals = (coverage as { totals?: Record<string, number>; generatedAt?: string }) ?? {};
  return { totals: totals.totals ?? null, generatedAt: totals.generatedAt ?? null };
}
