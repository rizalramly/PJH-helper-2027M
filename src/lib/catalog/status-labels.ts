// Label BM dan status lencana bagi status pemprosesan dan kelulusan PJH (Liputan data dan panel).
import type { ReqStatus } from "../engine/types";
import type { CoverageEntry } from "./coverage";

type Label = { text: string; status: ReqStatus };

export const PROCESSING: Record<CoverageEntry["processingStatus"], Label> = {
  reviewed: { text: "Disemak (transkripsi)", status: "MEMENUHI" },
  in_progress: { text: "Sedang diproses", status: "BERSYARAT" },
  blocked: { text: "Tersekat", status: "TIDAK_MEMENUHI" },
  not_started: { text: "Belum dimulakan", status: "PERLU_PENGESAHAN" },
};

export const APPROVAL: Record<CoverageEntry["approvalStatus"], Label> = {
  verified_approved: { text: "Kelulusan disahkan", status: "MEMENUHI" },
  not_approved: { text: "Tidak diluluskan", status: "TIDAK_MEMENUHI" },
  unverified: { text: "Kelulusan belum disahkan", status: "PERLU_PENGESAHAN" },
};
