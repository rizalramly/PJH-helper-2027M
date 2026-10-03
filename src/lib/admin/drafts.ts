// Draf suntingan katalog (satu PJH setiap draf): drafts/<musim>/<pjh-id>.json dalam stor JSON.
// Aliran: buka draf (salinan fail aktif) → sunting/import → hantar → semak & luluskan → terbit.
import { createHash } from "node:crypto";

import { PAGE_INDEX } from "../catalog/page-index";
import type { PjhCatalogFileInput } from "../catalog/schema";
import { validateCatalogFile } from "../catalog/validate";
import { appendAudit, canonical } from "../storage/catalog-repo";
import { ConflictError, type JsonKV } from "../storage/kv";
import { applyOps, OpError, withReviewReset, type DraftOp, type OpContext } from "./ops";

export type DraftStatus = "draft" | "submitted" | "approved";

export interface DraftEvent {
  at: string;
  by: string;
  action: "create" | "edit" | "import" | "submit" | "approve" | "reopen";
  note: string | null;
}

export interface Draft {
  schemaVersion: 1;
  seasonId: string;
  pjhId: string;
  /** Versi dataset aktif ketika draf dibuka (null jika tiada versi aktif dalam stor). */
  baseVersion: string | null;
  /** Hash fail PJH asal; penerbitan ditolak jika fail aktif telah berubah sejak itu. */
  baseHash: string | null;
  status: DraftStatus;
  file: PjhCatalogFileInput;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  events: DraftEvent[];
}

export interface BaseCatalog {
  seasonId: string;
  datasetVersion: string | null;
  files: PjhCatalogFileInput[];
  coverage: unknown;
}

export const draftPath = (seasonId: string, pjhId: string) =>
  `drafts/${seasonId.toLowerCase()}/${pjhId}.json`;

export const fileHash = (f: unknown) =>
  createHash("sha256").update(canonical(f)).digest("hex").slice(0, 24);

const MAX_EVENTS = 50;
const withEvent = (d: Draft, e: DraftEvent): Draft => ({
  ...d,
  updatedAt: e.at,
  updatedBy: e.by,
  events: [...d.events, e].slice(-MAX_EVENTS),
});

export class DraftError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DraftError";
  }
}

