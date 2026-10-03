// Orkestrasi penilaian: kos → keperluan → kumpulan → skor → label cadangan.
// Tapis dahulu; skor tinggi tidak mengatasi kegagalan syarat wajib (spesifikasi §9).
import { costPackage, totalPilgrims, validateRooms } from "./costing";
import { evaluateRequirements, groupOf } from "./eligibility";
import { explainCandidate, narrative } from "./explain";
import { formatRM } from "./money";
import { scoreCandidate } from "./ranking";
import { ENGINE_VERSION, SCORING_RULES_V1 } from "./rules";
import type {
  AssessmentResult,
  Candidate,
  Catalog,
  MinimalChange,
  Recommendation,
  RecommendationLabel,
  Requirements,
  ResultGroup,
  ScoringRules,
} from "./types";

export interface AssessOptions {
  rules?: ScoringRules;
  /** Utamakan kepelbagaian PJH dalam slot cadangan (spesifikasi §23.4). */
  diversifyPjh?: boolean;
  /** Kecualikan PJH yang kelulusannya belum disahkan daripada cadangan. */
  requireVerifiedApproval?: boolean;
}

const GROUP_ORDER: Record<ResultGroup, number> = {
  full_match: 0,
  needs_verification: 1,
  not_matching: 2,
};

export function compareCandidates(a: Candidate, b: Candidate): number {
  return (
    GROUP_ORDER[a.group] - GROUP_ORDER[b.group] ||
    b.score - a.score ||
    b.coverage - a.coverage ||
    (a.cost.knownGroupSen < b.cost.knownGroupSen
      ? -1
      : a.cost.knownGroupSen > b.cost.knownGroupSen
        ? 1
        : 0) ||
    a.id.localeCompare(b.id)
  );
}

const NO_MATCH_MESSAGE = "Tiada pakej yang memenuhi semua keperluan berdasarkan data tersedia";

