import { pjhCatalogFileSchema, type PjhCatalogFile } from "./schema";

export interface PageIndexEntry {
  id: string;
  pdf_pages: [number, number] | number[];
}

export interface CatalogFileReport {
  ok: boolean;
  errors: string[];
  warnings: string[];
  file: PjhCatalogFile | null;
  summary: {
    packages: number;
    variants: number;
    adultVariants: number;
    pricedVariants: number;
    unpricedVariants: number;
    excludedVariantItems: number;
    blockingGaps: number;
    pagesMissing: number[];
  } | null;
}

/** Sahkan satu fail katalog PJH. Fungsi tulen: tiada I/O. */
export function validateCatalogFile(
  raw: unknown,
  expectedId: string,
  pageIndex: PageIndexEntry[],
): CatalogFileReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const parsed = pjhCatalogFileSchema.safeParse(raw);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push(`skema: ${issue.path.join(".")}: ${issue.message}`);
    }
    return { ok: false, errors, warnings, file: null, summary: null };
  }
  const f = parsed.data;
  const pjhId = f.pjh.id;
  if (pjhId !== expectedId)
    errors.push(`pjh.id "${pjhId}" tidak sama dengan nama fail "${expectedId}"`);

  const indexEntry = pageIndex.find((p) => p.id === pjhId);
  if (!indexEntry) {
    errors.push(`pjh.id "${pjhId}" tiada dalam indeks halaman manifest`);
  } else {
    const [a, b] = indexEntry.pdf_pages;
    if (f.source.pageRange[0] !== a || f.source.pageRange[1] !== b) {
      errors.push(`source.pageRange ${f.source.pageRange.join("–")} ≠ indeks ${a}–${b}`);
    }
  }
  const [lo, hi] = f.source.pageRange;
  const inRange = (p: number) => p >= lo && p <= hi;
  const reviewed = new Set(f.source.pagesReviewed);
  for (const p of reviewed) if (!inRange(p)) errors.push(`pagesReviewed ${p} di luar julat`);
  const pagesMissing: number[] = [];
  for (let p = lo; p <= hi; p++) if (!reviewed.has(p)) pagesMissing.push(p);
  const notedPages = new Set(f.source.pageNotes.map((n) => n.pdfPage));
  for (const p of reviewed)
    if (!notedPages.has(p)) warnings.push(`hlm. ${p} disemak tetapi tiada pageNotes`);

  // Semua evidence mesti dalam julat halaman PJH ini.
  const checkEvidence = (where: string, ev: { pdfPage: number }[]) => {
    for (const e of ev)
      if (!inRange(e.pdfPage)) errors.push(`${where}: evidence hlm. ${e.pdfPage} di luar julat`);
  };

  const packageIds = new Set<string>();
  const codesByPackage = new Map<string, Set<string>>();
  let variants = 0;
  let adultVariants = 0;
  let priced = 0;
  let unpriced = 0;
  for (const pkg of f.packages) {
    if (packageIds.has(pkg.id)) errors.push(`pakej pendua: ${pkg.id}`);
    packageIds.add(pkg.id);
    if (!pkg.id.startsWith(`${pjhId}-`))
      errors.push(`pakej ${pkg.id} mesti bermula dengan "${pjhId}-"`);
    const codes = new Set<string>();
    const keys = new Set<string>();
    for (const v of pkg.variants) {
      variants++;
      const key = `${v.code}|${v.makkahOccupancy}|${v.madinahOccupancy}|${v.travellerCategory}`;
      if (keys.has(key)) errors.push(`${pkg.id}: varian pendua ${key}`);
      keys.add(key);
      codes.add(v.code);
      if (v.travellerCategory === "adult") adultVariants++;
      if (v.priceSen === null) unpriced++;
      else priced++;
      if (v.priceSen !== null && v.priceSen < 100_000) {
        warnings.push(
          `${pkg.id}/${v.code}: harga ${v.priceSen} sen sangat rendah, semak unit (sen)`,
        );
      }
      checkEvidence(`${pkg.id}/${v.code}`, v.priceEvidence);
    }
    codesByPackage.set(pkg.id, codes);
    const seqs = new Set<number>();
    for (const s of pkg.stays) {
      if (seqs.has(s.sequence)) errors.push(`${pkg.id}: stays.sequence ${s.sequence} pendua`);
      seqs.add(s.sequence);
      checkEvidence(`${pkg.id}/stay ${s.sequence}`, s.evidence);
    }
    for (const [name, ev] of [
      ["duration", pkg.duration.evidence],
      ["tarwiyah", pkg.tarwiyah.evidence],
      ["aziziyah", pkg.aziziyah.evidence],
      ["masyair", pkg.masyair.evidence],
    ] as const) {
      checkEvidence(`${pkg.id}/${name}`, ev);
    }
    if (pkg.tarwiyah.status !== "not_stated" && pkg.tarwiyah.evidence.length === 0) {
      errors.push(`${pkg.id}: tarwiyah ${pkg.tarwiyah.status} tanpa evidence`);
    }
    if (pkg.aziziyah.status !== "not_stated" && pkg.aziziyah.evidence.length === 0) {
      errors.push(`${pkg.id}: aziziyah ${pkg.aziziyah.status} tanpa evidence`);
    }
    if (pkg.duration.value !== null && pkg.duration.evidence.length === 0) {
      errors.push(`${pkg.id}: tempoh tanpa evidence`);
    }
  }

  const checkRefs = (kind: string, id: string, pkgIds: string[], codeLists: string[][]) => {
    for (const pid of pkgIds)
      if (!packageIds.has(pid)) errors.push(`${kind} ${id}: pakej ${pid} tidak wujud`);
    const allCodes = new Set(pkgIds.flatMap((pid) => [...(codesByPackage.get(pid) ?? [])]));
    for (const list of codeLists) {
      for (const c of list)
        if (!allCodes.has(c)) errors.push(`${kind} ${id}: kod ${c} tiada dalam pakej berkaitan`);
    }
  };
  const ids = new Set<string>();
  for (const u of f.upgrades) {
    if (ids.has(u.id)) errors.push(`id pendua: ${u.id}`);
    ids.add(u.id);
    checkRefs("upgrade", u.id, u.packageIds, [u.applicableVariantCodes, u.includedInVariantCodes]);
    checkEvidence(`upgrade ${u.id}`, u.evidence);
    if (u.basis === "per_night" && u.priceSen !== null && u.nightCount === null) {
      warnings.push(`upgrade ${u.id}: per_night tanpa nightCount → akan dikira Unpriced`);
    }
  }
  for (const c of f.charges) {
    if (ids.has(c.id)) errors.push(`id pendua: ${c.id}`);
    ids.add(c.id);
    checkRefs("charge", c.id, c.packageIds, []);
    checkEvidence(`charge ${c.id}`, c.evidence);
  }
  for (const g of f.gaps) {
    if (g.packageId && !packageIds.has(g.packageId))
      errors.push(`gap: pakej ${g.packageId} tidak wujud`);
  }
  const excludedVariantItems = f.excludedItems.filter((e) => e.countsAsVariant).length;
  const blockingGaps = f.gaps.filter((g) => g.severity === "blocking").length;
  if (pagesMissing.length) warnings.push(`halaman belum disemak: ${pagesMissing.join(", ")}`);

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    file: f,
    summary: {
      packages: f.packages.length,
      variants,
      adultVariants,
      pricedVariants: priced,
      unpricedVariants: unpriced,
      excludedVariantItems,
      blockingGaps,
      pagesMissing,
    },
  };
}