export interface DraftValidation {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

/** Validasi pra-terbit bagi satu fail draf (skema, rujukan, bukti dan semakan tambahan). */
export function validateDraftFile(file: unknown, pjhId: string, seasonId: string): DraftValidation {
  const report = validateCatalogFile(file, pjhId, PAGE_INDEX);
  const errors = [...report.errors];
  const warnings = [...report.warnings];
  const f = report.file;
  if (f) {
    if (f.seasonId !== seasonId) errors.push(`musim fail ${f.seasonId} ≠ ${seasonId}`);
    for (const p of f.packages) {
      if (p.unresolvedConflicts.length)
        warnings.push(
          `${p.id}: ${p.unresolvedConflicts.length} konflik belum selesai (tidak layak cadangan utama)`,
        );
      for (const v of p.variants)
        if (v.priceEvidence.some((e) => e.status === "unclear" || e.status === "conflict"))
          warnings.push(`${p.id}/${v.code}: bukti harga kabur atau bercanggah`);
    }
    const blocking = f.gaps.filter((g) => g.severity === "blocking");
    if (blocking.length)
      warnings.push(
        `${blocking.length} jurang data menghalang; PJH akan berstatus "Tersekat" dalam liputan`,
      );
    if (f.pjh.approval.status !== "unverified" && !f.pjh.approval.officialSource)
      errors.push("kelulusan disahkan tanpa sumber rasmi");
  }
  return { ok: errors.length === 0, errors, warnings };
}

export async function getDraft(kv: JsonKV, seasonId: string, pjhId: string) {
  return kv.getJSON<Draft>(draftPath(seasonId, pjhId));
}

export async function listDrafts(kv: JsonKV, seasonId: string): Promise<Draft[]> {
  const paths = await kv.list(`drafts/${seasonId.toLowerCase()}/`);
  const drafts = await Promise.all(paths.map((p) => kv.getJSON<Draft>(p)));
  return drafts.flatMap((d) => (d ? [d.value] : [])).sort((a, b) => a.pjhId.localeCompare(b.pjhId));
}

function newDraft(
  base: BaseCatalog,
  pjhId: string,
  file: PjhCatalogFileInput,
  baseFile: PjhCatalogFileInput | null,
  ctx: OpContext,
  action: DraftEvent["action"],
  note: string | null,
): Draft {
  const at = ctx.now.toISOString();
  return {
    schemaVersion: 1,
    seasonId: base.seasonId,
    pjhId,
    baseVersion: base.datasetVersion,
    baseHash: baseFile ? fileHash(baseFile) : null,
    status: "draft",
    file,
    createdAt: at,
    createdBy: ctx.actor,
    updatedAt: at,
    updatedBy: ctx.actor,
    events: [{ at, by: ctx.actor, action, note }],
  };
}

/** Buka draf bagi PJH (salinan fail aktif); pulangkan draf sedia ada jika sudah wujud. */
export async function openDraft(kv: JsonKV, base: BaseCatalog, pjhId: string, ctx: OpContext) {
  const existing = await getDraft(kv, base.seasonId, pjhId);
  if (existing) return existing;
  const baseFile = base.files.find((f) => f.pjh.id === pjhId);
  if (!baseFile) throw new DraftError(`PJH ${pjhId} tiada dalam katalog aktif. Guna import JSON.`);
  const draft = newDraft(base, pjhId, structuredClone(baseFile), baseFile, ctx, "create", null);
  const { etag } = await kv.putJSON(draftPath(base.seasonId, pjhId), draft, { createOnly: true });
  await appendAudit(kv, {
    at: draft.createdAt,
    actor: ctx.actor,
    action: "draft_create",
    seasonId: base.seasonId,
    target: pjhId,
  });
  return { value: draft, etag };
}

async function loadForWrite(kv: JsonKV, seasonId: string, pjhId: string, etag: string) {
  const current = await getDraft(kv, seasonId, pjhId);
  if (!current) throw new DraftError(`Draf ${pjhId} tidak wujud.`);
  if (current.etag !== etag) {
    throw new ConflictError("Draf telah diubah oleh pengguna lain. Muat semula halaman.");
  }
  return current;
}

const opSummary = (ops: DraftOp[]) => {
  const counts = new Map<string, number>();
  for (const o of ops) counts.set(o.op, (counts.get(o.op) ?? 0) + 1);
  return [...counts].map(([k, n]) => `${k}×${n}`).join(", ");
};

/** Laksanakan operasi suntingan. Status kembali kepada "draft" dan semakan dibatalkan. */
export async function editDraft(
  kv: JsonKV,
  key: { seasonId: string; pjhId: string; etag: string },
  ops: DraftOp[],
  ctx: OpContext,
  action: "edit" | "import" = "edit",
) {
  const current = await loadForWrite(kv, key.seasonId, key.pjhId, key.etag);
  const file = applyOps(current.value.file, ops, ctx);
  const note = opSummary(ops);
  const next = withEvent(
    { ...current.value, status: "draft", file },
    { at: ctx.now.toISOString(), by: ctx.actor, action, note },
  );
  const { etag } = await kv.putJSON(draftPath(key.seasonId, key.pjhId), next, {
    ifMatch: current.etag,
  });
  await appendAudit(kv, {
    at: ctx.now.toISOString(),
    actor: ctx.actor,
    action: action === "import" ? "draft_import" : "draft_update",
    seasonId: key.seasonId,
    target: key.pjhId,
    note,
  });
  return { value: next, etag };
}

/** Import fail JSON penuh satu PJH sebagai draf (tidak terus diterbitkan). */
export async function importJsonDraft(
  kv: JsonKV,
  base: BaseCatalog,
  raw: unknown,
  ctx: OpContext,
  replace: boolean,
) {
  const f = raw as Partial<PjhCatalogFileInput> | null;
  const pjhId = f?.pjh?.id;
  if (!pjhId || typeof pjhId !== "string" || !/^[a-z0-9-]+$/.test(pjhId)) {
    throw new DraftError("Fail tidak mempunyai pjh.id yang sah.");
  }
  if (f?.seasonId !== base.seasonId) {
    throw new DraftError(`seasonId fail (${String(f?.seasonId)}) mesti ${base.seasonId}.`);
  }
  const baseFile = base.files.find((x) => x.pjh.id === pjhId) ?? null;
  const existing = await getDraft(kv, base.seasonId, pjhId);
  if (existing && !replace) {
    throw new DraftError(`Draf ${pjhId} sudah wujud. Tandakan "gantikan draf" untuk menimpanya.`);
  }
  const prevApproval = (existing?.value.file ?? baseFile)?.pjh.approval?.status ?? "unverified";
  if (ctx.role !== "admin" && (f.pjh?.approval?.status ?? "unverified") !== prevApproval) {
    throw new OpError("Hanya pentadbir boleh menukar status kelulusan PJH.");
  }
  const file = withReviewReset(raw as PjhCatalogFileInput);
  const draft = existing
    ? withEvent(
        { ...existing.value, status: "draft", file },
        { at: ctx.now.toISOString(), by: ctx.actor, action: "import", note: "JSON penuh" },
      )
    : newDraft(base, pjhId, file, baseFile, ctx, "import", "JSON penuh");
  const { etag } = await kv.putJSON(
    draftPath(base.seasonId, pjhId),
    draft,
    existing ? { ifMatch: existing.etag } : { createOnly: true },
  );
  await appendAudit(kv, {
    at: ctx.now.toISOString(),
    actor: ctx.actor,
    action: "draft_import",
    seasonId: base.seasonId,
    target: pjhId,
    note: "JSON penuh",
  });
  return { value: draft, etag };
}

/** Hantar untuk semakan, luluskan (memerlukan validasi lulus) atau buka semula draf. */
export async function reviewDraft(
  kv: JsonKV,
  key: { seasonId: string; pjhId: string; etag: string },
  action: "submit" | "approve" | "reopen",
  ctx: OpContext,
  notes: string | null,
) {
  const current = await loadForWrite(kv, key.seasonId, key.pjhId, key.etag);
  const d = current.value;
  let next: Draft;
  if (action === "approve") {
    const v = validateDraftFile(d.file, d.pjhId, d.seasonId);
    if (!v.ok) {
      throw new DraftError(`Draf belum boleh diluluskan: ${v.errors.length} ralat validasi.`);
    }
    next = {
      ...d,
      status: "approved",
      file: {
        ...d.file,
        review: {
          status: "approved",
          approvedBy: ctx.actor,
          approvedAt: ctx.now.toISOString(),
          notes,
        },
      },
    };
  } else if (action === "submit") {
    next = { ...d, status: "submitted" };
  } else {
    next = { ...d, status: "draft", file: withReviewReset(d.file) };
  }
  next = withEvent(next, { at: ctx.now.toISOString(), by: ctx.actor, action, note: notes });
  const { etag } = await kv.putJSON(draftPath(key.seasonId, key.pjhId), next, {
    ifMatch: current.etag,
  });
  await appendAudit(kv, {
    at: ctx.now.toISOString(),
    actor: ctx.actor,
    action:
      action === "approve"
        ? "draft_approve"
        : action === "submit"
          ? "draft_submit"
          : "draft_update",
    seasonId: key.seasonId,
    target: key.pjhId,
    ...(notes ? { note: notes } : {}),
  });
  return { value: next, etag };
}

export async function discardDraft(
  kv: JsonKV,
  key: { seasonId: string; pjhId: string; etag: string },
  ctx: OpContext,
) {
  await loadForWrite(kv, key.seasonId, key.pjhId, key.etag);
  await kv.delete(draftPath(key.seasonId, key.pjhId));
  await appendAudit(kv, {
    at: ctx.now.toISOString(),
    actor: ctx.actor,
    action: "draft_discard",
    seasonId: key.seasonId,
    target: key.pjhId,
  });
}
