// Pengiraan kos (spesifikasi §8). Integer sen; caj tidak diketahui = Unpriced, bukan sifar.
import { formatRM, sumSen } from "./money";
import type {
  AziziyahRoomResolution,
  Catalog,
  Charge,
  CostBreakdown,
  CostLine,
  Package,
  PricingBasis,
  Requirements,
  RoomAssignment,
  RoomSpec,
  Upgrade,
  Variant,
} from "./types";

export type CostingResult =
  { ok: true; assignments: RoomAssignment[]; cost: CostBreakdown } | { ok: false; reason: string };

/** Sahkan komposisi bilik sebelum pengiraan. Pulangkan senarai ralat (BM). */
export function validateRooms(rooms: RoomSpec[]): string[] {
  const errors: string[] = [];
  if (rooms.length === 0) errors.push("Sekurang-kurangnya satu bilik diperlukan.");
  rooms.forEach((r, i) => {
    const n = `Bilik ${i + 1}`;
    if (!Number.isInteger(r.pilgrims) || r.pilgrims < 1)
      errors.push(`${n}: bilangan jemaah mesti sekurang-kurangnya 1.`);
    for (const [label, occ] of [
      ["Makkah", r.makkah],
      ["Madinah", r.madinah],
    ] as const) {
      if (!Number.isInteger(occ) || occ < 1) errors.push(`${n}: susunan bilik ${label} tidak sah.`);
      else if (r.pilgrims > occ) {
        errors.push(`${n}: ${r.pilgrims} jemaah tidak muat dalam bilik ${label} ber-${occ}.`);
      }
    }
    if (r.aziziyah !== null && r.pilgrims > r.aziziyah) {
      errors.push(`${n}: ${r.pilgrims} jemaah tidak muat dalam bilik Aziziyah ber-${r.aziziyah}.`);
    }
  });
  return errors;
}

export const totalPilgrims = (rooms: RoomSpec[]) => rooms.reduce((n, r) => n + r.pilgrims, 0);

const appliesTo = (u: Upgrade, pkg: Package, v: Variant) =>
  u.packageIds.includes(pkg.id) &&
  (u.applicableVariantIds.length === 0 ||
    u.applicableVariantIds.includes(v.id) ||
    u.includedInVariantIds.includes(v.id));

/**
 * Kuantiti pendaraban bagi satu bilik.
 * per_person: jemaah dalam bilik; per_room: 1; per_night: bilangan malam (setiap bilik).
 * per_group dikira sekali untuk seluruh kumpulan oleh pemanggil.
 */
function roomQuantity(basis: PricingBasis, room: RoomSpec, nights: number | null): number | null {
  switch (basis) {
    case "per_person":
      return room.pilgrims;
    case "per_room":
      return 1;
    case "per_night":
      return nights;
    case "per_group":
      return null;
  }
}

function pickVariant(candidates: Variant[]): Variant {
  // Tentu: harga diketahui dahulu, kemudian termurah, kemudian kod.
  return [...candidates].sort((a, b) => {
    if ((a.priceSen === null) !== (b.priceSen === null)) return a.priceSen === null ? 1 : -1;
    if (a.priceSen !== null && b.priceSen !== null && a.priceSen !== b.priceSen) {
      return a.priceSen < b.priceSen ? -1 : 1;
    }
    return a.code.localeCompare(b.code);
  })[0];
}

function resolveAziziyah(
  catalog: Catalog,
  pkg: Package,
  room: RoomSpec,
  variant: Variant,
): { resolution: AziziyahRoomResolution; upgrade: Upgrade | null } {
  if (room.aziziyah === null) return { resolution: "not_requested", upgrade: null };
  if (pkg.aziziyah.status !== "included" && pkg.aziziyah.status !== "optional") {
    return { resolution: "no_aziziyah", upgrade: null };
  }
  if (pkg.aziziyah.defaultOccupancies?.includes(room.aziziyah)) {
    return { resolution: "default", upgrade: null };
  }
  const options = catalog.upgrades
    .filter((u) => u.kind === "aziziyah_room" && u.resultingOccupancy === room.aziziyah)
    .filter((u) => appliesTo(u, pkg, variant))
    .sort((a, b) => a.id.localeCompare(b.id));
  const included = options.find((u) => u.includedInVariantIds.includes(variant.id));
  if (included) return { resolution: "included", upgrade: included };
  const upgrade = options[0];
  if (!upgrade) return { resolution: "not_offered", upgrade: null };
  return { resolution: upgrade.priceSen === null ? "upgrade_unpriced" : "upgrade", upgrade };
}

