// Keadaan wizard (JSON, disimpan pada peranti) dan penukaran kepada permintaan /api/assess.
// Fungsi tulen; tiada akses DOM.
import { budgetFloorSen, formatRM, parseRMToSen } from "../engine/money";
import type { RequirementsInput } from "../validation/requirements";

export const WIZARD_STORAGE_KEY = "pjh.wizard.v1";
export const STEPS = [
  { id: 1, title: "Mula", short: "Mula" },
  { id: 2, title: "Bilik", short: "Bilik" },
  { id: 3, title: "Perjalanan", short: "Perjalanan" },
  { id: 4, title: "Keutamaan", short: "Keutamaan" },
  { id: 5, title: "Semakan", short: "Semakan" },
] as const;
export type StepId = (typeof STEPS)[number]["id"];

export type PartyType = "couple" | "single" | "group";
export type Need = "required" | "preferred" | "any";
export type ImportanceLevel = "important" | "normal" | "dont_care";

export interface RoomState {
  id: string;
  pilgrims: number;
  makkah: number;
  madinahSame: boolean;
  madinah: number;
  /** "default" = ikut susunan asal pakej. */
  aziziyah: "default" | number;
}

export interface WizardState {
  version: 1;
  seasonId: string;
  partyType: PartyType;
  rooms: RoomState[];
  budgetPerPersonRM: string;
  budgetScope: "package_only" | "all_in";
  extrasPerPersonRM: string;
  budgetHard: boolean;
  durationMode: "any" | "target" | "range";
  durationTarget: string;
  durationTolerance: string;
  durationMin: string;
  durationMax: string;
  acceptApproximate: boolean;
  durationHard: boolean;
  aziziyahMode: "required" | "preferred" | "not_wanted" | "any";
  aziziyahAcceptConditional: boolean;
  tarwiyahMode: "required" | "preferred" | "any" | "want_not_offered";
  tarwiyahAcceptConditional: boolean;
  pmn: Need;
  importance: {
    savings: ImportanceLevel;
    proximity: ImportanceLevel;
    masyair: ImportanceLevel;
    relocations: ImportanceLevel;
  };
  proximityMakkahM: string;
  proximityMadinahM: string;
  diversifyPjh: boolean;
}

let roomCounter = 0;
export const newRoom = (o: Partial<RoomState> = {}): RoomState => ({
  id: `bilik-${Date.now().toString(36)}-${(roomCounter++).toString(36)}`,
  pilgrims: 2,
  makkah: 2,
  madinahSame: true,
  madinah: 2,
  aziziyah: "default",
  ...o,
});

export function initialState(seasonId = "1448H"): WizardState {
  return {
    version: 1,
    seasonId,
    partyType: "couple",
    rooms: [newRoom({ id: "bilik-1" })],
    budgetPerPersonRM: "",
    budgetScope: "package_only",
    extrasPerPersonRM: "",
    budgetHard: true,
    durationMode: "any",
    durationTarget: "40",
    durationTolerance: "5",
    durationMin: "",
    durationMax: "",
    acceptApproximate: true,
    durationHard: true,
    aziziyahMode: "any",
    aziziyahAcceptConditional: true,
    tarwiyahMode: "any",
    tarwiyahAcceptConditional: true,
    pmn: "any",
    importance: {
      savings: "normal",
      proximity: "dont_care",
      masyair: "normal",
      relocations: "normal",
    },
    proximityMakkahM: "",
    proximityMadinahM: "",
    diversifyPjh: false,
  };
}

/** Pratetap bilik ikut jenis rombongan (boleh diubah dalam langkah Bilik). */
export function roomsForParty(party: PartyType): RoomState[] {
  if (party === "couple") return [newRoom({ id: "bilik-1", pilgrims: 2, makkah: 2, madinah: 2 })];
  if (party === "single") return [newRoom({ id: "bilik-1", pilgrims: 1, makkah: 4, madinah: 4 })];
  return [
    newRoom({ id: "bilik-1", pilgrims: 2, makkah: 2, madinah: 2 }),
    newRoom({ id: "bilik-2", pilgrims: 2, makkah: 2, madinah: 2 }),
  ];
}

