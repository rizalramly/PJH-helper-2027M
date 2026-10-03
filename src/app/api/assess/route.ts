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

interface CoverageLike {
  totals?: Record<string, number>;
  generatedAt?: string;
  pjhs?: {
    id: string;
    label: string;
    processingStatus: string;
    approvalStatus: string;
    reviewedAt: string | null;
  }[];
}

/** Ringkasan liputan untuk hasil/laporan: jumlah, tarikh dan tarikh semakan setiap PJH. */
function summary(coverage: unknown) {
  const c = (coverage as CoverageLike | null) ?? {};
  return {
    totals: c.totals ?? null,
    generatedAt: c.generatedAt ?? null,
    pjhs: Object.fromEntries(
      (c.pjhs ?? []).map((p) => [
        p.id,
        {
          label: p.label,
          processingStatus: p.processingStatus,
          approvalStatus: p.approvalStatus,
          reviewedAt: p.reviewedAt,
        },
      ]),
    ),
  };
}
