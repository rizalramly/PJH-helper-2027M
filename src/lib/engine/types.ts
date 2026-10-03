// Jenis teras engine. Engine ialah fungsi tulen: tiada I/O, tiada jam sistem.
// Wang sentiasa integer sen (bigint). `null` = tidak dinyatakan dalam sumber, bukan sifar.

export type EvidenceStatus = "transcribed" | "verified" | "conflict" | "unclear";

export interface Evidence {
  sourceId: string;
  /** Halaman PDF dalam fail sumber (kompilasi). */
  pdfPage: number;
  /** Halaman brosur asal PJH, jika diketahui. */
  brochurePage?: number;
  /** Petikan asal daripada sumber. */
  text: string;
  status: EvidenceStatus;
}

export type TarwiyahStatus =
  "offered" | "offered_subject_to_approval" | "explicitly_not_offered" | "not_stated";

export type AziziyahStatus = "included" | "optional" | "explicitly_not_included" | "not_stated";

export type PmnStatus = "included" | "not_included" | "not_stated";

export type AvailabilityStatus = "published" | "inquiry_required" | "sold_out" | "withdrawn";

export type ApprovalStatus = "verified_approved" | "unverified" | "not_approved";

export type PricingBasis = "per_person" | "per_room" | "per_group" | "per_night";

export type StayLocation = "makkah" | "madinah" | "aziziyah" | "mina";

export type DistanceReference =
  "haram_courtyard" | "nabawi_courtyard" | "jamarat" | "other" | "not_stated";

export type TravellerCategory = "adult" | "child_with_bed" | "child_no_bed" | "infant";

export type TransportClass = "business" | "economy" | "not_stated";

export interface Season {
  id: string;
  hijriYear: number;
  gregorianYear: number;
  label: string;
  active: boolean;
}

export interface PjhApproval {
  seasonId: string;
  status: ApprovalStatus;
  /** Nombor lesen seperti dicetak dalam sumber; bukan bukti kelulusan. */
  licenceNumberAsPublished: string | null;
  verifiedAt: string | null;
  evidence: Evidence[];
}

export interface Pjh {
  id: string;
  name: string;
  website: string | null;
  publicContact: string | null;
  approvals: PjhApproval[];
  terms: { text: string; evidence: Evidence[] }[];
}

export interface Stay {
  location: StayLocation;
  sequence: number;
  hotelNameAsPublished: string;
  orEquivalent: boolean;
  roomCategory: string | null;
  dateLabel: string | null;
  nightCount: number | null;
  distanceM: number | null;
  distanceIsApproximate: boolean;
  distanceReference: DistanceReference;
  distanceReferenceAsPublished: string | null;
  meals: string | null;
  roomSizeSqm: number | null;
  privateBathroom: boolean | null;
  privateForBookingGroup: boolean | null;
  genderSeparated: boolean | null;
  evidence: Evidence[];
}

export interface Inclusion {
  text: string;
  condition: string | null;
  evidence: Evidence[];
}

export interface Package {
  id: string;
  pjhId: string;
  seasonId: string;
  name: string;
  series: string;
  tierLabel: string | null;
  duration: {
    value: number | null;
    min: number | null;
    max: number | null;
    approximate: boolean;
    evidence: Evidence[];
  };
  tarwiyah: {
    status: TarwiyahStatus;
    condition: string | null;
    description: string | null;
    evidence: Evidence[];
  };
  aziziyah: {
    status: AziziyahStatus;
    condition: string | null;
    /** Susunan bilik asal Aziziyah (cth. [4,5,6] ikut jantina). */
    defaultOccupancies: number[] | null;
    defaultArrangementNote: string | null;
    labelAsPublished: string | null;
    dateLabel: string | null;
    nightCount: number | null;
    evidence: Evidence[];
  };
  masyair: {
    type: "pmn" | "muaisim" | "not_stated";
    description: string | null;
    evidence: Evidence[];
  };
  /** Bilangan perpindahan hotel yang dinyatakan; null = tidak dinyatakan. */
  relocations: { count: number | null; note: string | null; evidence: Evidence[] };
  flightClass: { value: TransportClass; evidence: Evidence[] };
  trainClass: { value: TransportClass; evidence: Evidence[] };
  meals: { description: string | null; evidence: Evidence[] };
  travelDates: { label: string | null; evidence: Evidence[] };
  exclusions: { text: string; evidence: Evidence[] }[];
  availability: { status: AvailabilityStatus; verifiedAt: string | null; note: string | null };
  publishedStatus: "published" | "draft" | "archived";
  /** Konflik data yang belum diselesaikan bagi harga/hotel. */
  unresolvedConflicts: string[];
  stays: Stay[];
  inclusions: Inclusion[];
}

