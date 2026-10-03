import "server-only";

import type { CoverageEntry } from "../catalog/coverage";
import { PAGE_INDEX, PRIMARY_SOURCE } from "../catalog/page-index";
import {
  getActivePointer,
  listAuditEvents,
  listDatasetVersions,
  type AuditEvent,
} from "../storage/catalog-repo";
import type { Store } from "../storage/env";
import { loadBaseCatalog } from "./base";
import { diffFiles, type DiffItem } from "./diff";
import {
  getDraft,
  listDrafts,
  validateDraftFile,
  type Draft,
  type DraftValidation,
} from "./drafts";

export async function recentAudit(store: Store, limit = 15): Promise<AuditEvent[]> {
  const month = new Date().toISOString().slice(0, 7);
  const events = await listAuditEvents(store.kv, month);
  return events.reverse().slice(0, limit);
}

export async function dashboard(store: Store, seasonId: string) {
  const [pointer, versions, drafts, base] = await Promise.all([
    getActivePointer(store.kv, seasonId),
    listDatasetVersions(store.kv, seasonId),
    listDrafts(store.kv, seasonId),
    loadBaseCatalog(store, seasonId).catch(() => null),
  ]);
  const coverage = base?.coverage as
    { totals?: Record<string, number>; generatedAt?: string } | undefined;
  return {
    pointer,
    versions,
    drafts,
    baseVersion: base?.datasetVersion ?? null,
    totals: coverage?.totals ?? null,
    generatedAt: coverage?.generatedAt ?? null,
  };
}

export interface PjhRow {
  id: string;
  index: number;
  label: string;
  name: string;
  pageRange: [number, number];
  packages: number;
  variants: number;
  processingStatus: CoverageEntry["processingStatus"];
  approvalStatus: CoverageEntry["approvalStatus"];
  reviewStatus: string;
  draft: Pick<Draft, "status" | "updatedAt" | "updatedBy"> | null;
}

export async function pjhRows(store: Store, seasonId: string): Promise<PjhRow[]> {
  const [base, drafts] = await Promise.all([
    loadBaseCatalog(store, seasonId),
    listDrafts(store.kv, seasonId),
  ]);
  const cov = ((base.coverage as { pjhs?: CoverageEntry[] }).pjhs ?? []).reduce(
    (m, e) => m.set(e.id, e),
    new Map<string, CoverageEntry>(),
  );
  return PAGE_INDEX.map((p) => {
    const f = base.files.find((x) => x.pjh.id === p.id);
    const d = drafts.find((x) => x.pjhId === p.id);
    return {
      id: p.id,
      index: p.index,
      label: p.label,
      name: f?.pjh.name ?? p.label,
      pageRange: [p.pdf_pages[0], p.pdf_pages[1]] as [number, number],
      packages: f?.packages.length ?? 0,
      variants: f?.packages.reduce((n, x) => n + x.variants.length, 0) ?? 0,
      processingStatus: cov.get(p.id)?.processingStatus ?? "not_started",
      approvalStatus: f?.pjh.approval?.status ?? "unverified",
      reviewStatus: f?.review?.status ?? "unreviewed",
      draft: d ? { status: d.status, updatedAt: d.updatedAt, updatedBy: d.updatedBy } : null,
    };
  });
}

export interface DraftView {
  draft: Draft;
  etag: string;
  validation: DraftValidation;
  diff: DiffItem[];
  baseVersion: string | null;
  pageRange: [number, number];
  sourceSha: string;
}

export async function draftView(
  store: Store,
  seasonId: string,
  pjhId: string,
): Promise<DraftView | null> {
  const d = await getDraft(store.kv, seasonId, pjhId);
  if (!d) return null;
  const base = await loadBaseCatalog(store, seasonId);
  const baseFile = base.files.find((f) => f.pjh.id === pjhId) ?? null;
  const entry = PAGE_INDEX.find((p) => p.id === pjhId);
  return {
    draft: d.value,
    etag: d.etag,
    validation: validateDraftFile(d.value.file, pjhId, seasonId),
    diff: diffFiles(baseFile, d.value.file),
    baseVersion: base.datasetVersion,
    pageRange: entry ? [entry.pdf_pages[0], entry.pdf_pages[1]] : [1, 1],
    sourceSha: PRIMARY_SOURCE.document_hash.replace(/^sha256:/, ""),
  };
}