export function assess(
  catalog: Catalog,
  req: Requirements,
  options: AssessOptions = {},
): AssessmentResult {
  const rules = options.rules ?? SCORING_RULES_V1;
  const base: AssessmentResult = {
    seasonId: req.seasonId,
    datasetVersion: catalog.datasetVersion,
    scoringRulesVersion: rules.version,
    engineVersion: ENGINE_VERSION,
    coverage: {
      pjhCount: catalog.pjhs.length,
      packageCount: catalog.packages.length,
      variantCount: catalog.variants.filter((v) => v.travellerCategory === "adult").length,
    },
    candidates: [],
    groups: { full_match: [], needs_verification: [], not_matching: [] },
    archived: [],
    rejected: [],
    recommendations: [],
    noMatch: null,
    inputErrors: [],
  };

  const inputErrors = validateRooms(req.rooms);
  if (req.seasonId !== catalog.seasonId) {
    inputErrors.push(
      `Musim ${req.seasonId} tidak sepadan dengan katalog ${catalog.seasonId}; data musim tidak dicampur.`,
    );
  }
  if (req.budget.perPersonSen <= 0n) inputErrors.push("Bajet seorang mesti lebih daripada RM0.");
  if (inputErrors.length) return { ...base, inputErrors };

  const pjhById = new Map(catalog.pjhs.map((p) => [p.id, p]));
  const candidates: Candidate[] = [];
  for (const pkg of catalog.packages) {
    if (pkg.seasonId !== req.seasonId || pkg.publishedStatus !== "published") continue;
    if (pkg.availability.status === "sold_out" || pkg.availability.status === "withdrawn") {
      base.archived.push(pkg.id);
      continue;
    }
    const pjh = pjhById.get(pkg.pjhId);
    if (!pjh) continue;
    const costing = costPackage(catalog, pkg, req);
    if (!costing.ok) {
      base.rejected.push({
        packageId: pkg.id,
        packageName: `${pjh.name}: ${pkg.name}`,
        reason: costing.reason,
      });
      continue;
    }
    const { assignments, cost } = costing;
    const requirements = evaluateRequirements(pkg, assignments, cost, req);
    const group = groupOf(requirements);
    const { score, coverage, dimensions } = scoreCandidate(pkg, assignments, cost, req, rules);
    const approvalStatus =
      pjh.approvals.find((a) => a.seasonId === req.seasonId)?.status ?? "unverified";
    const explanation = explainCandidate(
      pkg,
      assignments,
      cost,
      requirements,
      dimensions,
      approvalStatus,
      req,
    );
    candidates.push({
      id: `${pkg.id}::${assignments.map((a) => a.variant.code).join("+")}`,
      pjh,
      package: pkg,
      assignments,
      cost,
      requirements,
      group,
      score,
      coverage,
      dimensions,
      ...explanation,
      approvalStatus,
      blockedFromPrimary:
        pkg.unresolvedConflicts.length > 0 || requirements.some((r) => r.blocksPrimary),
    });
  }
  candidates.sort(compareCandidates);
  for (const c of candidates) base.groups[c.group].push(c.id);

  const eligibleForRecommendation = (c: Candidate) =>
    !options.requireVerifiedApproval || c.approvalStatus === "verified_approved";
  const used = new Set<string>();
  const usedPjh = new Set<string>();
  const recommendations: Recommendation[] = [];
  const pick = (label: RecommendationLabel, c: Candidate | undefined) => {
    if (!c) return;
    used.add(c.id);
    usedPjh.add(c.pjh.id);
    recommendations.push({
      label,
      candidateId: c.id,
      narrative: narrative(
        label,
        `${c.pjh.name}: ${c.package.name}`,
        c.cost,
        c.reasons,
        c.uncertainties,
      ),
    });
  };
  const available = (c: Candidate) =>
    !used.has(c.id) &&
    eligibleForRecommendation(c) &&
    (!options.diversifyPjh || !usedPjh.has(c.pjh.id));

  const full = candidates.filter((c) => c.group === "full_match");
  const primary = full.find((c) => !c.blockedFromPrimary && available(c));
  pick("CADANGAN_UTAMA", primary);
  if (primary) {
    const cheaper = full
      .filter(
        (c) =>
          available(c) &&
          !c.blockedFromPrimary &&
          c.cost.complete &&
          c.cost.knownGroupSen < primary.cost.knownGroupSen,
      )
      .sort((a, b) =>
        a.cost.knownGroupSen !== b.cost.knownGroupSen
          ? a.cost.knownGroupSen < b.cost.knownGroupSen
            ? -1
            : 1
          : compareCandidates(a, b),
      )[0];
    pick("ALTERNATIF_JIMAT", cheaper);
    const comfortOf = (c: Candidate) => {
      const dims = c.dimensions.filter(
        (d) => ["comfort", "proximity", "masyair"].includes(d.dimension) && d.known,
      );
      return dims.length ? dims.reduce((s, d) => s + d.weight * d.utility, 0) : null;
    };
    const primaryComfort = comfortOf(primary) ?? 0;
    const comfier = full
      .filter((c) => available(c) && !c.blockedFromPrimary)
      .map((c) => ({ c, v: comfortOf(c) }))
      .filter((x) => x.v !== null && x.v > primaryComfort)
      .sort((a, b) => (b.v as number) - (a.v as number) || compareCandidates(a.c, b.c))[0]?.c;
    pick("ALTERNATIF_KESELESAAN", comfier);
  }
  const conditional = candidates.filter(
    (c) => (c.group === "full_match" && c.blockedFromPrimary) || c.group === "needs_verification",
  );
  for (const c of conditional) {
    if (recommendations.length >= 3) break;
    if (available(c)) pick("CALON_BERSYARAT", c);
  }

  let noMatch: AssessmentResult["noMatch"] = null;
  if (full.length === 0) {
    const counts = new Map<string, number>();
    for (const c of candidates) {
      for (const r of c.requirements.filter(
        (r) => r.hard && r.status !== "MEMENUHI" && r.status !== "BERSYARAT",
      )) {
        const key = `${r.label}: ${r.status === "TIDAK_MEMENUHI" ? "tidak memenuhi" : "perlu pengesahan"}`;
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    const reasons = [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([k, n]) => `${k} (${n} calon)`);
    if (base.rejected.length)
      reasons.push(`${base.rejected.length} pakej tiada harga untuk susunan bilik anda`);
    const pilgrims = totalPilgrims(req.rooms);
    const nearest: MinimalChange[] = candidates
      .map((c) => {
        const failing = c.requirements.filter((r) => r.hard && r.status === "TIDAK_MEMENUHI");
        const verify = c.requirements.filter((r) => r.hard && r.status === "PERLU_PENGESAHAN");
        const over = c.cost.remainingSen < 0n ? -c.cost.remainingSen : 0n;
        const extra = over > 0n ? (over + BigInt(pilgrims) - 1n) / BigInt(pilgrims) : null;
        const nonBudget = failing.filter((r) => r.key !== "budget");
        // Di bawah julat bajet: bajet yang lebih rendah akan merangkumi pakej ini.
        const lowerTo =
          extra === null && failing.some((r) => r.key === "budget")
            ? (c.cost.comparedGroupSen + BigInt(pilgrims) - 1n) / BigInt(pilgrims)
            : null;
        let description: string;
        if (failing.length === 0)
          description = `Sahkan maklumat: ${verify.map((r) => r.label).join(", ")}.`;
        else if (nonBudget.length === 0 && extra !== null)
          description = `Tambah bajet ${formatRM(extra)} seorang.`;
        else if (nonBudget.length === 0 && lowerTo !== null)
          description = `Kos di bawah julat bajet anda; bajet ${formatRM(lowerTo)} seorang akan merangkumi pakej ini.`;
        else if (nonBudget.length === 1 && extra === null)
          description = `Longgarkan satu syarat: ${nonBudget[0].label} (${nonBudget[0].detail})`;
        else
          description = `Perlu mengubah ${failing.length} syarat: ${failing.map((r) => r.label).join(", ")}${extra !== null ? `; bajet perlu bertambah ${formatRM(extra)} seorang` : ""}.`;
        return {
          c,
          failing: failing.length,
          extra,
          change: {
            candidateId: c.id,
            failingHard: failing.map((r) => r.key),
            extraBudgetPerPersonSen: extra,
            description,
          },
        };
      })
      .sort((a, b) => {
        if (a.failing !== b.failing) return a.failing - b.failing;
        const ea = a.extra ?? 0n;
        const eb = b.extra ?? 0n;
        if (ea !== eb) return ea < eb ? -1 : 1;
        return compareCandidates(a.c, b.c);
      })
      .slice(0, 3)
      .map((x) => x.change);
    noMatch = { message: NO_MATCH_MESSAGE, reasons, nearest };
  }

  return { ...base, candidates, recommendations, noMatch };
}