export const totalPilgrims = (s: WizardState) => s.rooms.reduce((n, r) => n + r.pilgrims, 0);
export const madinahOf = (r: RoomState) => (r.madinahSame ? r.makkah : r.madinah);

/** Baca keadaan tersimpan dengan selamat (versi lain atau rosak → null). */
export function restoreState(raw: string | null): WizardState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<WizardState>;
    if (parsed.version !== 1 || !Array.isArray(parsed.rooms) || parsed.rooms.length === 0)
      return null;
    return { ...initialState(parsed.seasonId), ...parsed } as WizardState;
  } catch {
    return null;
  }
}

export interface FieldError {
  field: string;
  message: string;
}

const intOrNull = (s: string) => (/^\d+$/.test(s.trim()) ? Number(s.trim()) : null);

/** Ralat bagi satu langkah (BM, menyatakan punca dan cara membetulkan). */
export function validateStep(s: WizardState, step: StepId): FieldError[] {
  const e: FieldError[] = [];
  if (step === 1) {
    const sen = parseRMToSen(s.budgetPerPersonRM);
    if (!s.budgetPerPersonRM.trim())
      e.push({
        field: "budgetPerPersonRM",
        message: "Masukkan bajet seorang dalam RM, contohnya 100000.",
      });
    else if (sen === null || sen <= 0n)
      e.push({
        field: "budgetPerPersonRM",
        message: "Bajet mesti nombor RM yang sah, contohnya 100000 atau 100,000.",
      });
    if (s.budgetScope === "all_in") {
      const x = parseRMToSen(s.extrasPerPersonRM);
      if (x === null)
        e.push({
          field: "extrasPerPersonRM",
          message:
            "Masukkan peruntukan tambahan seorang (RM), atau pilih bajet untuk pakej sahaja.",
        });
    }
  }
  if (step === 2) {
    if (s.rooms.length === 0)
      e.push({ field: "rooms", message: "Tambah sekurang-kurangnya satu bilik." });
    s.rooms.forEach((r, i) => {
      const n = `Bilik ${i + 1}`;
      if (r.pilgrims > r.makkah)
        e.push({
          field: `rooms.${i}.makkah`,
          message: `${n}: ${r.pilgrims} jemaah tidak muat dalam bilik Makkah ber-${r.makkah}. Pilih bilik lebih besar atau kurangkan jemaah.`,
        });
      if (r.pilgrims > madinahOf(r))
        e.push({
          field: `rooms.${i}.madinah`,
          message: `${n}: ${r.pilgrims} jemaah tidak muat dalam bilik Madinah ber-${madinahOf(r)}.`,
        });
      if (r.aziziyah !== "default" && r.pilgrims > r.aziziyah)
        e.push({
          field: `rooms.${i}.aziziyah`,
          message: `${n}: ${r.pilgrims} jemaah tidak muat dalam bilik Aziziyah ber-${r.aziziyah}.`,
        });
    });
    if (totalPilgrims(s) > 12)
      e.push({ field: "rooms", message: "Maksimum 12 jemaah bagi satu penilaian." });
  }
  if (step === 3) {
    if (s.durationMode === "target") {
      if (intOrNull(s.durationTarget) === null)
        e.push({
          field: "durationTarget",
          message: "Masukkan sasaran tempoh dalam hari, contohnya 40.",
        });
      if (intOrNull(s.durationTolerance) === null)
        e.push({
          field: "durationTolerance",
          message: "Masukkan toleransi dalam hari (0 jika tepat).",
        });
    }
    if (s.durationMode === "range") {
      const lo = intOrNull(s.durationMin);
      const hi = intOrNull(s.durationMax);
      if (lo === null && hi === null)
        e.push({
          field: "durationMin",
          message: "Masukkan sekurang-kurangnya minimum atau maksimum hari.",
        });
      if (s.durationMin.trim() && lo === null)
        e.push({ field: "durationMin", message: "Minimum hari mesti nombor bulat." });
      if (s.durationMax.trim() && hi === null)
        e.push({ field: "durationMax", message: "Maksimum hari mesti nombor bulat." });
      if (lo !== null && hi !== null && lo > hi)
        e.push({
          field: "durationMax",
          message: "Maksimum hari mesti sama atau lebih besar daripada minimum.",
        });
    }
  }
  // Jarak hanya disahkan apabila medan dipaparkan (kedekatan bukan "Tidak kisah").
  if (step === 4 && s.importance.proximity !== "dont_care") {
    for (const [field, v] of [
      ["proximityMakkahM", s.proximityMakkahM],
      ["proximityMadinahM", s.proximityMadinahM],
    ] as const) {
      if (v.trim() && (intOrNull(v) === null || Number(v) <= 0))
        e.push({ field, message: "Jarak maksimum mesti nombor meter, contohnya 300." });
    }
  }
  return e;
}

