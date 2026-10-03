// DTO API: objek engine → JSON. Wang = { sen: "8649000", text: "RM 86,490.00" }; null = belum diketahui.
import { formatRM } from "../engine/money";
import type {
  AssessmentResult,
  Candidate,
  CostBreakdown,
  Evidence,
  Package,
  Pjh,
  RequirementResult,
  Variant,
} from "../engine/types";

export interface MoneyDTO {
  sen: string;
  text: string;
}

export const money = (sen: bigint): MoneyDTO => ({ sen: sen.toString(), text: formatRM(sen) });
export const moneyOrNull = (sen: bigint | null): MoneyDTO | null =>
  sen === null ? null : money(sen);

export const evidenceDTO = (e: Evidence) => ({
  sourceId: e.sourceId,
  pdfPage: e.pdfPage,
  ...(e.brochurePage !== undefined ? { brochurePage: e.brochurePage } : {}),
  text: e.text,
  status: e.status,
});

export function pjhDTO(pjh: Pjh, seasonId: string) {
  const approval = pjh.approvals.find((a) => a.seasonId === seasonId);
  return {
    id: pjh.id,
    name: pjh.name,
    website: pjh.website,
    publicContact: pjh.publicContact,
    approvalStatus: approval?.status ?? "unverified",
    licenceNumberAsPublished: approval?.licenceNumberAsPublished ?? null,
  };
}

export function packageDTO(pkg: Package) {
  return {
    id: pkg.id,
    pjhId: pkg.pjhId,
    seasonId: pkg.seasonId,
    name: pkg.name,
    series: pkg.series,
    tierLabel: pkg.tierLabel,
    duration: {
      value: pkg.duration.value,
      min: pkg.duration.min,
      max: pkg.duration.max,
      approximate: pkg.duration.approximate,
    },
    tarwiyah: {
      status: pkg.tarwiyah.status,
      condition: pkg.tarwiyah.condition,
      description: pkg.tarwiyah.description,
    },
    aziziyah: {
      status: pkg.aziziyah.status,
      condition: pkg.aziziyah.condition,
      dateLabel: pkg.aziziyah.dateLabel,
      labelAsPublished: pkg.aziziyah.labelAsPublished,
      defaultOccupancies: pkg.aziziyah.defaultOccupancies,
      defaultArrangementNote: pkg.aziziyah.defaultArrangementNote,
    },
    masyair: { type: pkg.masyair.type, description: pkg.masyair.description },
    relocations: { count: pkg.relocations.count, note: pkg.relocations.note },
    flightClass: pkg.flightClass.value,
    trainClass: pkg.trainClass.value,
    meals: pkg.meals.description,
    travelDates: pkg.travelDates.label,
    availability: { status: pkg.availability.status, note: pkg.availability.note },
    unresolvedConflicts: pkg.unresolvedConflicts,
    stays: [...pkg.stays]
      .sort((a, b) => a.sequence - b.sequence)
      .map((s) => ({
        location: s.location,
        sequence: s.sequence,
        hotelNameAsPublished: s.hotelNameAsPublished,
        orEquivalent: s.orEquivalent,
        roomCategory: s.roomCategory,
        dateLabel: s.dateLabel,
        nightCount: s.nightCount,
        distanceM: s.distanceM,
        distanceIsApproximate: s.distanceIsApproximate,
        distanceReference: s.distanceReference,
        distanceReferenceAsPublished: s.distanceReferenceAsPublished,
        meals: s.meals,
        roomSizeSqm: s.roomSizeSqm,
        privateBathroom: s.privateBathroom,
        privateForBookingGroup: s.privateForBookingGroup,
      })),
    inclusions: pkg.inclusions.map((i) => ({ text: i.text, condition: i.condition })),
    exclusions: pkg.exclusions.map((x) => x.text),
  };
}

export function variantDTO(v: Variant) {
  return {
    id: v.id,
    packageId: v.packageId,
    code: v.code,
    codeIsInternal: v.codeIsInternal,
    price: moneyOrNull(v.priceSen),
    makkahOccupancy: v.makkahOccupancy,
    madinahOccupancy: v.madinahOccupancy,
    aziziyahOccupancy: v.aziziyahOccupancy,
    pmnStatus: v.pmnStatus,
    travellerCategory: v.travellerCategory,
    roomLabelAsPublished: v.roomLabelAsPublished,
    notes: v.notes,
  };
}

export function costDTO(c: CostBreakdown) {
  return {
    lines: c.lines.map((l) => ({
      label: l.label,
      amount: moneyOrNull(l.amountSen),
      kind: l.kind,
      basis: l.basis ?? null,
      quantity: l.quantity ?? null,
      evidence: l.evidence.slice(0, 2).map(evidenceDTO),
    })),
    knownGroup: money(c.knownGroupSen),
    comparedGroup: money(c.comparedGroupSen),
    budgetGroup: money(c.budgetGroupSen),
    remaining: money(c.remainingSen),
    complete: c.complete,
    unpriced: c.unpriced,
    conditionalCharges: c.conditionalCharges,
    pilgrims: c.pilgrims,
  };
}

