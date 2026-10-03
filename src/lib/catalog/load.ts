// Tukar fail katalog JSON (sudah disahkan) kepada objek engine. Fungsi tulen.
import type { Catalog, Charge, Evidence, Package, Pjh, Upgrade, Variant } from "../engine/types";
import type { PjhCatalogFile } from "./schema";

type FileEvidence = PjhCatalogFile["packages"][number]["duration"]["evidence"][number];

const toEvidence = (e: FileEvidence): Evidence => ({
  sourceId: e.sourceId,
  pdfPage: e.pdfPage,
  ...(e.brochurePage !== undefined ? { brochurePage: e.brochurePage } : {}),
  text: e.text,
  status: e.status,
});
const evs = (list: FileEvidence[]) => list.map(toEvidence);
const toSen = (n: number | null) => (n === null ? null : BigInt(n));

export const variantId = (packageId: string, code: string, makkah: number, category: string) =>
  `${packageId}--${code.toLowerCase()}${category === "adult" ? "" : `--${category}`}-q${makkah}`;

export function toEngineCatalog(files: PjhCatalogFile[], datasetVersion: string): Catalog {
  const seasonIds = new Set(files.map((f) => f.seasonId));
  if (seasonIds.size > 1) {
    throw new Error(`Data musim bercampur: ${[...seasonIds].join(", ")}`);
  }
  const seasonId = files[0]?.seasonId ?? "";
  const pjhs: Pjh[] = [];
  const packages: Package[] = [];
  const variants: Variant[] = [];
  const upgrades: Upgrade[] = [];
  const charges: Charge[] = [];

  for (const f of files) {
    pjhs.push({
      id: f.pjh.id,
      name: f.pjh.name,
      website: f.pjh.website,
      publicContact: f.pjh.publicContact,
      approvals: [
        {
          seasonId: f.seasonId,
          status: f.pjh.approval.status,
          licenceNumberAsPublished: f.pjh.licenceNumberAsPublished,
          verifiedAt: f.pjh.approval.verifiedAt,
          evidence: evs(f.pjh.licenceEvidence),
        },
      ],
      terms: f.pjh.terms.map((t) => ({ text: t.text, evidence: evs(t.evidence) })),
    });

    const codeToVariantIds = new Map<string, string[]>();
    for (const p of f.packages) {
      packages.push({
        id: p.id,
        pjhId: f.pjh.id,
        seasonId: f.seasonId,
        name: p.name,
        series: p.series,
        tierLabel: p.tierLabel,
        duration: { ...p.duration, evidence: evs(p.duration.evidence) },
        tarwiyah: { ...p.tarwiyah, evidence: evs(p.tarwiyah.evidence) },
        aziziyah: { ...p.aziziyah, evidence: evs(p.aziziyah.evidence) },
        masyair: { ...p.masyair, evidence: evs(p.masyair.evidence) },
        relocations: { ...p.relocations, evidence: evs(p.relocations.evidence) },
        flightClass: { value: p.flightClass.value, evidence: evs(p.flightClass.evidence) },
        trainClass: { value: p.trainClass.value, evidence: evs(p.trainClass.evidence) },
        meals: { description: p.meals.description, evidence: evs(p.meals.evidence) },
        travelDates: { label: p.travelDates.label, evidence: evs(p.travelDates.evidence) },
        exclusions: p.exclusions.map((x) => ({ text: x.text, evidence: evs(x.evidence) })),
        availability: {
          status: p.availability.status,
          verifiedAt: null,
          note: p.availability.note,
        },
        publishedStatus: p.publishedStatus,
        unresolvedConflicts: p.unresolvedConflicts,
        stays: p.stays.map((s) => ({ ...s, evidence: evs(s.evidence) })),
        inclusions: p.inclusions.map((i) => ({ ...i, evidence: evs(i.evidence) })),
      });
      for (const v of p.variants) {
        const id = variantId(p.id, v.code, v.makkahOccupancy, v.travellerCategory);
        variants.push({
          id,
          packageId: p.id,
          code: v.code,
          codeIsInternal: v.codeIsInternal,
          priceSen: toSen(v.priceSen),
          currency: v.currency,
          makkahOccupancy: v.makkahOccupancy,
          madinahOccupancy: v.madinahOccupancy,
          aziziyahOccupancy: v.aziziyahOccupancy,
          pmnStatus: v.pmnStatus,
          travellerCategory: v.travellerCategory,
          roomLabelAsPublished: v.roomLabelAsPublished,
          notes: v.notes,
          evidence: evs(v.priceEvidence),
        });
        const key = `${p.id}|${v.code}`;
        codeToVariantIds.set(key, [...(codeToVariantIds.get(key) ?? []), id]);
      }
    }

    const resolve = (pkgIds: string[], codes: string[]) =>
      codes.flatMap((c) => pkgIds.flatMap((pid) => codeToVariantIds.get(`${pid}|${c}`) ?? []));

    for (const u of f.upgrades) {
      upgrades.push({
        id: u.id,
        packageIds: u.packageIds,
        applicableVariantIds: resolve(u.packageIds, u.applicableVariantCodes),
        includedInVariantIds: resolve(u.packageIds, u.includedInVariantCodes),
        kind: u.kind,
        description: u.description,
        priceSen: toSen(u.priceSen),
        basis: u.basis,
        nightCount: u.nightCount,
        resultingOccupancy: u.resultingOccupancy,
        availability: u.availability,
        condition: u.condition,
        evidence: evs(u.evidence),
      });
    }
    for (const c of f.charges) {
      charges.push({
        id: c.id,
        packageIds: c.packageIds,
        description: c.description,
        priceSen: toSen(c.priceSen),
        basis: c.basis,
        nightCount: c.nightCount,
        included: c.included,
        kind: c.kind,
        evidence: evs(c.evidence),
      });
    }
  }

  return { datasetVersion, seasonId, pjhs, packages, variants, upgrades, charges };
}
