// Bentuk respons API seperti diterima pelayar (JSON; wang sebagai { sen, text }).
import type { assessmentDTO, CandidateDTO } from "../api/dto";
import type { ComparisonRow } from "../engine/compare";
import type { SummaryItem } from "../wizard/state";
import type { RequirementsInput } from "../validation/requirements";

export type { CandidateDTO };

export interface PjhReviewInfo {
  label: string;
  processingStatus: string;
  approvalStatus: string;
  reviewedAt: string | null;
}

export type AssessResponse = ReturnType<typeof assessmentDTO> & {
  coverageSummary: {
    totals: Record<string, number> | null;
    generatedAt: string | null;
    pjhs: Record<string, PjhReviewInfo>;
  };
};

export interface CompareResponse {
  seasonId: string;
  datasetVersion: string;
  scoringRulesVersion: string;
  engineVersion: string;
  candidateIds: string[];
  rows: ComparisonRow[];
  priceDifferences: string[];
  candidates: CandidateDTO[];
}

export interface AssessRequest {
  requirements: RequirementsInput;
  options: { diversifyPjh: boolean };
}

/** Permintaan terakhir dari wizard, berserta ringkasan input untuk laporan. */
export interface SavedRequest {
  request: AssessRequest;
  summary: SummaryItem[];
}

export interface ApiErrorBody {
  error: { code: string; message: string; details?: { field: string; message: string }[] };
}