const requirementDTO = (r: RequirementResult) => ({
  key: r.key,
  label: r.label,
  status: r.status,
  hard: r.hard,
  detail: r.detail,
  blocksPrimary: r.blocksPrimary,
  evidence: r.evidence.slice(0, 3).map(evidenceDTO),
});

/** Sumber unik (halaman) yang menyokong calon, untuk paparan "Sumber". */
function sourcesOf(c: Candidate) {
  const all = [
    ...c.assignments.flatMap((a) => a.variant.evidence),
    ...c.requirements.flatMap((r) => r.evidence),
    ...c.package.stays.flatMap((s) => s.evidence),
  ];
  const seen = new Map<
    string,
    { sourceId: string; pdfPage: number; brochurePage?: number; verified: boolean }
  >();
  for (const e of all) {
    const key = `${e.sourceId}:${e.pdfPage}`;
    const prev = seen.get(key);
    seen.set(key, {
      sourceId: e.sourceId,
      pdfPage: e.pdfPage,
      ...(e.brochurePage !== undefined ? { brochurePage: e.brochurePage } : {}),
      verified: (prev?.verified ?? true) && e.status === "verified",
    });
  }
  return [...seen.values()].sort((a, b) => a.pdfPage - b.pdfPage);
}

export function candidateDTO(c: Candidate, seasonId: string) {
  return {
    id: c.id,
    group: c.group,
    score: c.score,
    coverage: c.coverage,
    blockedFromPrimary: c.blockedFromPrimary,
    pjh: pjhDTO(c.pjh, seasonId),
    package: packageDTO(c.package),
    assignments: c.assignments.map((a) => ({
      room: a.room,
      variant: variantDTO(a.variant),
      aziziyahRoom: a.aziziyahRoom,
      aziziyahUpgrade: a.aziziyahUpgrade
        ? {
            id: a.aziziyahUpgrade.id,
            description: a.aziziyahUpgrade.description,
            price: moneyOrNull(a.aziziyahUpgrade.priceSen),
            basis: a.aziziyahUpgrade.basis,
          }
        : null,
      perPerson: moneyOrNull(a.perPersonSen),
    })),
    cost: costDTO(c.cost),
    requirements: c.requirements.map(requirementDTO),
    dimensions: c.dimensions,
    reasons: c.reasons,
    compromises: c.compromises,
    uncertainties: c.uncertainties,
    questionsForPjh: c.questionsForPjh,
    sources: sourcesOf(c),
  };
}

export type CandidateDTO = ReturnType<typeof candidateDTO>;

/**
 * Hasil penilaian. Semua calon full_match dan needs_verification dipulangkan; not_matching
 * dihadkan (dipaparkan hanya sebagai alternatif perubahan syarat) dengan jumlah sebenar.
 */
export function assessmentDTO(r: AssessmentResult, options: { notMatchingLimit?: number } = {}) {
  const limit = options.notMatchingLimit ?? 10;
  const shownNotMatching = new Set(r.groups.not_matching.slice(0, limit));
  const nearestIds = new Set(r.noMatch?.nearest.map((n) => n.candidateId) ?? []);
  const recommendedIds = new Set(r.recommendations.map((x) => x.candidateId));
  const candidates = r.candidates
    .filter(
      (c) =>
        c.group !== "not_matching" ||
        shownNotMatching.has(c.id) ||
        nearestIds.has(c.id) ||
        recommendedIds.has(c.id),
    )
    .map((c) => candidateDTO(c, r.seasonId));
  return {
    seasonId: r.seasonId,
    datasetVersion: r.datasetVersion,
    scoringRulesVersion: r.scoringRulesVersion,
    engineVersion: r.engineVersion,
    coverage: r.coverage,
    counts: {
      full_match: r.groups.full_match.length,
      needs_verification: r.groups.needs_verification.length,
      not_matching: r.groups.not_matching.length,
      rejected: r.rejected.length,
      archived: r.archived.length,
    },
    groups: {
      full_match: r.groups.full_match,
      needs_verification: r.groups.needs_verification,
      not_matching: r.groups.not_matching.filter((id) => candidates.some((c) => c.id === id)),
    },
    recommendations: r.recommendations,
    noMatch: r.noMatch
      ? {
          message: r.noMatch.message,
          reasons: r.noMatch.reasons,
          nearest: r.noMatch.nearest.map((n) => ({
            candidateId: n.candidateId,
            failingHard: n.failingHard,
            extraBudgetPerPerson: moneyOrNull(n.extraBudgetPerPersonSen),
            description: n.description,
          })),
        }
      : null,
    rejected: r.rejected,
    archived: r.archived,
    candidates,
  };
}
