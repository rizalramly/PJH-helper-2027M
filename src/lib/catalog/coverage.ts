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
    approvalStatus: f.pjh.approval.status,
    // "Diterbitkan" = diluluskan dalam semakan pentadbir; pakej yang diarkibkan tidak dikira.
    variantsPublished:
      f.review.status === "approved"
        ? f.packages
            .filter((p) => p.publishedStatus === "published")
            .reduce((n, p) => n + p.variants.length, 0)
        : 0,
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

export interface CoverageTotals {
  pjhExpected: number;
  pjhWithCatalogFile: number;
  pjhReviewed: number;
  pjhBlocked: number;
  pjhApprovalVerified: number;
  packageFamilies: number;
  variantsIdentified: number;
  variantsImported: number;
  variantsPublished: number;
  unresolvedVariants: number;
}

export function coverageTotals(pjhs: CoverageEntry[]): CoverageTotals {
  return {
    pjhExpected: pjhs.length,
    pjhWithCatalogFile: pjhs.filter((p) => p.processingStatus !== "not_started").length,
    pjhReviewed: pjhs.filter((p) => p.processingStatus === "reviewed").length,
    pjhBlocked: pjhs.filter((p) => p.processingStatus === "blocked").length,
    pjhApprovalVerified: pjhs.filter((p) => p.approvalStatus === "verified_approved").length,
    packageFamilies: pjhs.reduce((n, p) => n + (p.packageFamiliesIdentified ?? 0), 0),
    variantsIdentified: pjhs.reduce((n, p) => n + (p.variantsIdentified ?? 0), 0),
    variantsImported: pjhs.reduce((n, p) => n + p.variantsImported, 0),
    variantsPublished: pjhs.reduce((n, p) => n + p.variantsPublished, 0),
    unresolvedVariants: pjhs.reduce((n, p) => n + p.unresolvedVariants.length, 0),
  };
}

export interface PageIndexPjh {
  index: number;
  id: string;
  label: string;
  pdf_pages: number[];
}

/**
 * Manifest liputan penuh (spesifikasi §23.3) daripada laporan validasi setiap PJH.
 * Digunakan oleh skrip `catalog:coverage` dan oleh penerbitan pentadbir. Fungsi tulen.
 */
export function buildCoverageManifest(input: {
  seasonId: string;
  pageIndex: PageIndexPjh[];
  reports: Map<string, CatalogFileReport | null>;
  meta: {
    $comment?: string;
    datasetVersion?: string | null;
    generatedAt: string;
    sources: string[];
    pagesTotal: number;
    nonPjhPages: number[];
  };
}) {
  const pjhs = input.pageIndex.map((p) =>
    coverageEntry(
      {
        index: p.index,
        id: p.id,
        label: p.label,
        pageRange: [p.pdf_pages[0], p.pdf_pages[1]],
        seasonId: input.seasonId,
      },
      input.reports.get(p.id) ?? null,
    ),
  );
  return {
    ...(input.meta.$comment ? { $comment: input.meta.$comment } : {}),
    seasonId: input.seasonId,
    datasetVersion: input.meta.datasetVersion ?? null,
    generatedAt: input.meta.generatedAt,
    sources: input.meta.sources,
    pagesTotal: input.meta.pagesTotal,
    nonPjhPages: input.meta.nonPjhPages,
    totals: coverageTotals(pjhs),
    pjhs,
  };
}
