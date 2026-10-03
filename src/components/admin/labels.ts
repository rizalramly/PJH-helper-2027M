// Label BM dan status lencana untuk panel pentadbir.
import type { ReqStatus } from "@/lib/engine/types";

export { APPROVAL, PROCESSING } from "@/lib/catalog/status-labels";

export const DRAFT_STATUS: Record<string, { text: string; status: ReqStatus }> = {
  draft: { text: "Draf", status: "BERSYARAT" },
  submitted: { text: "Menunggu semakan", status: "PERLU_PENGESAHAN" },
  approved: { text: "Diluluskan semakan", status: "MEMENUHI" },
};

export const REVIEW: Record<string, { text: string; status: ReqStatus }> = {
  approved: { text: "Diluluskan pentadbir", status: "MEMENUHI" },
  unreviewed: { text: "Belum disemak pentadbir", status: "PERLU_PENGESAHAN" },
};

export const AUDIT_ACTION: Record<string, string> = {
  publish: "Terbit versi",
  activate: "Aktifkan versi",
  draft_create: "Buka draf",
  draft_update: "Sunting draf",
  draft_import: "Import ke draf",
  draft_submit: "Hantar untuk semakan",
  draft_approve: "Luluskan semakan",
  draft_discard: "Buang draf",
  source_upload: "Muat naik sumber",
  season_update: "Kemas kini musim",
  user_create: "Cipta pengguna",
  user_update: "Kemas kini pengguna",
  login: "Log masuk",
  login_failed: "Log masuk gagal",
  logout: "Log keluar",
};

export const fmtDateTime = (iso: string | null | undefined) =>
  iso
    ? new Intl.DateTimeFormat("ms-MY", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kuala_Lumpur",
      }).format(new Date(iso))
    : "—";