export const validateAll = (s: WizardState) =>
  ([1, 2, 3, 4] as StepId[]).flatMap((step) => validateStep(s, step));

/** Tukar keadaan wizard kepada badan permintaan /api/assess. */
export function toAssessRequest(s: WizardState): {
  requirements: RequirementsInput;
  options: { diversifyPjh: boolean };
} {
  const num = (v: string) => intOrNull(v);
  const duration =
    s.durationMode === "target"
      ? {
          target: num(s.durationTarget),
          tolerance: num(s.durationTolerance) ?? 0,
          min: null,
          max: null,
        }
      : s.durationMode === "range"
        ? { min: num(s.durationMin), max: num(s.durationMax), target: null, tolerance: null }
        : { min: null, max: null, target: null, tolerance: null };
  const proximityOn = s.importance.proximity !== "dont_care";
  return {
    requirements: {
      seasonId: s.seasonId,
      rooms: s.rooms.map((r) => ({
        pilgrims: r.pilgrims,
        makkah: r.makkah,
        madinah: madinahOf(r),
        aziziyah: r.aziziyah === "default" ? null : r.aziziyah,
      })),
      budget: {
        perPersonRM: s.budgetPerPersonRM,
        scope: s.budgetScope,
        ...(s.budgetScope === "all_in" ? { extrasPerPersonRM: s.extrasPerPersonRM } : {}),
        hard: s.budgetHard,
      },
      aziziyah: { mode: s.aziziyahMode, acceptConditional: s.aziziyahAcceptConditional },
      duration: { ...duration, acceptApproximate: s.acceptApproximate, hard: s.durationHard },
      tarwiyah: { mode: s.tarwiyahMode, acceptConditional: s.tarwiyahAcceptConditional },
      pmn: s.pmn,
      proximity: {
        maxMakkahM: proximityOn ? num(s.proximityMakkahM) : null,
        maxMadinahM: proximityOn ? num(s.proximityMadinahM) : null,
      },
      comfortFeatures: [],
      importance: {
        savings: s.importance.savings,
        proximity: s.importance.proximity,
        masyair: s.importance.masyair,
        relocations: s.importance.relocations,
      },
    },
    options: { diversifyPjh: s.diversifyPjh },
  };
}

// ---------------------------------------------------------------------------
// Ringkasan untuk langkah Semakan

export interface SummaryItem {
  label: string;
  value: string;
  kind: "wajib" | "keutamaan" | "maklumat";
  step: StepId;
}

const NEED_TEXT: Record<Need, string> = {
  required: "Wajib",
  preferred: "Diutamakan",
  any: "Tidak kisah",
};
const IMPORTANCE_TEXT: Record<ImportanceLevel, string> = {
  important: "Penting",
  normal: "Biasa",
  dont_care: "Tidak kisah",
};

/** Julat bajet yang dicari: RM10,000 di bawah bajet seorang hingga bajet. */
export function budgetRangeText(sen: bigint | null): string {
  return sen === null ? "—" : `${formatRM(budgetFloorSen(sen))} – ${formatRM(sen)}`;
}