export interface Variant {
  id: string;
  packageId: string;
  code: string;
  /** true jika PJH tidak menerbitkan kod; ID dalaman stabil digunakan. */
  codeIsInternal: boolean;
  /** Harga seorang dalam sen; null = harga tidak dinyatakan. */
  priceSen: bigint | null;
  currency: "MYR";
  makkahOccupancy: number;
  madinahOccupancy: number;
  /** Susunan bilik Aziziyah khusus varian; null = ikut pakej. */
  aziziyahOccupancy: number | null;
  pmnStatus: PmnStatus;
  /** Kategori pengembara; engine hanya menilai `adult`. */
  travellerCategory: TravellerCategory;
  /** Label bilik seperti dicetak (cth. "Bilik Ber-4"). */
  roomLabelAsPublished: string | null;
  notes: string | null;
  evidence: Evidence[];
}

export interface Upgrade {
  id: string;
  packageIds: string[];
  /** Varian yang boleh mengambil naik taraf ini; [] = semua varian dalam pakej. */
  applicableVariantIds: string[];
  /** Varian yang sudah termasuk naik taraf ini dalam harga. */
  includedInVariantIds: string[];
  kind: "aziziyah_room" | "meal" | "other";
  description: string;
  priceSen: bigint | null;
  basis: PricingBasis;
  /** Untuk per_night: bilangan malam yang dinyatakan; null = tidak diketahui. */
  nightCount: number | null;
  resultingOccupancy: number | null;
  availability: AvailabilityStatus;
  condition: string | null;
  evidence: Evidence[];
}

export interface Charge {
  id: string;
  packageIds: string[];
  description: string;
  priceSen: bigint | null;
  basis: PricingBasis;
  nightCount: number | null;
  /** Sudah termasuk dalam harga varian: tidak ditambah semula. */
  included: boolean;
  /** mandatory = sentiasa dikenakan; conditional = hanya jika sesuatu berlaku. */
  kind: "mandatory" | "conditional";
  evidence: Evidence[];
}

export interface Catalog {
  datasetVersion: string;
  seasonId: string;
  pjhs: Pjh[];
  packages: Package[];
  variants: Variant[];
  upgrades: Upgrade[];
  charges: Charge[];
}

// ---------------------------------------------------------------------------
// Keperluan pengguna

export interface RoomSpec {
  /** Bilangan jemaah dalam rombongan yang menghuni bilik ini. */
  pilgrims: number;
  makkah: number;
  madinah: number;
  /** Susunan bilik Aziziyah yang dikehendaki; null = ikut susunan asal pakej. */
  aziziyah: number | null;
}

export type Importance = "important" | "normal" | "dont_care";

export type Dimension =
  | "savings"
  | "comfort"
  | "masyair"
  | "proximity"
  | "duration"
  | "relocations"
  | "tarwiyah"
  | "aziziyah";

export type ComfortFeature = "private_bathroom" | "min_room_size" | "fullboard";

export interface Requirements {
  seasonId: string;
  rooms: RoomSpec[];
  budget: {
    perPersonSen: bigint;
    scope: "package_only" | "all_in";
    /** Peruntukan seorang yang pengguna masukkan (belanja peribadi dsb.), untuk scope all_in. */
    extrasPerPersonSen: bigint;
    hard: boolean;
  };
  aziziyah: {
    mode: "required" | "preferred" | "not_wanted" | "any";
    /** Terima Aziziyah yang tertakluk kebenaran pihak berkuasa. */
    acceptConditional: boolean;
  };
  duration: {
    min: number | null;
    max: number | null;
    target: number | null;
    tolerance: number | null;
    acceptApproximate: boolean;
    hard: boolean;
  };
  tarwiyah: {
    mode: "required" | "preferred" | "any" | "want_not_offered";
    acceptConditional: boolean;
  };
  pmn: "required" | "preferred" | "any";
  privateRoom: "required" | "preferred" | "any";
  proximity: { maxMakkahM: number | null; maxMadinahM: number | null };
  comfortFeatures: ComfortFeature[];
  minRoomSizeSqm: number | null;
  importance: Partial<Record<Dimension, Importance>>;
}

