// Status setiap keperluan (spesifikasi §7) dan pengumpulan hasil (§9). Fungsi tulen.
import { aziziyahDefaults } from "./costing";
import { formatRM } from "./money";
import type {
  CostBreakdown,
  Evidence,
  Package,
  ReqStatus,
  RequirementResult,
  Requirements,
  ResultGroup,
  RoomAssignment,
} from "./types";

const RANK: Record<ReqStatus, number> = {
  MEMENUHI: 0,
  BERSYARAT: 1,
  PERLU_PENGESAHAN: 2,
  TIDAK_MEMENUHI: 3,
};
export const worst = (statuses: ReqStatus[]): ReqStatus =>
  statuses.reduce<ReqStatus>((w, s) => (RANK[s] > RANK[w] ? s : w), "MEMENUHI");

function result(
  key: RequirementResult["key"],
  label: string,
  status: ReqStatus,
  hard: boolean,
  detail: string,
  evidence: Evidence[] = [],
  blocksPrimary = false,
): RequirementResult {
  return { key, label, status, hard, detail, evidence, blocksPrimary };
}

export function evaluateRequirements(
  pkg: Package,
  assignments: RoomAssignment[],
  cost: CostBreakdown,
  req: Requirements,
): RequirementResult[] {
  const out: RequirementResult[] = [];

  // Bajet
  if (cost.remainingSen < 0n) {
    out.push(
      result(
        "budget",
        "Bajet",
        "TIDAK_MEMENUHI",
        req.budget.hard,
        `Kos diketahui ${formatRM(cost.comparedGroupSen)} melebihi bajet kumpulan ${formatRM(cost.budgetGroupSen)} sebanyak ${formatRM(-cost.remainingSen)}.`,
      ),
    );
  } else if (!cost.complete) {
    out.push(
      result(
        "budget",
        "Bajet",
        "BERSYARAT",
        req.budget.hard,
        `Kos diketahui; caj tambahan belum lengkap (${cost.unpriced.join("; ")}). Kos diketahui ${formatRM(cost.comparedGroupSen)} dalam bajet.`,
        [],
        true,
      ),
    );
  } else {
    out.push(
      result(
        "budget",
        "Bajet",
        "MEMENUHI",
        req.budget.hard,
        `Kos ${formatRM(cost.comparedGroupSen)} dalam bajet; baki ${formatRM(cost.remainingSen)}.`,
      ),
    );
  }

  // Susunan bilik Makkah/Madinah (konfigurasi sah sudah disahkan oleh costing)
  out.push(
    result(
      "rooms",
      "Susunan bilik Makkah/Madinah",
      "MEMENUHI",
      true,
      assignments
        .map(
          (a) =>
            `${a.variant.code}: Makkah ber-${a.variant.makkahOccupancy}, Madinah ber-${a.variant.madinahOccupancy}`,
        )
        .join("; "),
      assignments.flatMap((a) => a.variant.evidence),
    ),
  );

  // Bilik khusus untuk rombongan sendiri
  if (req.privateRoom !== "any") {
    const hotelStays = pkg.stays.filter((s) => s.location === "makkah" || s.location === "madinah");
    const shared = assignments.some(
      (a) =>
        a.room.pilgrims < a.variant.makkahOccupancy || a.room.pilgrims < a.variant.madinahOccupancy,
    );
    const flags = hotelStays.map((s) => s.privateForBookingGroup);
    let status: ReqStatus;
    let detail: string;
    if (shared) {
      status = "TIDAK_MEMENUHI";
      detail =
        "Bilangan jemaah kurang daripada kapasiti bilik; bilik akan dikongsi dengan jemaah lain.";
    } else if (flags.length && flags.every((f) => f === true)) {
      status = "MEMENUHI";
      detail = "Sumber menyatakan bilik khusus untuk rombongan yang sama.";
    } else if (flags.some((f) => f === false)) {
      status = "TIDAK_MEMENUHI";
      detail = "Sumber menyatakan bilik tidak dikhususkan untuk rombongan yang sama.";
    } else {
      status = "PERLU_PENGESAHAN";
      detail =
        "Sumber tidak menyatakan sama ada bilik dikhususkan untuk pasangan/rombongan sendiri.";
    }
    out.push(
      result(
        "private_room",
        "Bilik khusus rombongan sendiri",
        status,
        req.privateRoom === "required",
        detail,
        hotelStays.flatMap((s) => s.evidence),
      ),
    );
  }

  // Aziziyah
  const az = pkg.aziziyah;
  if (req.aziziyah.mode !== "any") {
    const hard = req.aziziyah.mode !== "preferred";
    let status: ReqStatus;
    let detail: string;
    if (req.aziziyah.mode === "not_wanted") {
      if (az.status === "explicitly_not_included")
        [status, detail] = ["MEMENUHI", "Pakej menyatakan tiada penginapan Aziziyah."];
      else if (az.status === "optional")
        [status, detail] = ["MEMENUHI", "Aziziyah ialah pilihan dan boleh tidak diambil."];
      else if (az.status === "included")
        [status, detail] = [
          "TIDAK_MEMENUHI",
          "Aziziyah termasuk dalam pakej; sumber tidak menyatakan ia boleh dibuang atau dipotong harga.",
        ];
      else
        [status, detail] = [
          "PERLU_PENGESAHAN",
          "Sumber tidak menyatakan sama ada pakej termasuk Aziziyah.",
        ];
    } else {
      if (az.status === "explicitly_not_included")
        [status, detail] = ["TIDAK_MEMENUHI", "Pakej menyatakan tiada penginapan Aziziyah."];
      else if (az.status === "not_stated")
        [status, detail] = ["PERLU_PENGESAHAN", "Sumber tidak menyatakan Aziziyah."];
      else if (az.status === "optional")
        [status, detail] = [
          "PERLU_PENGESAHAN",
          "Aziziyah ialah pilihan; harga dan konfigurasi perlu disahkan.",
        ];
      else if (az.condition && !req.aziziyah.acceptConditional)
        [status, detail] = [
          "TIDAK_MEMENUHI",
          `Aziziyah tertakluk syarat (${az.condition}); anda tidak menerima tawaran bersyarat.`,
        ];
      else if (az.condition)
        [status, detail] = ["BERSYARAT", `Aziziyah ditawarkan tertakluk syarat: ${az.condition}.`];
      else
        [status, detail] = [
          "MEMENUHI",
          `Aziziyah termasuk${az.dateLabel ? ` (${az.dateLabel})` : ""}.`,
        ];
    }
    out.push(result("aziziyah", "Aziziyah", status, hard, detail, az.evidence));

    // Susunan bilik Aziziyah (dipilih berasingan daripada Makkah)
    const requested = assignments.filter(
      (a) => a.aziziyahRoom !== "not_requested" && a.aziziyahRoom !== "no_aziziyah",
    );
    if (req.aziziyah.mode !== "not_wanted" && requested.length) {
      const per = requested.map((a): [ReqStatus, string, boolean] => {
        const occ = a.room.aziziyah;
        switch (a.aziziyahRoom) {
          case "included":
            return ["MEMENUHI", `Bilik Aziziyah ber-${occ} sudah termasuk.`, false];
          case "default": {
            const defaults = aziziyahDefaults(pkg, a.variant);
            return defaults?.length === 1
              ? [
                  "MEMENUHI",
                  `Susunan asal Aziziyah bagi varian ${a.variant.code} ialah ber-${occ}.`,
                  false,
                ]
              : [
                  "PERLU_PENGESAHAN",
                  `Susunan asal Aziziyah ber-${defaults?.join("/")} diputuskan oleh syarikat${az.defaultArrangementNote ? ` (${az.defaultArrangementNote})` : ""}; ber-${occ} perlu disahkan.`,
                  false,
                ];
          }
          case "upgrade": {
            const u = a.aziziyahUpgrade!;
            const price = `Naik taraf Aziziyah ber-${occ} berharga ${formatRM(u.priceSen!)} (${u.basis === "per_person" ? "seorang" : u.basis})`;
            if (u.condition && !req.aziziyah.acceptConditional)
              return [
                "TIDAK_MEMENUHI",
                `${price} tetapi tertakluk syarat (${u.condition}); anda tidak menerima tawaran bersyarat.`,
                false,
              ];
            if (u.condition) return ["BERSYARAT", `${price}; tertakluk: ${u.condition}.`, false];
            return ["MEMENUHI", `${price}; kekosongan perlu pertanyaan.`, false];
          }
          case "upgrade_unpriced":
            // Naik taraf hanya memenuhi syarat jika harganya diketahui (spesifikasi §7).
            return [
              "PERLU_PENGESAHAN",
              `Naik taraf Aziziyah ber-${occ} ditawarkan tetapi harganya tidak diketahui.`,
              true,
            ];
          case "unknown_default":
            return [
              "PERLU_PENGESAHAN",
              `Susunan bilik Aziziyah bagi varian ${a.variant.code} tidak dinyatakan; ber-${occ} perlu disahkan.`,
              false,
            ];
          default:
            return [
              "TIDAK_MEMENUHI",
              `Tiada naik taraf Aziziyah ber-${occ} untuk varian ${a.variant.code}.`,
              false,
            ];
        }
      });
      out.push(
        result(
          "aziziyah_room",
          "Susunan bilik Aziziyah",
          worst(per.map((p) => p[0])),
          hard,
          [...new Set(per.map((p) => p[1]))].join(" "),
          requested.flatMap((a) => a.aziziyahUpgrade?.evidence ?? az.evidence),
          per.some((p) => p[2]),
        ),
      );
    }
  }

  // Tempoh
  const d = req.duration;
  const tol = d.tolerance ?? 0;
  const lo = d.min ?? (d.target !== null ? d.target - tol : null);
  const hi = d.max ?? (d.target !== null ? d.target + tol : null);
  if (lo !== null || hi !== null) {
    const within = (x: number) => (lo === null || x >= lo) && (hi === null || x <= hi);
    const pd = pkg.duration;
    const want = `${lo ?? "…"}–${hi ?? "…"} hari`;
    let status: ReqStatus;
    let detail: string;
    if (pd.min !== null && pd.max !== null) {
      const range = `${pd.approximate ? "±" : ""}${pd.min}–${pd.max} hari`;
      if (within(pd.min) && within(pd.max))
        [status, detail] = !pd.approximate
          ? ["MEMENUHI", `Tempoh ${range} dalam julat ${want}.`]
          : d.acceptApproximate
            ? [
                "BERSYARAT",
                `Tempoh anggaran ${range} dalam julat ${want}; anda menerima tempoh anggaran.`,
              ]
            : [
                "PERLU_PENGESAHAN",
                `Tempoh hanya anggaran ${range}; tarikh sebenar perlu disahkan.`,
              ];
      else if ((hi !== null && pd.min > hi) || (lo !== null && pd.max < lo))
        [status, detail] = [
          "TIDAK_MEMENUHI",
          `Tempoh ${pd.min}–${pd.max} hari di luar julat ${want}.`,
        ];
      else
        [status, detail] = [
          "PERLU_PENGESAHAN",
          `Tempoh ${pd.min}–${pd.max} hari bertindih dengan julat ${want}; tarikh perlu disahkan.`,
        ];
    } else if (pd.value === null) {
      [status, detail] = ["PERLU_PENGESAHAN", "Sumber tidak menyatakan tempoh."];
    } else if (!within(pd.value)) {
      [status, detail] = [
        "TIDAK_MEMENUHI",
        `Tempoh ${pd.approximate ? "±" : ""}${pd.value} hari di luar julat ${want}.`,
      ];
    } else if (pd.approximate) {
      [status, detail] = d.acceptApproximate
        ? [
            "BERSYARAT",
            `Tempoh anggaran ±${pd.value} hari (julat tepat tidak diterbitkan); anda menerima tempoh anggaran.`,
          ]
        : [
            "PERLU_PENGESAHAN",
            `Tempoh hanya anggaran ±${pd.value} hari; tarikh sebenar perlu disahkan.`,
          ];
    } else {
      [status, detail] = ["MEMENUHI", `Tempoh ${pd.value} hari dalam julat ${want}.`];
    }
    out.push(result("duration", "Tempoh", status, d.hard, detail, pd.evidence));
  }

  // Tarwiyah
  const t = pkg.tarwiyah;
  if (req.tarwiyah.mode !== "any") {
    let status: ReqStatus;
    let detail: string;
    const hard = req.tarwiyah.mode !== "preferred";
    if (req.tarwiyah.mode === "want_not_offered") {
      if (t.status === "explicitly_not_offered")
        [status, detail] = ["MEMENUHI", "Pakej menyatakan Tarwiyah tidak dilaksanakan."];
      else if (t.status === "not_stated")
        [status, detail] = ["PERLU_PENGESAHAN", "Sumber tidak menyatakan Tarwiyah."];
      else [status, detail] = ["TIDAK_MEMENUHI", "Pakej menawarkan Tarwiyah."];
    } else if (t.status === "offered") {
      [status, detail] = ["MEMENUHI", "Tarwiyah ditawarkan."];
    } else if (t.status === "offered_subject_to_approval") {
      [status, detail] = req.tarwiyah.acceptConditional
        ? [
            "BERSYARAT",
            `Tarwiyah ditawarkan tertakluk kelulusan${t.condition ? ` (${t.condition})` : ""}; anda menerima tawaran bersyarat.`,
          ]
        : [
            "TIDAK_MEMENUHI",
            `Tarwiyah hanya ditawarkan tertakluk kelulusan${t.condition ? ` (${t.condition})` : ""}; anda tidak menerima tawaran bersyarat.`,
          ];
    } else if (t.status === "explicitly_not_offered") {
      [status, detail] = ["TIDAK_MEMENUHI", "Pakej menyatakan Tarwiyah tidak dilaksanakan."];
    } else {
      [status, detail] = ["PERLU_PENGESAHAN", "Sumber tidak menyatakan Tarwiyah."];
    }
    out.push(result("tarwiyah", "Tarwiyah", status, hard, detail, t.evidence));
  }

  // PMN
  if (req.pmn !== "any") {
    const statuses = assignments.map((a) => a.variant.pmnStatus);
    let status: ReqStatus;
    let detail: string;
    if (statuses.every((s) => s === "included"))
      [status, detail] = ["MEMENUHI", "Harga varian termasuk PMN."];
    else if (statuses.some((s) => s === "not_included"))
      [status, detail] = ["TIDAK_MEMENUHI", "Varian ini tanpa PMN (khemah Muaisim)."];
    else [status, detail] = ["PERLU_PENGESAHAN", "Sumber tidak menyatakan sama ada PMN termasuk."];
    out.push(result("pmn", "PMN", status, req.pmn === "required", detail, pkg.masyair.evidence));
  }

  return out;
}

export function groupOf(results: RequirementResult[]): ResultGroup {
  const hard = results.filter((r) => r.hard).map((r) => r.status);
  if (hard.includes("TIDAK_MEMENUHI")) return "not_matching";
  if (hard.includes("PERLU_PENGESAHAN")) return "needs_verification";
  return "full_match";
}
