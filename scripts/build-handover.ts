// Jana docs/serahan-data.md (spesifikasi §23.5) daripada katalog repo dan engine sebenar.
// Guna: pnpm docs:serahan. Fail dijana; jangan sunting dengan tangan.
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import type { CoverageEntry } from "../src/lib/catalog/coverage";
import { toEngineCatalog } from "../src/lib/catalog/load";
import { readRepoCatalog } from "../src/lib/catalog/repo-files";
import { assess, formatRM } from "../src/lib/engine";
import { budgetFloorSen } from "../src/lib/engine/money";
import type { Requirements } from "../src/lib/engine/types";
import { computeDatasetVersion } from "../src/lib/storage/catalog-repo";

const root = join(__dirname, "..");
const repo = readRepoCatalog(root, "1448H");
if (repo.errors.length) throw new Error(repo.errors.join("\n"));
const { datasetVersion } = computeDatasetVersion("1448H", repo.raw, repo.coverage);
const catalog = toEngineCatalog(repo.parsed, datasetVersion);
const cov = repo.coverage as unknown as {
  generatedAt: string;
  totals: Record<string, number>;
  pjhs: CoverageEntry[];
};

const lines: string[] = [];
const out = (s = "") => lines.push(s);
const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");

out("# Data serahan katalog 1448H");
out();
out(
  `> Dijana oleh \`pnpm docs:serahan\` daripada \`data/catalog/1448h/*.json\` dan engine penilaian. Versi data \`${datasetVersion}\`, manifest liputan ${cov.generatedAt}. Jangan sunting dengan tangan.`,
);
out();

// 1. Jumlah
const t = cov.totals;
out("## 1. Jumlah sebenar daripada ekstraksi");
out();
out(`- PJH dalam kompilasi: **${t.pjhExpected}** (dengan fail katalog: ${t.pjhWithCatalogFile})`);
out(
  `- PJH disemak (transkripsi + semakan bebas): **${t.pjhReviewed}**; tersekat: **${t.pjhBlocked}**`,
);
out(
  `- Keluarga pakej: **${t.packageFamilies}**; varian dikenal pasti: **${t.variantsIdentified}**; varian dalam katalog: **${t.variantsImported}**`,
);
out(
  `- Varian tanpa harga: ${t.unresolvedVariants}; kelulusan PJH disahkan: **${t.pjhApprovalVerified}**; varian diterbitkan pentadbir: ${t.variantsPublished}`,
);
out(
  "- 34 PJH ≠ 34 pakej: setiap PJH mempunyai beberapa keluarga pakej dan setiap pakej beberapa varian bilik/harga.",
);
out();
out(
  "| # | PJH | Halaman | Pakej | Varian | Dikecualikan | Status | Kelulusan | Jurang (menghalang / tidak) |",
);
out("|---:|---|---|---:|---:|---:|---|---|---|");
for (const p of cov.pjhs) {
  const blocking = p.gaps.filter((g) => g.startsWith("[blocking]")).length;
  out(
    `| ${p.index} | ${cell(p.label)} | ${p.pageRange[0]}–${p.pageRange[1]} | ${p.packageFamiliesIdentified ?? "—"} | ${p.variantsImported} | ${p.excludedVariants.length} | ${p.processingStatus} | ${p.approvalStatus} | ${blocking} / ${p.gaps.length - blocking} |`,
  );
}
out();

// 2. Blocker
out("## 2. Blocker (jurang data menghalang)");
out();
const blockers = cov.pjhs.flatMap((p) =>
  p.gaps
    .filter((g) => g.startsWith("[blocking]"))
    .map((g) => `- **${p.label}**: ${g.replace(/^\[blocking\]\s*/, "")}`),
);
lines.push(...(blockers.length ? blockers : ["- Tiada."]));
out();

// 3. Kelulusan
out("## 3. Kelulusan PJH belum disahkan");
out();
const unverified = cov.pjhs.filter((p) => p.approvalStatus !== "verified_approved");
out(
  `${unverified.length} daripada ${cov.pjhs.length} PJH berstatus belum disahkan bagi musim 1448H: ${unverified.map((p) => p.label).join(", ")}. Brosur dan nombor lesen yang dicetak bukan bukti kelulusan; sahkan dengan senarai rasmi Tabung Haji melalui panel pentadbir.`,
);
out();