// ---------------------------------------------------------------------------
// Hasil

export type ReqStatus = "MEMENUHI" | "BERSYARAT" | "PERLU_PENGESAHAN" | "TIDAK_MEMENUHI";

export type ResultGroup = "full_match" | "needs_verification" | "not_matching";

export type RequirementKey =
  | "budget"
  | "rooms"
  | "aziziyah"
  | "aziziyah_room"
  | "duration"
  | "tarwiyah"
  | "pmn"
  | "private_room";

export interface RequirementResult {
  key: RequirementKey;
  label: string;
  status: ReqStatus;
  hard: boolean;
  detail: string;
  /** Halang label "Cadangan utama" (cth. kos tidak lengkap). */
  blocksPrimary: boolean;
  evidence: Evidence[];
}

export interface CostLine {
  label: string;
  /** null = Unpriced. */
  amountSen: bigint | null;
  kind: "variant" | "upgrade" | "charge" | "included" | "extras";
  basis?: PricingBasis;
  quantity?: number;
  evidence: Evidence[];
}

export type AziziyahRoomResolution =
  | "not_requested"
  | "no_aziziyah"
  | "default"
  | "included"
  | "upgrade"
  | "upgrade_unpriced"
  | "not_offered";

export interface RoomAssignment {
  room: RoomSpec;
  variant: Variant;
  aziziyahUpgrade: Upgrade | null;
  aziziyahRoom: AziziyahRoomResolution;
  /** Kos PJH diketahui seorang bagi bilik ini; null jika harga varian tidak diketahui. */
  perPersonSen: bigint | null;
}

export interface CostBreakdown {
  lines: CostLine[];
  /** Kos PJH diketahui bagi seluruh kumpulan (tanpa peruntukan peribadi). */
  knownGroupSen: bigint;
  /** Kos dibandingkan dengan bajet (termasuk peruntukan jika all_in). */
  comparedGroupSen: bigint;
  budgetGroupSen: bigint;
  remainingSen: bigint;
  complete: boolean;
  unpriced: string[];
  conditionalCharges: string[];
  pilgrims: number;
}

export interface DimensionScore {
  dimension: Dimension;
  weight: number;
  utility: number;
  known: boolean;
  /** Bahagian dimensi yang mempunyai data sah (0–1), untuk liputan bukti. */
  knownFraction: number;
  note: string;
}

export interface Candidate {
  id: string;
  pjh: Pjh;
  package: Package;
  assignments: RoomAssignment[];
  cost: CostBreakdown;
  requirements: RequirementResult[];
  group: ResultGroup;
  score: number;
  coverage: number;
  dimensions: DimensionScore[];
  reasons: string[];
  compromises: string[];
  uncertainties: string[];
  questionsForPjh: string[];
  approvalStatus: ApprovalStatus;
  blockedFromPrimary: boolean;
}

export interface RejectedConfiguration {
  packageId: string;
  packageName: string;
  reason: string;
}

export type RecommendationLabel =
  "CADANGAN_UTAMA" | "ALTERNATIF_JIMAT" | "ALTERNATIF_KESELESAAN" | "CALON_BERSYARAT";

export interface Recommendation {
  label: RecommendationLabel;
  candidateId: string;
  narrative: string;
}

export interface MinimalChange {
  candidateId: string;
  failingHard: RequirementKey[];
  extraBudgetPerPersonSen: bigint | null;
  description: string;
}

export interface ScoringRules {
  version: string;
  weights: Record<Dimension, number>;
  importanceMultiplier: Record<Exclude<Importance, "dont_care">, number>;
}

export interface AssessmentResult {
  seasonId: string;
  datasetVersion: string;
  scoringRulesVersion: string;
  engineVersion: string;
  coverage: { pjhCount: number; packageCount: number; variantCount: number };
  candidates: Candidate[];
  groups: Record<ResultGroup, string[]>;
  archived: string[];
  rejected: RejectedConfiguration[];
  recommendations: Recommendation[];
  noMatch: null | { message: string; reasons: string[]; nearest: MinimalChange[] };
  inputErrors: string[];
}
