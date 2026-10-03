// @vitest-environment node
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { csvToVariantOps, parseCsv } from "@/lib/admin/csv";
import { diffFiles } from "@/lib/admin/diff";
import { validateDraftFile } from "@/lib/admin/drafts";
import { applyOp, OpError, type OpContext } from "@/lib/admin/ops";
import { inspectPdf, sanitizeFilename } from "@/lib/admin/sources";
import { readRepoCatalog } from "@/lib/catalog/repo-files";

const repo = readRepoCatalog(join(__dirname, "../../.."), "1448H");
const busyra = () => structuredClone(repo.raw.find((f) => f.pjh.id === "busyra")!);
const admin: OpContext = {
  actor: "admin@contoh.my (admin)",
  now: new Date("2026-10-05T00:00:00Z"),
  role: "admin",
};
const reviewer: OpContext = { ...admin, actor: "semak@contoh.my (reviewer)", role: "reviewer" };
const ev = { pdfPage: 34, text: "MTSP02 RM 86,490 Bilik Ber-2" };

describe("operasi draf", () => {
  it("harga baharu memerlukan bukti halaman; perubahan membatalkan semakan", () => {
    const f = {
      ...busyra(),
      review: { status: "approved" as const, approvedBy: "x", approvedAt: "y", notes: null },
    };
    const pkg = f.packages[0];
    const v = pkg.variants[0];
    const op = {
      op: "upsert_variant" as const,
      packageId: pkg.id,
      original: {
        code: v.code,
        makkahOccupancy: v.makkahOccupancy,
        madinahOccupancy: v.madinahOccupancy,
        travellerCategory: v.travellerCategory ?? "adult",
      },
      variant: {
        code: v.code,
        makkahOccupancy: v.makkahOccupancy,
        madinahOccupancy: v.madinahOccupancy,
        aziziyahOccupancy: v.aziziyahOccupancy ?? null,
        priceSen: (v.priceSen ?? 0) + 100_000,
        pmnStatus: v.pmnStatus,
        travellerCategory: v.travellerCategory ?? "adult",
        roomLabelAsPublished: v.roomLabelAsPublished ?? null,
        notes: v.notes ?? null,
      },
    };
    expect(() => applyOp(f, op, reviewer)).toThrow(/bukti/);
    const next = applyOp(f, { ...op, evidence: ev }, reviewer);
    expect(next.packages[0].variants[0].priceSen).toBe((v.priceSen ?? 0) + 100_000);
    expect(next.packages[0].variants[0].priceEvidence).toEqual([
      { sourceId: "compilation-34pjh-1448h", pdfPage: 34, text: ev.text, status: "transcribed" },
    ]);
    expect(next.review?.status).toBe("unreviewed");
    expect(f.packages[0].variants[0].priceSen).toBe(v.priceSen); // fail asal tidak diubah
    expect(validateDraftFile(next, "busyra", "1448H").ok).toBe(true);
    const d = diffFiles(f, next);
    expect(d.some((x) => x.area === "variant" && x.kind === "changed" && /→/.test(x.text))).toBe(
      true,
    );
  });

  it("status kelulusan: pentadbir sahaja dan mesti ada sumber rasmi", () => {
    const f = busyra();
    const op = {
      op: "set_approval" as const,
      status: "verified_approved" as const,
      officialSource: "Senarai PJH diluluskan TH 1448H",
      officialReference: null,
    };
    expect(() => applyOp(f, op, reviewer)).toThrow(OpError);
    expect(() => applyOp(f, { ...op, officialSource: null }, admin)).toThrow(/sumber rasmi/);
    const next = applyOp(f, op, admin);
    expect(next.pjh.approval).toMatchObject({
      status: "verified_approved",
      verifiedBy: admin.actor,
    });
    expect(validateDraftFile(next, "busyra", "1448H").ok).toBe(true);
  });

  it("tidak membenarkan pakej tanpa varian dan pakej yang masih dirujuk", () => {
    const f = busyra();
    const pkg = f.packages.find((p) => p.variants.length === 1) ?? null;
    if (pkg) {
      const v = pkg.variants[0];
      expect(() =>
        applyOp(
          f,
          {
            op: "delete_variant",
            packageId: pkg.id,
            key: {
              code: v.code,
              makkahOccupancy: v.makkahOccupancy,
              madinahOccupancy: v.madinahOccupancy,
              travellerCategory: v.travellerCategory ?? "adult",
            },
          },
          admin,
        ),
      ).toThrow(/sekurang-kurangnya satu varian/);
    }
    const referenced = (f.upgrades ?? [])[0]?.packageIds[0];
    if (referenced)
      expect(() => applyOp(f, { op: "delete_package", packageId: referenced }, admin)).toThrow(
        /dirujuk/,
      );
  });

  it("arkib pakej dan editor JSON tidak boleh menukar ID PJH atau kelulusan oleh penyemak", () => {
    const f = busyra();
    const archived = applyOp(
      f,
      {
        op: "update_package",
        packageId: f.packages[0].id,
        fields: { publishedStatus: "archived" },
      },
      reviewer,
    );
    expect(archived.packages[0].publishedStatus).toBe("archived");
    expect(() =>
      applyOp(
        f,
        {
          op: "replace_file",
          file: { ...f, pjh: { ...f.pjh, id: "lain" } } as Record<string, unknown>,
        },
        admin,
      ),
    ).toThrow(/pjh.id/);
    const approved = {
      ...f,
      pjh: {
        ...f.pjh,
        approval: {
          status: "verified_approved",
          officialSource: "x",
          officialReference: null,
          verifiedAt: "2026",
          verifiedBy: "y",
        },
      },
    };
    expect(() =>
      applyOp(
        f,
        { op: "replace_file", file: approved as unknown as Record<string, unknown> },
        reviewer,
      ),
    ).toThrow(/pentadbir/);
  });
});

