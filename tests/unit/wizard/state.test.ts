import { describe, expect, it } from "vitest";

import { FORBIDDEN_WORDS } from "@/lib/engine";
import { requirementsSchema, toRequirements } from "@/lib/validation/requirements";
import {
  initialState,
  newRoom,
  restoreState,
  roomsForParty,
  summarize,
  toAssessRequest,
  validateAll,
  validateStep,
  type WizardState,
} from "@/lib/wizard/state";

const couple = (patch: Partial<WizardState> = {}): WizardState => ({
  ...initialState(),
  budgetPerPersonRM: "100,000",
  ...patch,
});

describe("validateStep", () => {
  it("memerlukan bajet yang sah pada langkah 1", () => {
    expect(validateStep(initialState(), 1).map((e) => e.field)).toEqual(["budgetPerPersonRM"]);
    expect(validateStep(couple({ budgetPerPersonRM: "abc" }), 1)[0].message).toMatch(/nombor RM/);
    expect(validateStep(couple({ budgetPerPersonRM: "0" }), 1)).toHaveLength(1);
    expect(validateStep(couple(), 1)).toEqual([]);
  });

  it("memerlukan peruntukan tambahan apabila bajet meliputi semua", () => {
    const s = couple({ budgetScope: "all_in" });
    expect(validateStep(s, 1).map((e) => e.field)).toEqual(["extrasPerPersonRM"]);
    expect(validateStep({ ...s, extrasPerPersonRM: "5000" }, 1)).toEqual([]);
  });

  it("menolak jemaah yang tidak muat dalam bilik", () => {
    const s = couple({
      rooms: [newRoom({ pilgrims: 3, makkah: 2, madinahSame: false, madinah: 2, aziziyah: 2 })],
    });
    expect(validateStep(s, 2).map((e) => e.field)).toEqual([
      "rooms.0.makkah",
      "rooms.0.madinah",
      "rooms.0.aziziyah",
    ]);
  });

  it("menghadkan 12 jemaah", () => {
    const rooms = Array.from({ length: 4 }, () => newRoom({ pilgrims: 4, makkah: 4 }));
    expect(validateStep(couple({ rooms }), 2).some((e) => e.field === "rooms")).toBe(true);
  });

  it("menyemak tempoh sasaran dan julat", () => {
    expect(validateStep(couple({ durationMode: "target", durationTarget: "" }), 3)[0].field).toBe(
      "durationTarget",
    );
    expect(validateStep(couple({ durationMode: "range" }), 3)[0].field).toBe("durationMin");
    expect(
      validateStep(couple({ durationMode: "range", durationMin: "45", durationMax: "30" }), 3)[0]
        .field,
    ).toBe("durationMax");
    expect(validateStep(couple({ durationMode: "range", durationMax: "45" }), 3)).toEqual([]);
  });

  it("menyemak jarak meter", () => {
    const near = { importance: { ...initialState().importance, proximity: "important" as const } };
    expect(validateStep(couple({ ...near, proximityMakkahM: "dekat" }), 4)[0].field).toBe(
      "proximityMakkahM",
    );
    expect(validateStep(couple({ ...near, proximityMakkahM: "300" }), 4)).toEqual([]);
  });

  it("tiada ralat bagi keadaan pasangan RM100,000", () => {
    expect(validateAll(couple())).toEqual([]);
  });
});