const basisLabel: Record<PricingBasis, string> = {
  per_person: "seorang",
  per_room: "sebilik",
  per_group: "sekumpulan",
  per_night: "semalam",
};

/** Kira kos bagi satu pakej mengikut komposisi bilik pengguna. */
export function costPackage(catalog: Catalog, pkg: Package, req: Requirements): CostingResult {
  const roomErrors = validateRooms(req.rooms);
  if (roomErrors.length) return { ok: false, reason: roomErrors.join(" ") };

  const variants = catalog.variants.filter(
    (v) => v.packageId === pkg.id && v.travellerCategory === "adult",
  );
  const lines: CostLine[] = [];
  const unpriced: string[] = [];
  const assignments: RoomAssignment[] = [];
  const pilgrims = totalPilgrims(req.rooms);

  for (const [i, room] of req.rooms.entries()) {
    const matching = variants.filter(
      (v) => v.makkahOccupancy === room.makkah && v.madinahOccupancy === room.madinah,
    );
    if (matching.length === 0) {
      return {
        ok: false,
        reason: `Tiada harga diterbitkan untuk bilik Makkah ber-${room.makkah} / Madinah ber-${room.madinah} dalam pakej ini.`,
      };
    }
    const variant = pickVariant(matching);
    const roomTag = req.rooms.length > 1 ? ` (bilik ${i + 1})` : "";
    let perPerson: bigint | null = variant.priceSen;

    if (variant.priceSen === null) {
      unpriced.push(`Harga varian ${variant.code}${roomTag} perlu pengesahan`);
      lines.push({
        label: `Harga varian ${variant.code}${roomTag}`,
        amountSen: null,
        kind: "variant",
        evidence: variant.evidence,
      });
    } else {
      lines.push({
        label: `Varian ${variant.code}${roomTag}: ${formatRM(variant.priceSen)} × ${room.pilgrims} jemaah`,
        amountSen: variant.priceSen * BigInt(room.pilgrims),
        kind: "variant",
        basis: "per_person",
        quantity: room.pilgrims,
        evidence: variant.evidence,
      });
    }

    const az = resolveAziziyah(catalog, pkg, room, variant);
    if (az.resolution === "included" && az.upgrade) {
      lines.push({
        label: `${az.upgrade.description}${roomTag}: sudah termasuk`,
        amountSen: 0n,
        kind: "included",
        evidence: az.upgrade.evidence,
      });
    } else if (
      (az.resolution === "upgrade" || az.resolution === "upgrade_unpriced") &&
      az.upgrade
    ) {
      const u = az.upgrade;
      if (u.basis === "per_group") {
        // dikira sekali di bawah
      } else {
        const qty = roomQuantity(u.basis, room, u.nightCount);
        if (u.priceSen === null || qty === null) {
          unpriced.push(`${u.description}${roomTag}`);
          lines.push({
            label: `${u.description}${roomTag}`,
            amountSen: null,
            kind: "upgrade",
            basis: u.basis,
            evidence: u.evidence,
          });
          perPerson = null;
        } else {
          const amount = u.priceSen * BigInt(qty);
          lines.push({
            label: `${u.description}${roomTag}: ${formatRM(u.priceSen)} ${basisLabel[u.basis]} × ${qty}`,
            amountSen: amount,
            kind: "upgrade",
            basis: u.basis,
            quantity: qty,
            evidence: u.evidence,
          });
          if (perPerson !== null) {
            perPerson = u.basis === "per_person" ? perPerson + u.priceSen : null;
          }
        }
      }
    }
    assignments.push({
      room,
      variant,
      aziziyahUpgrade: az.upgrade,
      aziziyahRoom: az.resolution,
      perPersonSen: perPerson,
    });
  }

  // Naik taraf per_group yang dipilih: sekali untuk seluruh kumpulan.
  const groupUpgrades = new Map<string, Upgrade>();
  for (const a of assignments) {
    if (a.aziziyahUpgrade?.basis === "per_group" && a.aziziyahRoom !== "included") {
      groupUpgrades.set(a.aziziyahUpgrade.id, a.aziziyahUpgrade);
    }
  }
  for (const u of groupUpgrades.values()) {
    if (u.priceSen === null) {
      unpriced.push(u.description);
      lines.push({
        label: u.description,
        amountSen: null,
        kind: "upgrade",
        basis: "per_group",
        evidence: u.evidence,
      });
    } else {
      lines.push({
        label: `${u.description}: ${formatRM(u.priceSen)} sekumpulan`,
        amountSen: u.priceSen,
        kind: "upgrade",
        basis: "per_group",
        quantity: 1,
        evidence: u.evidence,
      });
    }
    for (const a of assignments) a.perPersonSen = null;
  }

  // Caj.
  const conditionalCharges: string[] = [];
  const charges = catalog.charges
    .filter((c) => c.packageIds.includes(pkg.id))
    .sort((a, b) => a.id.localeCompare(b.id));
  for (const c of charges)
    applyCharge(c, req.rooms, lines, unpriced, conditionalCharges, assignments);

  const knownGroupSen = sumSen(
    lines
      .filter((l) => l.kind !== "extras" && l.amountSen !== null)
      .map((l) => l.amountSen as bigint),
  );
  let comparedGroupSen = knownGroupSen;
  if (req.budget.scope === "all_in" && req.budget.extrasPerPersonSen > 0n) {
    const extras = req.budget.extrasPerPersonSen * BigInt(pilgrims);
    lines.push({
      label: `Peruntukan peribadi (input anda): ${formatRM(req.budget.extrasPerPersonSen)} × ${pilgrims} jemaah`,
      amountSen: extras,
      kind: "extras",
      basis: "per_person",
      quantity: pilgrims,
      evidence: [],
    });
    comparedGroupSen += extras;
  }
  const budgetGroupSen = req.budget.perPersonSen * BigInt(pilgrims);

  return {
    ok: true,
    assignments,
    cost: {
      lines,
      knownGroupSen,
      comparedGroupSen,
      budgetGroupSen,
      remainingSen: budgetGroupSen - comparedGroupSen,
      complete: unpriced.length === 0,
      unpriced,
      conditionalCharges,
      pilgrims,
    },
  };
}

