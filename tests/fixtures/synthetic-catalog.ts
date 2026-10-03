// FIXTURE SINTETIK untuk ujian sahaja. PJH rekaan; season_id "TEST". Jangan dipaparkan sebagai pakej sebenar.
import type { Catalog, Charge, Package, Upgrade, Variant } from "@/lib/engine/types";

const ev = [
  { sourceId: "synthetic", pdfPage: 1, text: "SINTETIK", status: "transcribed" as const },
];

export function synthPackage(id: string, o: Partial<Package> = {}): Package {
  return {
    id,
    pjhId: "sintetik-a",
    seasonId: "TEST",
    name: `Pakej Sintetik ${id}`,
    series: "Sintetik",
    tierLabel: null,
    duration: { value: 40, min: null, max: null, approximate: false, evidence: ev },
    tarwiyah: { status: "offered", condition: null, description: null, evidence: ev },
    aziziyah: {
      status: "included",
      condition: null,
      defaultOccupancies: [4],
      defaultArrangementNote: null,
      labelAsPublished: null,
      dateLabel: null,
      nightCount: null,
      evidence: ev,
    },
    masyair: { type: "pmn", description: null, evidence: ev },
    relocations: { count: 2, note: null, evidence: ev },
    flightClass: { value: "not_stated", evidence: [] },
    trainClass: { value: "not_stated", evidence: [] },
    meals: { description: null, evidence: [] },
    travelDates: { label: null, evidence: [] },
    exclusions: [],
    availability: { status: "inquiry_required", verifiedAt: null, note: null },
    publishedStatus: "published",
    unresolvedConflicts: [],
    stays: [
      {
        location: "makkah",
        sequence: 1,
        hotelNameAsPublished: "Hotel Sintetik M",
        orEquivalent: false,
        roomCategory: null,
        dateLabel: null,
        nightCount: null,
        distanceM: 100,
        distanceIsApproximate: false,
        distanceReference: "haram_courtyard",
        distanceReferenceAsPublished: null,
        meals: "Fullboard",
        roomSizeSqm: null,
        privateBathroom: true,
        privateForBookingGroup: null,
        genderSeparated: null,
        evidence: ev,
      },
      {
        location: "madinah",
        sequence: 2,
        hotelNameAsPublished: "Hotel Sintetik N",
        orEquivalent: false,
        roomCategory: null,
        dateLabel: null,
        nightCount: null,
        distanceM: 200,
        distanceIsApproximate: false,
        distanceReference: "nabawi_courtyard",
        distanceReferenceAsPublished: null,
        meals: "Fullboard",
        roomSizeSqm: null,
        privateBathroom: null,
        privateForBookingGroup: null,
        genderSeparated: null,
        evidence: ev,
      },
    ],
    inclusions: [],
    ...o,
  };
}

export function synthVariant(
  packageId: string,
  code: string,
  occ: number,
  priceSen: bigint | null,
  o: Partial<Variant> = {},
): Variant {
  return {
    id: `${packageId}--${code}`,
    packageId,
    code,
    codeIsInternal: false,
    priceSen,
    currency: "MYR",
    makkahOccupancy: occ,
    madinahOccupancy: occ,
    aziziyahOccupancy: null,
    pmnStatus: "included",
    travellerCategory: "adult",
    roomLabelAsPublished: null,
    notes: null,
    evidence: ev,
    ...o,
  };
}

export function synthUpgrade(id: string, packageIds: string[], o: Partial<Upgrade>): Upgrade {
  return {
    id,
    packageIds,
    applicableVariantIds: [],
    includedInVariantIds: [],
    kind: "aziziyah_room",
    description: `Naik taraf sintetik ${id}`,
    priceSen: 100_000n,
    basis: "per_person",
    nightCount: null,
    resultingOccupancy: 2,
    availability: "inquiry_required",
    condition: null,
    evidence: ev,
    ...o,
  };
}

export function synthCharge(id: string, packageIds: string[], o: Partial<Charge>): Charge {
  return {
    id,
    packageIds,
    description: `Caj sintetik ${id}`,
    priceSen: 50_000n,
    basis: "per_person",
    nightCount: null,
    included: false,
    kind: "mandatory",
    evidence: ev,
    ...o,
  };
}

export function synthCatalog(parts: Partial<Catalog>): Catalog {
  return {
    datasetVersion: "synthetic",
    seasonId: "TEST",
    pjhs: [
      {
        id: "sintetik-a",
        name: "PJH Sintetik A",
        website: null,
        publicContact: null,
        approvals: [
          {
            seasonId: "TEST",
            status: "unverified",
            licenceNumberAsPublished: null,
            verifiedAt: null,
            evidence: [],
          },
        ],
        terms: [],
      },
      {
        id: "sintetik-b",
        name: "PJH Sintetik B",
        website: null,
        publicContact: null,
        approvals: [
          {
            seasonId: "TEST",
            status: "verified_approved",
            licenceNumberAsPublished: null,
            verifiedAt: "2026-10-01",
            evidence: [],
          },
        ],
        terms: [],
      },
    ],
    packages: [],
    variants: [],
    upgrades: [],
    charges: [],
    ...parts,
  };
}