describe("toAssessRequest", () => {
  it("menghasilkan permintaan yang lulus skema API", () => {
    const s = couple({
      rooms: [newRoom({ pilgrims: 2, makkah: 2, aziziyah: 2 })],
      aziziyahMode: "required",
      tarwiyahMode: "preferred",
      durationMode: "target",
      durationTarget: "40",
      durationTolerance: "0",
      pmn: "required",
      importance: {
        savings: "important",
        proximity: "important",
        masyair: "normal",
        relocations: "dont_care",
      },
      proximityMakkahM: "300",
    });
    const req = toAssessRequest(s);
    const parsed = requirementsSchema.parse(req.requirements);
    const r = toRequirements(parsed);
    expect(r.budget.perPersonSen).toBe(10_000_000n);
    expect(r.rooms).toEqual([{ pilgrims: 2, makkah: 2, madinah: 2, aziziyah: 2 }]);
    expect(r.duration).toMatchObject({ target: 40, tolerance: 0, hard: true });
    expect(r.proximity).toEqual({ maxMakkahM: 300, maxMadinahM: null });
    expect(req.options).toEqual({ diversifyPjh: false });
  });

  it("mengabaikan had jarak apabila kedekatan 'tidak kisah'", () => {
    const req = toAssessRequest(couple({ proximityMakkahM: "300" }));
    expect(req.requirements.proximity).toEqual({ maxMakkahM: null, maxMadinahM: null });
  });

  it("Aziziyah 'ikut susunan asal' dihantar sebagai null; Madinah ikut Makkah", () => {
    const req = toAssessRequest(couple({ rooms: [newRoom({ pilgrims: 1, makkah: 4 })] }));
    expect(req.requirements.rooms).toEqual([
      { pilgrims: 1, makkah: 4, madinah: 4, aziziyah: null },
    ]);
  });

  it("bajet semua termasuk membawa peruntukan tambahan", () => {
    const req = toAssessRequest(couple({ budgetScope: "all_in", extrasPerPersonRM: "5,000" }));
    const r = toRequirements(requirementsSchema.parse(req.requirements));
    expect(r.budget.extrasPerPersonSen).toBe(500_000n);
  });
});

describe("restoreState", () => {
  it("memulihkan JSON yang sah dan menolak data rosak atau versi lain", () => {
    const s = couple();
    expect(restoreState(JSON.stringify(s))).toEqual(s);
    expect(restoreState(null)).toBeNull();
    expect(restoreState("{rosak")).toBeNull();
    expect(restoreState(JSON.stringify({ ...s, version: 2 }))).toBeNull();
    expect(restoreState(JSON.stringify({ ...s, rooms: [] }))).toBeNull();
  });

  it("mengisi medan baharu dengan nilai lalai", () => {
    const partial: Partial<WizardState> = couple();
    delete partial.diversifyPjh;
    expect(restoreState(JSON.stringify(partial))?.diversifyPjh).toBe(false);
  });
});

describe("roomsForParty dan summarize", () => {
  it("pratetap bilik ikut jenis rombongan", () => {
    expect(roomsForParty("couple").map((r) => r.pilgrims)).toEqual([2]);
    expect(roomsForParty("single")[0]).toMatchObject({ pilgrims: 1, makkah: 4 });
    expect(roomsForParty("group")).toHaveLength(2);
  });

  it("mengasingkan syarat wajib dan keutamaan tanpa perkataan 'dijamin'", () => {
    const items = summarize(
      couple({ aziziyahMode: "required", tarwiyahMode: "preferred", budgetHard: false }),
    );
    const byLabel = Object.fromEntries(items.map((i) => [i.label, i]));
    expect(byLabel["Aziziyah"].kind).toBe("wajib");
    expect(byLabel["Tarwiyah"].kind).toBe("keutamaan");
    expect(byLabel["Bajet seorang"].kind).toBe("keutamaan");
    expect(byLabel["Bajet seorang"].value).toContain("RM 100,000.00");
    expect(byLabel["Bajet seorang"].value).toContain("kumpulan RM 200,000.00");
    for (const i of items) expect(i.value).not.toMatch(FORBIDDEN_WORDS);
  });
});

describe("Julat bajet dan bilik khusus", () => {
  it("ringkasan memaparkan julat RM90,000 – RM100,000 bagi bajet RM100,000", () => {
    const item = summarize(couple()).find((i) => i.label === "Bajet seorang")!;
    expect(item.value).toContain("RM 90,000.00 – RM 100,000.00");
  });

  it("permintaan wizard menghasilkan had bawah bajet − RM10,000 dan tiada soalan bilik khusus", () => {
    const { requirements } = toAssessRequest(couple());
    expect(requirements).not.toHaveProperty("privateRoom");
    const r = toRequirements(requirementsSchema.parse(requirements));
    expect(r.budget.minPerPersonSen).toBe(9_000_000n);
    expect(r.privateRoom).toBe("any");
    expect(summarize(couple()).some((i) => /Bilik khusus/.test(i.label))).toBe(false);
  });

  it("bajet di bawah RM10,000 tidak memberi had bawah negatif", () => {
    const { requirements } = toAssessRequest(couple({ budgetPerPersonRM: "8000" }));
    expect(toRequirements(requirementsSchema.parse(requirements)).budget.minPerPersonSen).toBe(0n);
  });
});
