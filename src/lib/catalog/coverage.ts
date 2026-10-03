// Bina entri manifest liputan (spesifikasi §23.3) daripada laporan validasi. Fungsi tulen.
import type { CatalogFileReport } from "./validate";

export type ProcessingStatus = "not_started" | "in_progress" | "reviewed" | "blocked";

export interface CoverageEntry {
  index: number;
  id: string;
  label: string;
  legalName: string | null;
  seasonId: string;
  sourceIds: string[];
  pageRange: [number, number];
  pagesExpected: number;
  pagesReviewed: number[];
  packageFamiliesIdentified: number | null;
  variantsIdentified: number | null;
  variantsImported: number;
  variantsPublished: number;
  excludedVariants: { description: string; reason: string }[];
  processingStatus: ProcessingStatus;
  approvalStatus: "unverified" | "verified_approved" | "not_approved";
  licenceNumberAsPublished: string | null;
  factsVerified: number;
  fieldsNotPublished: number | null;
  unreadablePages: number[];
  unresolvedVariants: string[];
  gaps: string[];
  reviewedAt: string | null;
  reviewer: string | null;
}

export function coverageEntry(
  base: { index: number; id: string; label: string; pageRange: [number, number]; seasonId: string },
  report: CatalogFileReport | null,
): CoverageEntry {
  const [a, b] = base.pageRange;
  const empty: CoverageEntry = {
    ...base,
    legalName: null,
    sourceIds: ["compilation-34pjh-1448h"],
    pagesExpected: b - a + 1,
    pagesReviewed: [],
    packageFamiliesIdentified: null,
    variantsIdentified: null,
    variantsImported: 0,
    variantsPublished: 0,
    excludedVariants: [],
    processingStatus: "not_started",
    approvalStatus: "unverified",
    licenceNumberAsPublished: null,
    factsVerified: 0,
    fieldsNotPublished: null,
    unreadablePages: [],
    unresolvedVariants: [],
    gaps: [],
    reviewedAt: null,
    reviewer: null,
  };
  if (!report) return empty;
  if (!report.ok || !report.file) {
    return {
      ...empty,
      processingStatus: "blocked",
      gaps: report.errors.map((e) => `Fail katalog tidak sah: ${e}`),
    };
  }
  const f = report.file;
  const excluded = f.excludedItems.filter((e) => e.countsAsVariant);
  const variants = f.packages.flatMap((p) => p.variants.map((v) => ({ p, v })));
  const unresolved = variants
    .filter(({ v }) => v.priceSen === null)
    .map(({ p, v }) => `${p.id}/${v.code}`);
  const allEvidence = [
    ...f.packages.flatMap((p) => [
      ...p.duration.evidence,
      ...p.tarwiyah.evidence,
      ...p.aziziyah.evidence,
      ...p.stays.flatMap((s) => s.evidence),
      ...p.variants.flatMap((v) => v.priceEvidence),
    ]),
    ...f.upgrades.flatMap((u) => u.evidence),
    ...f.charges.flatMap((c) => c.evidence),
  ];
  const unreadable = f.gaps
    .filter((g) => g.severity === "blocking" && g.field === "unreadable_page")
    .flatMap((g) => g.pages);
  const blocking = f.gaps.filter((g) => g.severity === "blocking");
  const allPagesReviewed = report.summary!.pagesMissing.length === 0;
  const hasUnclearPrice = variants.some(({ v }) =>
    v.priceEvidence.some((e) => e.status === "unclear"),
  );
  let status: ProcessingStatus = "in_progress";
  if (blocking.length || unresolved.length || unreadable.length || hasUnclearPrice)
    status = "blocked";
  else if (allPagesReviewed && f.transcription.independentCheck) status = "reviewed";

  return {
    ...empty,
    legalName: f.pjh.legalName,
    sourceIds: [f.source.sourceId],
    pagesReviewed: [...f.source.pagesReviewed].sort((x, y) => x - y),
    packageFamiliesIdentified: f.packages.length,
    variantsIdentified: variants.length + excluded.length,
    variantsImported: variants.length,
    excludedVariants: excluded.map((e) => ({ description: e.description, reason: e.reason })),
    processingStatus: status,
    licenceNumberAsPublished: f.pjh.licenceNumberAsPublished,
    factsVerified: allEvidence.filter((e) => e.status === "verified").length,
    fieldsNotPublished: f.gaps.filter((g) => g.severity === "non_blocking").length,
    unreadablePages: unreadable,
    unresolvedVariants: unresolved,
    gaps: f.gaps.map((g) => `[${g.severity}] ${g.packageId ?? f.pjh.id}: ${g.field} — ${g.note}`),
    reviewedAt: f.transcription.independentCheck?.checkedAt ?? f.transcription.reviewedAt,
    reviewer: f.transcription.independentCheck
      ? `${f.transcription.reviewer}; semakan bebas: ${f.transcription.independentCheck.reviewer}`
      : `${f.transcription.reviewer} (semakan bebas belum dibuat)`,
  };
}