export function summarize(s: WizardState): SummaryItem[] {
  const items: SummaryItem[] = [];
  const pilgrims = totalPilgrims(s);
  const sen = parseRMToSen(s.budgetPerPersonRM);
  const rm = (v: bigint | null) => (v === null ? "—" : formatRM(v));
  items.push({ label: "Jemaah", value: `${pilgrims} orang`, kind: "maklumat", step: 1 });
  items.push({
    label: "Bajet seorang",
    value: `${rm(sen)}${s.budgetScope === "all_in" ? ` termasuk peruntukan ${rm(parseRMToSen(s.extrasPerPersonRM))} seorang` : " (pakej dan naik taraf sahaja)"}; julat dicari ${budgetRangeText(sen)} seorang; kumpulan ${sen === null ? "—" : rm(sen * BigInt(pilgrims))}`,
    kind: s.budgetHard ? "wajib" : "keutamaan",
    step: 1,
  });
  s.rooms.forEach((r, i) =>
    items.push({
      label: `Bilik ${i + 1}`,
      value: `${r.pilgrims} jemaah; Makkah ber-${r.makkah}, Madinah ber-${madinahOf(r)}, Aziziyah ${r.aziziyah === "default" ? "ikut susunan asal pakej" : `ber-${r.aziziyah}`}`,
      kind: "wajib",
      step: 2,
    }),
  );
  const az = {
    required: "Wajib ada",
    preferred: "Diutamakan",
    not_wanted: "Wajib tiada",
    any: "Tidak kisah",
  }[s.aziziyahMode];
  items.push({
    label: "Aziziyah",
    value: `${az}${s.aziziyahMode === "required" || s.aziziyahMode === "preferred" ? (s.aziziyahAcceptConditional ? "; terima tawaran tertakluk kebenaran" : "; tidak terima tawaran bersyarat") : ""}`,
    kind:
      s.aziziyahMode === "any"
        ? "maklumat"
        : s.aziziyahMode === "preferred"
          ? "keutamaan"
          : "wajib",
    step: 3,
  });
  const dur =
    s.durationMode === "target"
      ? `Sasaran ${s.durationTarget} hari ± ${s.durationTolerance} hari`
      : s.durationMode === "range"
        ? `${s.durationMin || "…"}–${s.durationMax || "…"} hari`
        : "Tidak kisah";
  items.push({
    label: "Tempoh",
    value: `${dur}${s.durationMode !== "any" ? (s.acceptApproximate ? "; terima tempoh anggaran (±)" : "; perlu tarikh tepat") : ""}`,
    kind: s.durationMode === "any" ? "maklumat" : s.durationHard ? "wajib" : "keutamaan",
    step: 3,
  });
  const tar = {
    required: "Wajib",
    preferred: "Diutamakan",
    any: "Tidak kisah",
    want_not_offered: "Mahu pakej tanpa Tarwiyah",
  }[s.tarwiyahMode];
  items.push({
    label: "Tarwiyah",
    value: `${tar}${s.tarwiyahMode === "required" || s.tarwiyahMode === "preferred" ? (s.tarwiyahAcceptConditional ? "; terima tertakluk kelulusan" : "; tidak terima tawaran bersyarat") : ""}`,
    kind:
      s.tarwiyahMode === "any"
        ? "maklumat"
        : s.tarwiyahMode === "preferred"
          ? "keutamaan"
          : "wajib",
    step: 3,
  });
  items.push({
    label: "PMN",
    value: NEED_TEXT[s.pmn],
    kind: s.pmn === "required" ? "wajib" : s.pmn === "preferred" ? "keutamaan" : "maklumat",
    step: 3,
  });
  items.push({
    label: "Penjimatan",
    value: IMPORTANCE_TEXT[s.importance.savings],
    kind: "keutamaan",
    step: 4,
  });
  items.push({
    label: "Keselesaan masyair",
    value: IMPORTANCE_TEXT[s.importance.masyair],
    kind: "keutamaan",
    step: 4,
  });
  items.push({
    label: "Sedikit perpindahan hotel",
    value: IMPORTANCE_TEXT[s.importance.relocations],
    kind: "keutamaan",
    step: 4,
  });
  items.push({
    label: "Kedekatan hotel",
    value:
      s.importance.proximity === "dont_care"
        ? "Tidak kisah"
        : `${IMPORTANCE_TEXT[s.importance.proximity]}; Makkah ≤ ${s.proximityMakkahM || "—"} m, Madinah ≤ ${s.proximityMadinahM || "—"} m ke perkarangan masjid`,
    kind: "keutamaan",
    step: 4,
  });
  return items;
}