describe("CSV varian", () => {
  it("menghurai petikan, koma dan baris baharu", () => {
    expect(parseCsv('a,b\n"x, y","say ""hi""\nline"\r\n')).toEqual([
      ["a", "b"],
      ["x, y", 'say "hi"\nline'],
    ]);
  });

  it("menukar baris kepada operasi dan melaporkan ralat ikut nombor baris", () => {
    const f = busyra();
    const pkg = f.packages[0];
    const csv = [
      "package_id,code,makkah,madinah,price_rm,pmn,pdf_page,evidence_text,aziziyah",
      `${pkg.id},NEW02,2,2,"RM 90,000",included,34,Harga NEW02 RM90000,2`,
      `${pkg.id},NEW03,3,3,,not_stated,,,`,
      `tiada,X,2,2,1000,included,34,teks,`,
      `${pkg.id},BAD,2,2,90000,included,,,`,
    ].join("\n");
    const { ops, errors } = csvToVariantOps(
      csv,
      f.packages.map((p) => ({ packageId: p.id, variants: p.variants })),
    );
    expect(ops).toHaveLength(2);
    expect(ops[0]).toMatchObject({
      op: "upsert_variant",
      variant: { code: "NEW02", priceSen: 9_000_000, aziziyahOccupancy: 2 },
      evidence: { pdfPage: 34 },
    });
    expect(ops[1]).toMatchObject({ variant: { code: "NEW03", priceSen: null } });
    expect(errors).toEqual([
      expect.stringMatching(/^Baris 4: pakej "tiada"/),
      expect.stringMatching(/^Baris 5: varian berharga mesti ada pdf_page/),
    ]);
  });

  it("menolak CSV tanpa lajur wajib", () => {
    expect(csvToVariantOps("code,price\nA,1", []).errors[0]).toMatch(/Lajur wajib tiada/);
  });
});

describe("semakan fail sumber", () => {
  const pdf = (body: string) => new Uint8Array(Buffer.from(`%PDF-1.4\n${body}\n%%EOF\n`, "latin1"));

  it("menerima PDF dan menolak fail bukan PDF, tidak lengkap atau aktif", () => {
    expect(inspectPdf(pdf("1 0 obj << /Type /Page >> endobj"))).toEqual({ ok: true, pageCount: 1 });
    expect(inspectPdf(new Uint8Array(Buffer.from("MZ executable")))).toMatchObject({
      ok: false,
      reason: expect.stringMatching(/bukan PDF/),
    });
    expect(inspectPdf(new Uint8Array(Buffer.from("%PDF-1.4 tanpa penamat")))).toMatchObject({
      ok: false,
    });
    expect(inspectPdf(pdf("<< /S /JavaScript /JS (app.alert(1)) >>"))).toMatchObject({
      ok: false,
      reason: expect.stringMatching(/JavaScript/),
    });
    expect(inspectPdf(new Uint8Array())).toMatchObject({ ok: false });
  });

  it("membersihkan nama fail", () => {
    expect(sanitizeFilename("../../etc/passwd")).toBe("passwd.pdf");
    expect(sanitizeFilename("Brosur Busyra (Rasmi) 2027.PDF")).toBe("Brosur_Busyra_Rasmi_2027.pdf");
    expect(sanitizeFilename("<script>.pdf")).toBe("script.pdf");
    expect(sanitizeFilename("")).toBe("dokumen.pdf");
  });
});