function applyCharge(
  c: Charge,
  rooms: RoomSpec[],
  lines: CostLine[],
  unpriced: string[],
  conditional: string[],
  assignments: RoomAssignment[],
) {
  if (c.included) {
    lines.push({
      label: `${c.description}${c.priceSen !== null ? ` (${formatRM(c.priceSen)} ${basisLabel[c.basis]})` : ""}: sudah termasuk dalam harga`,
      amountSen: 0n,
      kind: "included",
      evidence: c.evidence,
    });
    return;
  }
  if (c.kind === "conditional") {
    conditional.push(c.description);
    return;
  }
  let quantity: number | null;
  switch (c.basis) {
    case "per_person":
      quantity = totalPilgrims(rooms);
      break;
    case "per_room":
      quantity = rooms.length;
      break;
    case "per_group":
      quantity = 1;
      break;
    case "per_night":
      quantity = c.nightCount === null ? null : c.nightCount * rooms.length;
      break;
  }
  if (c.priceSen === null || quantity === null) {
    unpriced.push(c.description);
    lines.push({
      label: c.description,
      amountSen: null,
      kind: "charge",
      basis: c.basis,
      evidence: c.evidence,
    });
    for (const a of assignments) a.perPersonSen = null;
    return;
  }
  lines.push({
    label: `${c.description}: ${formatRM(c.priceSen)} ${basisLabel[c.basis]} × ${quantity}`,
    amountSen: c.priceSen * BigInt(quantity),
    kind: "charge",
    basis: c.basis,
    quantity,
    evidence: c.evidence,
  });
  for (const a of assignments) {
    if (a.perPersonSen === null) continue;
    a.perPersonSen = c.basis === "per_person" ? a.perPersonSen + c.priceSen : null;
  }
}