// 4. Konflik
out("## 4. Konflik sumber yang belum selesai");
out();
const conflicts = catalog.packages.filter((p) => p.unresolvedConflicts.length);
if (!conflicts.length) out("- Tiada.");
for (const p of conflicts) {
  const pjh = catalog.pjhs.find((x) => x.id === p.pjhId)!;
  for (const c of p.unresolvedConflicts) out(`- **${pjh.name} — ${p.name}**: ${cell(c)}`);
}
out();
out("Pakej dengan konflik tidak layak menjadi cadangan utama (engine menghalangnya).");
out();

// 5. Kekosongan
out("## 5. Kekosongan belum disahkan");
out();
const avail = new Map<string, number>();
for (const p of catalog.packages)
  avail.set(p.availability.status, (avail.get(p.availability.status) ?? 0) + 1);
out(
  `Status kekosongan ${catalog.packages.length} pakej: ${[...avail].map(([k, n]) => `\`${k}\` ${n}`).join(", ")}. Tiada kekosongan disahkan; brosur tidak membuktikan bilik masih tersedia. Setiap kad hasil memaparkan "Kekosongan: Perlu pertanyaan".`,
);
out();

// 6. Medan tidak dinyatakan
out("## 6. Medan tidak dinyatakan (unknown)");
out();
const count = (f: (x: (typeof catalog.packages)[number]) => boolean) =>
  catalog.packages.filter(f).length;
const variantsNoPmn = catalog.variants.filter((v) => v.pmnStatus === "not_stated").length;
out("| Medan | Bilangan |");
out("|---|---:|");
out(`| Tarwiyah tidak dinyatakan (pakej) | ${count((p) => p.tarwiyah.status === "not_stated")} |`);
out(`| Aziziyah tidak dinyatakan (pakej) | ${count((p) => p.aziziyah.status === "not_stated")} |`);
out(
  `| Tempoh tidak dinyatakan (pakej) | ${count((p) => p.duration.value === null && p.duration.min === null)} |`,
);
out(`| Tempoh anggaran sahaja (pakej) | ${count((p) => p.duration.approximate)} |`);
out(
  `| Bilangan perpindahan tidak dinyatakan (pakej) | ${count((p) => p.relocations.count === null)} |`,
);
out(
  `| Kelas penerbangan tidak dinyatakan (pakej) | ${count((p) => p.flightClass.value === "not_stated")} |`,
);
out(`| Status PMN tidak dinyatakan (varian) | ${variantsNoPmn} |`);
out(
  `| Harga tidak diketahui (varian) | ${catalog.variants.filter((v) => v.priceSen === null).length} |`,
);
out(`| Naik taraf tanpa harga | ${catalog.upgrades.filter((u) => u.priceSen === null).length} |`);
out(`| Caj tanpa harga | ${catalog.charges.filter((c) => c.priceSen === null).length} |`);
out();
out("Senarai penuh jurang setiap PJH (seperti direkodkan semasa transkripsi dan semakan bebas):");
out();
for (const p of cov.pjhs) {
  if (!p.gaps.length) continue;
  out(`<details><summary>${p.index}. ${p.label} (${p.gaps.length})</summary>`);
  out();
  for (const g of p.gaps) out(`- ${cell(g)}`);
  out();
  out("</details>");
  out();
}

// 7. Bukti penilaian merentas PJH
out("## 7. Bukti penilaian merentas PJH (cadangan berbeza mengikut input)");
out();
const base = (o: Partial<Requirements> = {}): Requirements => ({
  seasonId: "1448H",
  rooms: [{ pilgrims: 2, makkah: 2, madinah: 2, aziziyah: null }],
  budget: { perPersonSen: 10_000_000n, scope: "package_only", extrasPerPersonSen: 0n, hard: true },
  aziziyah: { mode: "any", acceptConditional: true },
  duration: {
    min: null,
    max: null,
    target: null,
    tolerance: null,
    acceptApproximate: true,
    hard: true,
  },
  tarwiyah: { mode: "any", acceptConditional: true },
  pmn: "any",
  privateRoom: "any",
  proximity: { maxMakkahM: null, maxMadinahM: null },
  comfortFeatures: [],
  minRoomSizeSqm: null,
  importance: {},
  ...o,
});
const scenarios: { name: string; req: Requirements; diversify?: boolean }[] = [
  {
    name: "A. Pasangan RM100,000 seorang; Aziziyah ber-2 wajib; PMN wajib; Tarwiyah wajib (terima bersyarat); 40 hari",
    req: base({
      rooms: [{ pilgrims: 2, makkah: 2, madinah: 2, aziziyah: 2 }],
      aziziyah: { mode: "required", acceptConditional: true },
      pmn: "required",
      tarwiyah: { mode: "required", acceptConditional: true },
      duration: {
        min: null,
        max: null,
        target: 40,
        tolerance: 0,
        acceptApproximate: true,
        hard: true,
      },
    }),
  },
  {
    name: "B. Pasangan RM60,000 seorang, tiada syarat lain",
    req: base({
      budget: {
        perPersonSen: 6_000_000n,
        scope: "package_only",
        extrasPerPersonSen: 0n,
        hard: true,
      },
    }),
  },
  {
    name: "C. Seorang (bilik ber-4 dikongsi) RM45,000",
    req: base({
      rooms: [{ pilgrims: 1, makkah: 4, madinah: 4, aziziyah: null }],
      budget: {
        perPersonSen: 4_500_000n,
        scope: "package_only",
        extrasPerPersonSen: 0n,
        hard: true,
      },
    }),
  },
  {
    name: "D. Pasangan RM150,000; Tarwiyah wajib TANPA menerima syarat kelulusan",
    req: base({
      budget: {
        perPersonSen: 15_000_000n,
        scope: "package_only",
        extrasPerPersonSen: 0n,
        hard: true,
      },
      tarwiyah: { mode: "required", acceptConditional: false },
    }),
  },
  {
    name: "E. Tiga jemaah bilik bertiga RM80,000; maksimum 30 hari",
    req: base({
      rooms: [{ pilgrims: 3, makkah: 3, madinah: 3, aziziyah: null }],
      budget: {
        perPersonSen: 8_000_000n,
        scope: "package_only",
        extrasPerPersonSen: 0n,
        hard: true,
      },
      duration: {
        min: null,
        max: 30,
        target: null,
        tolerance: null,
        acceptApproximate: true,
        hard: true,
      },
    }),
  },
  {
    name: "F. Seperti B tetapi penjimatan penting dan kepelbagaian PJH",
    req: base({
      budget: {
        perPersonSen: 6_000_000n,
        scope: "package_only",
        extrasPerPersonSen: 0n,
        hard: true,
      },
      importance: { savings: "important" },
    }),
    diversify: true,
  },
];
for (const s of scenarios) {
  // Seperti API/wizard: julat bajet lalai RM10,000 di bawah bajet seorang.
  const req = {
    ...s.req,
    budget: { ...s.req.budget, minPerPersonSen: budgetFloorSen(s.req.budget.perPersonSen) },
  };
  const r = assess(catalog, req, { diversifyPjh: s.diversify ?? false });
  const pjhCount = new Set(
    r.candidates.filter((c) => c.group !== "not_matching").map((c) => c.pjh.id),
  ).size;
  out(`### ${s.name}`);
  out();
  out(
    `Memenuhi syarat wajib: **${r.groups.full_match.length}**; perlu pengesahan: ${r.groups.needs_verification.length}; tidak memenuhi: ${r.groups.not_matching.length}; daripada ${pjhCount} PJH.`,
  );
  if (r.noMatch) out(`Tiada padanan: ${r.noMatch.message}`);
  out();
  if (r.recommendations.length) {
    out("| Label | PJH | Pakej | Kod | Seorang | Kumpulan |");
    out("|---|---|---|---|---:|---:|");
    for (const rec of r.recommendations) {
      const c = r.candidates.find((x) => x.id === rec.candidateId)!;
      const per = c.assignments
        .map((a) => (a.perPersonSen === null ? "perlu pengesahan" : formatRM(a.perPersonSen)))
        .join(" / ");
      out(
        `| ${rec.label} | ${cell(c.pjh.name)} | ${cell(c.package.name)} | ${c.assignments.map((a) => a.variant.code).join("+")} | ${per} | ${formatRM(c.cost.knownGroupSen)}${c.cost.complete ? "" : " (belum lengkap)"} |`,
      );
    }
  } else out("Tiada cadangan.");
  out();
}
out(
  "Ujian automatik merentas PJH: `tests/unit/engine/cross-pjh.test.ts` (katalog penuh), `tests/unit/engine/scenarios.test.ts` (senario A–F), `tests/integration/api/api.test.ts` dan E2E `tests/e2e/results.spec.ts`.",
);
out();

writeFileSync(join(root, "docs/serahan-data.md"), lines.join("\n") + "\n");
console.log(`docs/serahan-data.md: ${lines.length} baris, versi ${datasetVersion}`);
