# Pelan Pelaksanaan — Perancang Pakej Haji PJH (MVP 1448H/2027M)

Versi pelan: 1.0 | Tarikh: 3 Oktober 2026 | Rujukan: `Spesifikasi_Aplikasi_Perancang_Pakej_Haji_PJH.md` v1.2

Pelan ini menterjemah spesifikasi kepada kerja pembangunan berperingkat yang boleh disemak. Setiap fasa ada senarai fail, kriteria penerimaan dan ujian yang dipetakan ke Definition of Done (DoD, seksyen 17 spesifikasi). Jika pelan ini bercanggah dengan spesifikasi, spesifikasi menang.

---

## 0. Keadaan semasa dan andaian

| Perkara | Status pada 3 Okt 2026 | Kesan kepada pelan |
|---|---|---|
| Repository `rizalramly/PJH-helper-2027M` | Kosong, tiada commit, tiada `AGENTS.md` | Projek baharu: guna stack lalai seksyen 15 (Next.js + TS + PostgreSQL + object storage) |
| PDF sumber (`Pakej_Haji_2027_Semua_34_PJH.pdf`, brosur Busyra) | **Belum dimuat naik** ke sesi ini | Seed Busyra dibina daripada transkripsi seksyen 12. `document_hash` dan `stored_path` diisi selepas PDF diterima. Evidence `verification_status = transcribed_from_spec` hingga disemak dengan PDF |
| Kelulusan PJH Busyra untuk 1448H | Belum disahkan | `approval_status = unverified`; tiada badge "diluluskan" |
| Harga bilik bertiga/berempat Busyra | Tidak ada dalam seksyen 12 (hanya kod berdua `*02`) | Senario E mesti memberi "tiada konfigurasi harga sah". Jangan jana harga |
| Pakej VIP ±25 hari | Belum ditranskripsi | Tidak di-seed (senario D) |
| Projek/akaun Vercel, DB dan storage | Belum ditentukan | Fasa 8 menyemak melalui connector Vercel. Jangan beli pelan |

---

## 1. Skill dan alat yang digunakan

| Skill / alat | Digunakan untuk | Fasa |
|---|---|---|
| **UI UX Pro Max** (`nextlevelbuilder/ui-ux-pro-max-skill` v2.13) | Sistem reka bentuk (gaya, warna, tipografi), semakan UX/aksesibiliti, garis panduan stack `nextjs` dan `shadcn`, ikon. Hasil carian sebenar diringkaskan dalam §7 | 0, 5, 6, 9 |
| `anthropic-skills:pdf` | Ekstrak teks dan halaman daripada brosur ke draf import (secara luar talian, bukan dalam request penilaian) | 2, 7 |
| `anthropic-skills:postgres-pro` | Reka bentuk skema, indeks, kekangan unik untuk versi aktif, strategi migration | 2 |
| `anthropic-skills:karpathy-guidelines` | Disiplin pengekodan: perubahan kecil, kriteria kejayaan yang boleh disahkan | Semua |
| `anthropic-skills:data-quality-audit` | Peraturan validasi import (medan wajib, konflik, pendua) sebelum publish | 7 |
| `run` + Playwright (Chromium pra-pasang) | Lancar app dan uji wizard → laporan pada 375 px dan 1440 px | 6, 9 |
| `code-review`, `security-review`, `simplify` | Semakan sebelum setiap PR dan sebelum production | 9 |
| `session-start-hook` | Hook supaya sesi cloud Claude Code boleh jalankan `pnpm test`/lint | 0 |
| GitHub MCP | Branch, PR dan status CI | 0, 8 |
| Vercel MCP | Projek, env, deployment, logs, storage Blob | 8 |

### Pemasangan UI UX Pro Max dalam repo (Fasa 0)

```bash
npx ui-ux-pro-max-cli init --ai claude      # cipta .claude/skills/ui-ux-pro-max/
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain ux
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --stack nextjs
```

Hanya simpan sistem reka bentuk yang telah disahkan (`design-system/pjh-helper/MASTER.md`). Output auto pertama mencadangkan corak "storytelling" dan Outfit/Bauhaus, yang tidak sesuai untuk alat keputusan kewangan, jadi §7 memilih secara manual daripada carian domain berikutnya.

---

## 2. Seni bina

```text
Pelayar (mobile-first)
  │  Wizard (client) → localStorage (input sahaja, tiada PII)
  ▼
Next.js App Router (Vercel, runtime Node.js)
  ├─ Server Components: senarai pakej, butiran, laporan
  ├─ Route Handlers: /api/assess, /api/compare, /api/catalog/*, /api/admin/*
  ├─ Server Actions: borang pentadbir (mutasi)
  └─ src/lib/engine/  ← fungsi TypeScript tulen (tiada I/O)
        costing.ts · eligibility.ts · ranking.ts · recommend.ts · explain.ts
  │
  ├─ src/lib/db/ (Drizzle ORM) → PostgreSQL terurus (cth. Neon melalui Vercel Marketplace)
  └─ src/lib/storage/ → Vercel Blob (PDF sumber, client upload terus)
```

Prinsip:
1. **Engine tulen.** Engine menerima `CatalogSnapshot` + `Requirements` + `ScoringRules`, kemudian memulangkan `AssessmentResult`. Tiada DB, `Date.now()` atau rangkaian. Masa penilaian dihantar sebagai argumen. Dengan cara ini engine deterministik dan mudah diuji.
2. **Snapshot katalog.** `/api/assess` memuatkan katalog `published` bagi satu musim dan `dataset_version` aktif. Hasil dicache mengikut `dataset_version` (revalidate apabila publish).
3. **Tanpa LLM.** Naratif rekomendasi dijana daripada templat BM dan data berstruktur (`explain.ts`).
4. **Versi.** Setiap laporan menyimpan `dataset_version`, `scoring_rules_version` dan `engine_version`.

### Pilihan teknologi (sahkan versi stabil semasa pelaksanaan; guna lockfile)

| Lapisan | Pilihan | Sebab |
|---|---|---|
| Framework | Next.js (App Router) + React + TypeScript `strict` | Ditetapkan spesifikasi |
| UI | Tailwind CSS + shadcn/ui (Radix) + ikon Lucide | Garis panduan stack `shadcn` UI UX Pro Max; aksesibiliti Radix |
| Borang | React Hook Form + Zod (`useForm` + `Controller` + `Field`) | Ikut cadangan stack shadcn semasa |
| ORM / migration | Drizzle ORM + drizzle-kit (migration SQL dalam `migrations/`) | Migration SQL boleh disemak dan dijalankan secara terkawal |
| DB | PostgreSQL terurus; DB ujian: PGlite (dalam proses) untuk CI | Tiada SQLite production; CI tanpa Docker |
| Storage | Vercel Blob (`@vercel/blob` client upload) | Upload PDF besar terus ke storage, bukan melalui body fungsi |
| Auth admin | Auth.js (Credentials) + argon2id + sesi JWT/DB, peranan `admin`/`reviewer` | Tiada kata laluan plaintext atau lalai |
| Ujian | Vitest (unit + integration), Playwright (E2E), `@axe-core/playwright` | DoD 1–12 |
| Kualiti | ESLint, Prettier, `tsc --noEmit` | CI |
| Pakej | pnpm | Lockfile deterministik |

---

## 3. Struktur direktori

```text
.
├─ .claude/skills/ui-ux-pro-max/        # dipasang Fasa 0
├─ .github/workflows/ci.yml
├─ data/
│  ├─ seed/
│  │  ├─ seasons.json
│  │  ├─ busyra-1448h.json              # 4 varian sebenar + evidence
│  │  └─ scoring-rules-v1.json
│  └─ sources/
│     ├─ manifest.json                  # filename, hash, halaman, received_at
│     └─ .gitkeep                       # PDF tidak di-commit (gitignore *.pdf)
├─ design-system/pjh-helper/MASTER.md   # sistem reka bentuk yang disahkan
├─ docs/
│  ├─ IMPLEMENTATION_PLAN.md            # dokumen ini
│  ├─ engine.md                         # formula, enum, contoh pengiraan
│  ├─ data-import.md                    # format JSON/CSV, aliran semakan
│  └─ deployment.md                     # env, migration, rollback
├─ migrations/                          # SQL drizzle-kit
├─ scripts/
│  ├─ seed.ts                           # idempotent (upsert ikut ID stabil)
│  ├─ create-admin.ts                   # bootstrap admin, kata laluan dari prompt/env sekali guna
│  └─ extract-pdf.ts                    # PDF → draf JSON (luar talian)
├─ src/
│  ├─ app/
│  │  ├─ (public)/page.tsx              # Mula: musim + liputan katalog
│  │  ├─ (public)/nilai/[step]/page.tsx # Wizard langkah 1–5
│  │  ├─ (public)/hasil/page.tsx
│  │  ├─ (public)/banding/page.tsx
│  │  ├─ (public)/laporan/page.tsx      # print-friendly
│  │  ├─ (public)/pakej/[id]/page.tsx
│  │  ├─ (public)/istilah/page.tsx      # Aziziyah, PMN, Tarwiyah
│  │  ├─ admin/…                        # dilindungi middleware
│  │  └─ api/
│  │     ├─ assess/route.ts
│  │     ├─ compare/route.ts
│  │     ├─ catalog/{seasons,pjhs,packages,variants}/route.ts
│  │     └─ admin/{import,review,publish,sources,upload}/route.ts
│  ├─ components/
│  │  ├─ ui/                            # shadcn
│  │  ├─ wizard/  results/  compare/  report/  admin/
│  │  └─ status/StatusBadge.tsx  EvidenceLink.tsx  MoneyInput.tsx  Money.tsx
│  └─ lib/
│     ├─ engine/  types.ts costing.ts eligibility.ts ranking.ts recommend.ts explain.ts money.ts
│     ├─ db/      schema.ts client.ts queries/ catalog-snapshot.ts
│     ├─ storage/ blob.ts
│     ├─ auth/    config.ts rbac.ts
│     ├─ validation/ requirements.ts import.ts
│     └─ i18n/ms.ts                     # semua teks UI BM
├─ tests/
│  ├─ fixtures/synthetic-catalog.ts     # SINTETIK; season_id "TEST"; tidak pernah di-seed ke production
│  ├─ unit/engine/*.test.ts
│  ├─ integration/{api,db,import}/*.test.ts
│  └─ e2e/*.spec.ts
├─ Spesifikasi_Aplikasi_Perancang_Pakej_Haji_PJH.md
├─ README.md  .env.example  .gitignore
```

---

## 4. Model data (Drizzle / PostgreSQL)

Semua ID ialah teks stabil (cth. `busyra`, `busyra-1448-mtsp`, `MTSP02`). Wang disimpan sebagai `bigint` sen. Nilai "tidak diketahui" disimpan sebagai enum eksplisit atau `NULL` bersama evidence, bukan `false` atau `0`.

### 4.1 Jadual spesifikasi (seksyen 10)

| Jadual | Medan utama / nota |
|---|---|
| `seasons` | `id`, `hijri_year`, `gregorian_year`, `label`, `active` |
| `pjhs` | `id`, `name`, `website`, `public_contact` |
| `pjh_approvals` | `pjh_id`, `season_id`, `approval_status` (`verified_approved`/`unverified`/`not_approved`), `licence_number`, `verified_at`, `source_id` |
| `sources` | + `document_hash` UNIQUE, `supersedes_source_id`, `version`, `source_type` enum |
| `packages` | Medan seksyen 10 + `supersedes_package_id`, `is_active_version` (unique partial index per `logical_package_key`+`season_id`) |
| `package_variants` | + `price_status` (`priced`/`unpriced`), `pmn_status` (`included`/`not_included`/`optional`/`not_stated`), `flight_class`/`train_class` (`not_stated` dibenarkan), `aziziyah_occupancy` (biasanya NULL: ikut `stays`) |
| `stays` | Urutan `sequence_no` (Makkah → Aziziyah → Makkah), `or_equivalent`, `distance_m` + `distance_reference` enum (`haram_courtyard`/`gate`/`prayer_area`/`nabawi_courtyard`/`not_stated`) |
| `upgrades` | `pricing_basis` enum (`per_person`/`per_room`/`per_group`/`per_night`), `price_sen` NULL = Unpriced, `applicable_variant_ids[]`, `included_in_variant_ids[]`, `resulting_occupancy` |
| `evidence` | `entity_type`, `entity_id`, `field_name`, `source_id`, `source_page`, `pdf_page_in_compilation`, `original_text`, `verification_status` (`transcribed_from_spec`/`draft`/`verified`/`conflict`), `reviewer`, `reviewed_at` |
| `hotels`, `hotel_reviews` | Rating mengikut platform; `rating_scale` wajib; tiada agregat merentas platform |

### 4.2 Jadual tambahan yang diperlukan untuk pelaksanaan

| Jadual | Sebab |
|---|---|
| `charges` | Caj wajib atau tetap: `package_id`, `variant_ids[]`, `basis`, `price_sen` NULL, `included` (cth. bayaran haji TH RM23,398 `included=true`) |
| `dataset_versions` | `id`, `season_id`, `published_at`, `published_by`, `notes`. Setiap publish menaikkan versi |
| `scoring_rule_versions` | Pemberat dan parameter JSON, `version`, `active` |
| `import_batches` / `drafts` | Draf import JSON/CSV/PDF sebelum semakan: `payload` JSONB, `status` (`draft`/`in_review`/`approved`/`rejected`), `validation_report` |
| `admin_users` | `email`, `password_hash` (argon2id), `role`, `disabled_at` |
| `audit_log` | `actor`, `action`, `entity`, `before`/`after` JSONB, `at` (append-only) |

Kekangan penting:
- `UNIQUE(season_id, logical_package_key) WHERE is_active_version` mengelakkan pakej pendua dalam cadangan (DoD 10).
- `CHECK (price_sen >= 0)`; `currency` default `MYR`; `original_currency` + `fx_rate` + `fx_date` hanya jika ada.
- Pertanyaan katalog sentiasa ditapis dengan `season_id`, jadi data musim tidak bercampur.

---

## 5. Engine (src/lib/engine)

### 5.1 Jenis teras (`types.ts`)

```ts
type Known<T> = { kind: 'known'; value: T; evidence: EvidenceRef[] };
type Unknown  = { kind: 'not_stated' } | { kind: 'conflict'; candidates: unknown[] };
type Fact<T>  = Known<T> | Unknown;

type ReqStatus = 'MEMENUHI' | 'BERSYARAT' | 'PERLU_PENGESAHAN' | 'TIDAK_MEMENUHI';
type Group     = 'full_match' | 'needs_verification' | 'not_matching';

interface Requirements {
  seasonId: string;
  party: { pilgrims: number; rooms: RoomSpec[] };        // cth. [{occupancy:2, privateCouple:true}]
  budget: { perPersonSen: bigint; scope: 'package_only' | 'all_in'; extrasSen?: bigint };
  rooms: { makkah: Occ; madinah: Occ; sameAsMakkah: boolean; aziziyah: Occ | null };
  aziziyah: { mode: 'required' | 'not_wanted' | 'any'; minComfort?: …; acceptRelocation?: boolean };
  duration: { min?: number; max?: number; target?: number; tolerance?: number; acceptApproximate: boolean };
  tarwiyah: { mode: 'required' | 'preferred' | 'any' | 'want_not_offered'; acceptConditional: boolean };
  pmn: 'required' | 'preferred' | 'any';
  hardFlags: Set<HardKey>;                               // pengguna tanda "tidak boleh kompromi"
  preferences: Partial<Record<Dimension, 'important' | 'normal' | 'dont_care'>>;
  optional?: { mobility?…; roomSizeMinSqm?…; privateBathroom?…; departureAirport?… };
}
```

### 5.2 `costing.ts`: kos dalam sen

1. **Validasi komposisi bilik.** Jumlah penghuni bilik = `party.pilgrims`. Setiap bilik mesti dipadankan dengan varian yang `makkah_occupancy`/`madinah_occupancy`nya sama. Jika tiada varian untuk occupancy itu, keputusan ialah `NO_VALID_CONFIGURATION` dan pakej ditolak dengan sebab (DoD 7, senario E). Tiga orang tidak boleh diberi harga berdua tanpa susunan orang ketiga.
2. **Harga asas** = `variant.price_sen` × penghuni bagi setiap bilik.
3. **Naik taraf yang dipilih** (cth. Aziziyah berdua) hanya jika `applicable_variant_ids` mengandungi varian itu dan varian tidak termasuk dalam `included_in_variant_ids`:
   - `per_person` × penghuni berkenaan
   - `per_room` × bilangan bilik berkenaan
   - `per_group` × 1
   - `per_night` × `night_count`. Jika `night_count` tidak diketahui, komponen menjadi `Unpriced`. Malam tidak dikira daripada label tarikh.
4. **Caj wajib** dengan `included=false`. Caj `included=true` (TH, PMN RM8,000 dalam varian PMN) tidak ditambah.
5. `price_sen = NULL` menghasilkan `UnpricedComponent`. Jumlah menjadi `{ knownSen, complete:false }` dan dilabel "Kos diketahui; caj tambahan belum lengkap". Padanan bajet menjadi `BERSYARAT`.
6. `baki = bajet_kumpulan − kos_diketahui_kumpulan`. Untuk `all_in`, tambah `extrasSen` secara berasingan dalam pecahan.
7. Output: `CostBreakdown { lines[], perPersonSen[], groupSen, budgetGroupSen, remainingSen, complete, unpriced[] }`.

`money.ts`: hanya `bigint`. Format `RM 86,490.00` menggunakan `Intl.NumberFormat('ms-MY')`. Parser input menerima `86490`, `86,490`, `RM86,490.00`.

### 5.3 `eligibility.ts`: status setiap keperluan

| Keperluan | MEMENUHI | BERSYARAT | PERLU_PENGESAHAN | TIDAK_MEMENUHI |
|---|---|---|---|---|
| Bajet | kos lengkap ≤ bajet | kos diketahui ≤ bajet tetapi ada `Unpriced` | — | kos diketahui > bajet |
| Bilik Makkah/Madinah | varian occupancy sama | — | occupancy `not_stated` | tiada varian sah |
| Aziziyah wajib ada | `included`/`optional` + naik taraf berharga & sesuai | naik taraf Unpriced / kekosongan belum sah | `not_stated` | `explicitly_not_included` |
| Aziziyah tidak mahu | `explicitly_not_included` | — | `not_stated` | `included` (tiada andaian boleh dibuang, senario C) |
| Tempoh | julat dalam had | `±N` anggaran dan `acceptApproximate` | maks ketat + anggaran (perlu tarikh) | di luar had (±40 > 30, senario D) |
| Tarwiyah wajib + terima syarat | `offered` | `offered_subject_to_approval` (label kekal) | `not_stated` | `explicitly_not_offered` |
| Tarwiyah wajib tanpa terima syarat | `offered` | — | `not_stated` | `offered_subject_to_approval` (senario B) |
| PMN wajib | `pmn_status=included` | — | `not_stated` | `not_included` (MJP02, senario A) |
| Bilik khusus pasangan | `private_for_booking_group=true` | — | NULL (Busyra) | `false` |

Pengumpulan (§9 spesifikasi): sebarang `TIDAK_MEMENUHI` pada keperluan wajib → `not_matching`. Jika tiada, sebarang `PERLU_PENGESAHAN` atau konflik → `needs_verification`. Selebihnya → `full_match` (`BERSYARAT` yang diterima pengguna dibenarkan). Pakej `sold_out`/`withdrawn` disingkir ke arkib. Konflik harga atau hotel yang belum selesai disekat daripada label "Cadangan utama".

### 5.4 `ranking.ts`: skor telus

- Pemberat v1: penjimatan 25, keselesaan 25, PMN/masyair 20, kedekatan 15, tempoh 10, perpindahan 5. Dimensi `dont_care` digugurkan, kemudian pemberat dinormalkan. Tarwiyah/Aziziyah "diutamakan" ditambah sebagai dimensi pilihan.
- `skor = 100 × Σ(w·u) / Σ(w_aktif)`. Utility 0–1:
  - penjimatan `clamp((bajet − kos)/bajet, 0, 1)`, hanya jika kos boleh dibanding (lengkap atau setara).
  - keselesaan: hanya ciri yang dipilih pengguna dan ada bukti (bilik air sendiri, keluasan). Label "Premium" atau bintang hotel = tiada bukti.
  - jarak: hanya jika `distance_reference` sama dengan rujukan pengguna. Rujukan berlainan dikira tidak diketahui.
  - tempoh: `1 − |d − sasaran| / toleransi`, diklip. Nilai anggaran ditanda.
  - perpindahan: daripada bilangan `stays` disahkan.
- Data tidak diketahui memberi `u = 0` dan mengurangkan **liputan bukti** = Σw(ada data)/Σw_aktif. Liputan dipaparkan berasingan dengan nota "bukan penilaian negatif".
- Susunan: kumpulan → skor ↓ → liputan ↓ → kos ↑ → ID ↑ (deterministik, DoD 9).

### 5.5 `recommend.ts` dan `explain.ts`

- Label hanya jika sah: **Cadangan utama** (kumpulan `full_match` teratas, tiada konflik), **Alternatif lebih jimat** (calon sah lebih murah wujud), **Alternatif keselesaan** (kelebihan keselesaan berbukti), **Calon bersyarat**. Hasil boleh kurang daripada 3 dan tiada pengisian palsu.
- Sifar padanan: mesej tetap, sebab mengikut keperluan, calon terdekat diasingkan, **perubahan minimum** (tambahan bajet dalam RM atau satu syarat yang perlu dilonggarkan, dikira dengan menjalankan semula eligibility dengan satu syarat dilonggarkan dalam simulasi). Perubahan tidak sekali-kali digunakan tanpa tindakan pengguna (DoD 8).
- `explain.ts` menjana: 3 sebab utama, kompromi, perkara belum pasti, soalan kepada PJH (cth. "Adakah bilik Aziziyah berdua khusus untuk pasangan?"). Senarai perkataan larangan (`terjamin`, `dijamin`) disemak dalam ujian.

### 5.6 Kontrak API

`POST /api/assess` (Zod-validated):
```jsonc
// request
{ "requirements": { …Requirements… }, "scoringRulesVersion": "v1" }
// response
{
  "assessedAt": "…", "seasonId": "1448H", "datasetVersion": "ds-0003",
  "scoringRulesVersion": "v1", "engineVersion": "1.0.0",
  "catalogCoverage": { "pjhCount": 1, "variantCount": 4, "note": "4 varian disemak daripada sumber tersedia" },
  "groups": { "full_match": [Candidate], "needs_verification": [Candidate], "not_matching": [Candidate] },
  "recommendations": [{ "label": "CADANGAN_UTAMA", "candidateId": "…" }],
  "noMatch": null | { "reasons": [], "nearest": [{ "candidateId": "…", "minimalChange": {…} }] }
}
```
`Candidate` = varian, konfigurasi bilik, `CostBreakdown`, status setiap keperluan + evidence, skor, liputan, sebab, kompromi, ketidakpastian, sumber/halaman/tarikh semakan, status kekosongan.

`POST /api/compare`: `{ requirements, candidateIds[≤3] }` → baris perbandingan + "sebab beza harga" (diff komponen kos).

Katalog: `GET /api/catalog/seasons|pjhs|packages?season=|variants/:id`. Admin: `POST /api/admin/import`, `…/review/:draftId`, `…/publish`, `…/unpublish`, `…/upload` (token client upload Blob).

---

## 6. Seed Busyra dan fixture

`data/seed/busyra-1448h.json`. Semua nilai mengikut seksyen 12 spesifikasi:

| Varian | Pakej | `price_sen` | PMN | Aziziyah berdua (`per_person`) | Jumlah seorang |
|---|---|---:|---|---:|---:|
| MTSP02 | Makkah Tower Standard + PMN | 7 799 000 | included | 850 000 | 8 649 000 |
| SFSP02 | Safwah Tower Standard + PMN | 8 299 000 | included | 850 000 | 9 149 000 |
| MJPP02 | Menara Jam Premium + PMN | 9 399 000 | included | 850 000 | 10 249 000 |
| MJP02 | Menara Jam Premium, Muaisim | 8 599 000 | not_included | 850 000 | 9 449 000 |

Butiran lain:
- `tarwiyah_status = offered_subject_to_approval` (evidence: halaman pakej + hlm. 6). `aziziyah_status = included` (susunan asal 4/5/6 ikut jantina). Naik taraf berdua RM8,500 / bertiga RM7,500 seorang (hlm. 10).
- `duration_value = 40, duration_is_approximate = true, duration_min/max = NULL` (tiada toleransi dicipta).
- Stays: Madinah "Grand Millennium Al Haram" `or_equivalent=true`. Aziziyah "Dar Salah" `or_equivalent=true`, `date_label` "1–15 Zulhijjah" (Makkah/Safwah, hlm. 2/3) atau "4–14 Zulhijjah" (Menara Jam, hlm. 4). Makkah untuk Menara Jam: "Mövenpick Menara Jam" `or_equivalent=true`. **Nama hotel Makkah Tower/Safwah diambil daripada hlm. 2/3 apabila PDF ada; jangan infer daripada nama pakej**, jadi `not_stated` hingga disemak.
- `room_size_sqm`, `private_for_booking_group`, `private_bathroom` = NULL (unknown).
- `train_class`: Business Class Haramain untuk Safwah dan Menara Jam. `not_stated` untuk Makkah Standard. `flight_class = not_stated` untuk semua.
- `charges`: Bayaran haji PJH RM23,398 `included=true`. Tambahan PMN RM8,000 `included=true` bagi 3 varian PMN.
- `availability_status = inquiry_required`. `pjh_approvals.approval_status = unverified`.
- Evidence: `source_id = busyra-brochure-1448h`, `verification_status = transcribed_from_spec` hingga PDF disemak. Kompilasi: Busyra pada halaman PDF 33–44.

`tests/fixtures/synthetic-catalog.ts`: PJH rekaan berlabel "SINTETIK" dalam `season_id: "TEST"` untuk liputan kes (per_room, per_group, per_night, varian bertiga/berempat, Tarwiyah `offered`/`not_stated`, konflik harga, pakej `sold_out`, versi supersede). Tidak dimuatkan oleh `scripts/seed.ts` production. Lint rule/ujian memastikan ID fixture tidak muncul dalam seed.

---

## 7. Reka bentuk UI/UX (daripada UI UX Pro Max)

### 7.1 Hasil carian skill yang dipilih

| Carian | Keputusan dipilih | Sebab |
|---|---|---|
| `--design-system "comparison decision tool insurance financial planning trust"` (variance 2, motion 1, density 6) | Gaya **Minimalism & Swiss Style** (+ Accessible & Ethical); palet "Security blue + protected green" | Risiko aksesibiliti rendah, kos prestasi rendah, sesuai untuk alat profesional |
| `--domain product "comparison travel booking insurance"` | Insurance Platform: Minimalism + Flat, "Conversion-Optimized + Trust" | Lebih tepat daripada "Travel Agency" (Aurora/Motion, tidak sesuai) |
| `--domain typography "trustworthy readable professional accessible numbers"` | **Lexend** (tajuk) + **Source Sans 3** (badan) | Lexend direka untuk kebolehbacaan. Ramai pengguna warga emas |
| `--domain ux` wizard/borang | Penunjuk kemajuan, label kelihatan (bukan placeholder), validasi on-blur, maklum balas submit, ruang terpelihara (tiada content jump) | Severity High/Medium |
| `--domain ux` jadual/status | Ikon + teks selain warna. Jadual: skrol mendatar atau layout kad di telefon. Kontras ≥ 4.5:1 | Severity High |
| `--stack nextjs` | Server Components lalai, client hanya di hujung interaktif, Server Actions untuk mutasi admin, `dynamic()` untuk komponen berat (penonton PDF) | Severity High |
| `--stack shadcn` | `Table` semantik (`thead`/`tbody`), React Hook Form `useForm + Controller + Field` | Severity High |
| Elak (anti-pattern) | Foto generik, aliran tempahan kompleks, gradien ungu/merah jambu, emoji sebagai ikon | Daripada output design system |

### 7.2 Token reka bentuk (`design-system/pjh-helper/MASTER.md` → `globals.css`)

```css
:root {
  --background:#F0F9FF; --foreground:#0C4A6E;
  --card:#FFFFFF; --card-foreground:#0C4A6E;
  --primary:#0369A1; --primary-foreground:#FFFFFF;     /* CTA utama: "Nilai pakej" */
  --secondary:#0EA5E9; --secondary-foreground:#0F172A;
  --muted:#E7EFF5; --muted-foreground:#475569;
  --border:#BAE6FD; --ring:#0369A1; --destructive:#DC2626;
  /* Status: TIDAK hanya warna, sentiasa ikon + teks */
  --status-ok:#15803D;      /* Memenuhi        ✓ CheckCircle2 */
  --status-cond:#B45309;    /* Bersyarat       ⚠ AlertTriangle */
  --status-verify:#1D4ED8;  /* Perlu pengesahan ? HelpCircle  */
  --status-fail:#B91C1C;    /* Tidak memenuhi  ✕ XCircle      */
  --radius:0.5rem;
}
```
- Warna aksen hijau daripada palet **tidak** digunakan sebagai CTA supaya tidak bertembung dengan status "Memenuhi". CTA = `--primary`.
- Nombor wang: `font-variant-numeric: tabular-nums`. Jumlah selepas naik taraf paling besar pada kad. Harga "bermula dari" tidak dipaparkan sebagai jumlah.
- Saiz asas 16 px, line-height 1.5, sasaran sentuh ≥ 44×44 px, jarak ≥ 8 px.
- Motion minimum (150–250 ms, fade/translate kecil). Ikut `prefers-reduced-motion`. Tiada GSAP (motion 1/10).
- Mod gelap: tidak dalam MVP (token disediakan untuk masa depan). Mod cetak: hitam-putih, status kekal dengan ikon + teks.
- Breakpoint ujian: 375, 768, 1024, 1440 px.

### 7.3 Komponen utama

| Komponen | Spesifikasi |
|---|---|
| `StatusBadge` | Ikon Lucide + label BM + `aria-label` penuh ("Tarwiyah: Bersyarat — tertakluk kelulusan"). Satu sumber kebenaran untuk kad, banding dan laporan (DoD 5) |
| `MoneyInput` | `inputmode="decimal"`, prefix "RM", format semasa blur, ralat di bawah medan. Tiada slider sahaja |
| `Money` | Paparan `RM 86,490.00`. Varian `incomplete` menambah "Kos diketahui; caj tambahan belum lengkap" |
| `EvidenceLink` | "Sumber: Brosur Busyra hlm. 10 · disemak 3 Okt 2026". Popover memaparkan petikan asal |
| `ScoreExplainer` | Disclosure (`<details>`) memaparkan jadual dimensi → pemberat → utility → sumbangan, serta liputan bukti berasingan |
| `GlossaryTerm` | Tooltip/sheet untuk Aziziyah, PMN, Tarwiyah, Muaisim (teks dari sumber disemak) |
| `WizardShell` | Stepper "Langkah 2 daripada 5", butang Kembali/Seterusnya melekat di bawah (mobile), autosave localStorage, butang "Mula semula" |
| `HardSoftToggle` | Setiap keperluan: "Wajib (tidak boleh kompromi)" / "Keutamaan" |

### 7.4 Skrin

1. **Laman utama**: musim 1448H/2027M, kenyataan liputan ("Katalog: 1 PJH, 4 varian disemak daripada sumber tersedia; keputusan terhad kepada katalog ini"), CTA "Mula menilai". Tiada foto generik.
2. **Wizard 1 — Mula**: bilangan jemaah, jenis (pasangan/individu/kumpulan), bajet seorang (`MoneyInput`), skop bajet (pakej sahaja / termasuk perbelanjaan tambahan + medan peruntukan).
3. **Wizard 2 — Bilik**: komposisi bilik (bilangan bilik × penghuni, validasi jumlah = jemaah), Makkah, Madinah ("sama seperti Makkah" checkbox), **Aziziyah dipilih berasingan** (tidak auto-ikut, DoD 3), bilik khusus pasangan. Kotak penerangan: beza pakej berdua vs naik taraf Aziziyah.
4. **Wizard 3 — Perjalanan**: tempoh (julat atau sasaran ± toleransi, terima anggaran?), Aziziyah (wajib ada/tiada/tidak kisah → soalan susulan), Tarwiyah (4 pilihan + "terima tertakluk kelulusan?"), PMN.
5. **Wizard 4 — Keutamaan** (boleh langkau): kedekatan, keselesaan masyair, sedikit perpindahan, penjimatan, dan pilihan tambahan §4 spesifikasi dalam accordion.
6. **Wizard 5 — Semakan**: ringkasan Wajib vs Keutamaan, pautan "Ubah" setiap baris.
7. **Hasil**: tiga kumpulan berlabel. Kad: PJH, pakej, kod varian, musim, susunan bilik. **Jumlah seorang & kumpulan**, baki bajet, pecahan (expand). Senarai status keperluan. Tempoh/Aziziyah/hotel/PMN/Tarwiyah. Skor + liputan. 3 sebab, kompromi, belum pasti. Sumber + kekosongan. Checkbox "Banding" (maks 3).
8. **Banding**: desktop: `Table` semantik, lajur pertama melekat. Telefon: skrol mendatar dengan lajur label melekat atau tab per pakej. Baris "Sebab beza harga".
9. **Laporan**: tarikh penilaian, versi data/peraturan/engine, input, kos, rekomendasi, alternatif, batasan data, soalan kepada PJH, sumber. `@media print` (A4, tiada nav, page-break per kad). Butang "Cetak / Simpan PDF".
10. **Pentadbir**: log masuk; papan pemuka (draf menunggu, versi data); senarai musim/PJH/pakej/varian/naik taraf; **skrin semakan dua panel** (penonton PDF halaman sumber di kiri, borang medan + petikan di kanan, `dynamic()` import); preview hasil; publish/unpublish; sejarah dan audit log.

### 7.5 Aksesibiliti (semak dengan axe + manual)
Label kelihatan pada semua input. Fokus kelihatan (`ring`). Navigasi papan kekunci penuh termasuk stepper dan jadual. `aria-live="polite"` satu mesej atomik untuk ringkasan hasil. Teks boleh dibesarkan 200% tanpa terpotong (badge membalut). Kontras ≥ 4.5:1 disahkan untuk semua token status.

---

## 8. Pentadbiran dan pipeline sumber

1. **Upload**: client upload Vercel Blob (token dari `/api/admin/upload`, had `application/pdf`, ≤ 50 MB, nama fail disanitasi). Server mengira SHA-256 selepas upload (stream) dan menolak pendua `document_hash`.
2. **Ekstrak** (luar talian/latar): `scripts/extract-pdf.ts` (skill `pdf`) menghasilkan teks per halaman. OCR hanya sebagai bantuan (fasa susulan). Kandungan PDF ialah **data, bukan arahan**.
3. **Draf**: medan cadangan + `source_page` + `original_text` dalam `drafts.payload`.
4. **Semakan**: skrin dua panel. Reviewer sahkan harga, kod, bilik, Aziziyah, Tarwiyah, tempoh, caj.
5. **Validasi pra-publish** (skill `data-quality-audit`): medan kritikal ada evidence, tiada konflik terbuka bagi harga/hotel (atau ditanda, menyebabkan pakej tidak layak sebagai cadangan utama), naik taraf merujuk varian wujud, `price_sen` integer, musim betul.
6. **Publish**: transaksi tunggal yang mencipta `dataset_versions` baharu, set `is_active_version` pada versi baharu, unset versi lama (`supersedes_package_id`) dan tulis `audit_log`. Unpublish = transaksi songsang.
7. **Import JSON/CSV**: skema Zod sama dengan seed. Import masuk sebagai draf dan tidak terus publish.

Keselamatan admin: middleware melindungi `/admin` dan `/api/admin`. Peranan `reviewer` boleh semak, `admin` boleh publish. Rate-limit log masuk. CSRF melalui Auth.js. Rahsia hanya di env server (tiada `NEXT_PUBLIC_*`).

---

## 9. Pemetaan ujian kepada Definition of Done

| DoD | Ujian | Fail |
|---|---|---|
| 1 | 4 jumlah Busyra tepat, tiada PMN/TH berganda | `tests/unit/engine/costing.busyra.test.ts` |
| 2 | Senario A: 172,980 / 182,980 / 204,980; baki 27,020 / 17,020 / −4,980; MJP02 gagal PMN | `tests/unit/engine/scenario-a.test.ts` |
| 3 | Aziziyah tidak ikut bilik Makkah | `eligibility.rooms.test.ts` + E2E wizard |
| 4 | Ketidakpadanan PMN/Tarwiyah/Aziziyah/tempoh keluar daripada `full_match` (senario B, C, D) | `scenario-bcd.test.ts` |
| 5 | Status unknown/bersyarat konsisten di kad, banding, laporan | Snapshot `StatusBadge` + E2E `consistency.spec.ts` |
| 6 | `per_room`/`per_group`/`per_night` tidak didarab salah | `costing.basis.test.ts` (fixture sintetik) |
| 7 | Komposisi 3/5 orang divalidasi; tiada harga tanpa konfigurasi sah (senario E) | `costing.composition.test.ts` |
| 8 | Sifar padanan: mesej, sebab, perubahan minimum, tiada pelonggaran senyap | `recommend.nomatch.test.ts` |
| 9 | Ranking deterministik, normalisasi, data hilang ≠ skor penuh | `ranking.test.ts` (property test: shuffle input → susunan sama) |
| 10 | Publish brosur baharu: sejarah kekal, versi aktif tunggal | `tests/integration/db/publish.test.ts` (PGlite) |
| 11 | `unverified` → tiada badge diluluskan; kekosongan belum sah → tiada badge tersedia | `badges.test.tsx` + `explain.wording.test.ts` (larangan "terjamin") |
| 12 | Wizard → hasil → banding → cetak pada 375 px & 1440 px | `tests/e2e/flow.spec.ts` + axe |
| 13 | README lengkap | Semakan checklist dalam PR |
| 14 | Tiada dakwaan semua PJH dianalisis | E2E memeriksa teks liputan + `explain` |

Senario F (data tidak lengkap): `scenario-f.test.ts`. Naik taraf Unpriced menghasilkan `complete:false` dan `BERSYARAT`. Tarwiyah `not_stated` tidak lulus wajib.

Ujian API integrasi: `/api/assess` dan `/api/compare` dengan PGlite + seed Busyra + fixture TEST. Ujian keselamatan: `/api/admin/*` memulangkan 401 tanpa sesi. Upload bukan PDF ditolak.

---

## 10. CI/CD dan persekitaran

`.github/workflows/ci.yml` (push + pull_request): `pnpm install --frozen-lockfile` → `lint` → `typecheck` → `test` (Vitest, PGlite) → `build` → `e2e` (Playwright terhadap `next start` dengan DB ujian). Tiada akses DB production dalam CI.

| Env | DB | Migration/seed |
|---|---|---|
| Development | Postgres setempat atau cabang dev | `pnpm db:migrate && pnpm db:seed` manual |
| Preview (Vercel) | Cabang DB preview berasingan | Tidak pernah sentuh production. Seed hanya pada cabang preview |
| Production | DB production | `pnpm db:migrate` melalui langkah terkawal (GitHub Action manual `workflow_dispatch` atau arahan operator). Seed idempotent dijalankan sekali. **Tidak** dijalankan pada setiap build/request |

`.env.example` (nama muktamad ikut library sebenar):
```
DATABASE_URL=
AUTH_SECRET=
BLOB_READ_WRITE_TOKEN=
ADMIN_BOOTSTRAP_EMAIL=          # hanya untuk scripts/create-admin.ts
```
`.gitignore`: `.env*` (kecuali `.env.example`), `*.pdf`, `node_modules`, `.next`, `coverage`, `playwright-report`, dumps.

Rollback: Vercel "Promote previous deployment" / `git revert`. Migration ditulis serasi ke belakang (expand → migrate → contract). Rollback DB didokumenkan berasingan dalam `docs/deployment.md`.

---

## 11. Fasa pelaksanaan

Setiap fasa berakhir dengan commit/PR kecil ke branch kerja, CI hijau, dan semakan `code-review`.

### Fasa 0 — Asas projek (½ hari)
- `create-next-app` (TS, App Router, Tailwind, ESLint, `src/`), pnpm, Prettier, Vitest, Playwright.
- `shadcn init` + komponen asas (button, input, label, card, table, tabs, dialog, sheet, tooltip, accordion, badge, checkbox, radio-group, select, progress).
- Pasang UI UX Pro Max (`npx ui-ux-pro-max-cli init --ai claude`), tulis `design-system/pjh-helper/MASTER.md` (§7.2), token ke `globals.css`, fon Lexend + Source Sans 3 melalui `next/font`.
- `.env.example`, `.gitignore`, `README.md` rangka, `ci.yml`, SessionStart hook.
- **Terima:** `pnpm lint typecheck test build` lulus dan CI hijau.

### Fasa 1 — Engine + ujian (2–3 hari) ← kerja paling kritikal
- `types.ts`, `money.ts`, `costing.ts`, `eligibility.ts`, `ranking.ts`, `recommend.ts`, `explain.ts`.
- Fixture sintetik + seed Busyra JSON (dimuat terus oleh ujian, tanpa DB).
- **Terima:** DoD 1–4, 6–9, 11 (bahagian engine), senario A–F lulus. Liputan engine ≥ 90%.

### Fasa 2 — Model data, migration, seed (1–2 hari)
- `schema.ts` (§4), migration awal, `seed.ts` idempotent (upsert, run dua kali = tiada perubahan), `catalog-snapshot.ts` (DB → objek engine).
- `data/sources/manifest.json` (hash `pending` hingga PDF diterima).
- **Terima:** ujian integrasi PGlite: seed dua kali sama, snapshot = JSON seed, penapisan musim.

### Fasa 3 — API awam (1 hari)
- `/api/assess`, `/api/compare`, `/api/catalog/*`, Zod, ralat BM berstruktur, cache ikut `dataset_version`.
- **Terima:** ujian integrasi API. Respons mengandungi versi data/peraturan/engine.

### Fasa 4 — Wizard (2 hari)
- `WizardShell`, 5 langkah, `MoneyInput`, `HardSoftToggle`, glosari, autosave/reset localStorage, validasi on-blur.
- **Terima:** E2E pasangan RM100,000 sampai skrin semakan. Aziziyah berasingan (DoD 3). Axe tiada pelanggaran serius.

### Fasa 5 — Hasil, banding, laporan (2–3 hari)
- Kad hasil, `StatusBadge`, `ScoreExplainer`, `EvidenceLink`, keadaan sifar padanan, banding ≤ 3, laporan cetak.
- Semakan UI UX Pro Max: `"comparison table mobile" --domain ux`, `"print layout" --domain ux`, checklist pra-penghantaran.
- **Terima:** DoD 5, 8 (UI), 11 (badge), 12, 14. Snapshot cetak A4.

### Fasa 6 — Pentadbir (3 hari)
- Auth.js + `create-admin.ts`, middleware, RBAC, CRUD musim/PJH/pakej/varian/naik taraf/caj, import JSON/CSV → draf, upload Blob + hash, skrin semakan dua panel, validasi pra-publish, publish/unpublish transaksi, sejarah, audit log.
- **Terima:** DoD 10. Admin 401 tanpa sesi. Upload bukan PDF ditolak. `security-review` lulus.

### Fasa 7 — Sumber sebenar (½–1 hari, bergantung PDF)
- Apabila PDF diterima: letak di `data/sources/` (tidak di-commit) atau Blob, kira hash, kemas kini manifest, ekstrak hlm. 2, 3, 4, 6, 10 (brosur) dan 33–44 (kompilasi), semak nilai seed. Medan yang sepadan menjadi `verification_status = verified`. Jika ada percanggahan, rekod `conflict` dan laporkan.
- Isi nama hotel Makkah Tower/Safwah daripada hlm. 2/3.

### Fasa 8 — Deployment Vercel (1 hari)
1. Vercel MCP: `list_teams` → `list_projects`. Guna projek sedia ada yang berkaitan, atau cipta `pjh-helper-2027m` dan sambungkan ke repo GitHub.
2. Pasang integrasi Postgres (Neon) dan Blob melalui Marketplace (pelan percuma sedia ada sahaja; sebarang kos memerlukan kelulusan pengguna).
3. Env berasingan Development/Preview/Production. Migration production terkawal, seed sekali, `create-admin`.
4. Preview deployment → sahkan → production.
5. **Pemeriksaan selepas deploy** (seksyen 20 spesifikasi): laman utama + liputan, wizard senario A memberi angka tepat, API berfungsi, admin login + tulis/baca rekod ujian (kemudian dibersihkan) + kekal selepas redeploy, akses PDF ikut aturan storage, cetak/telefon/ralat, logs tanpa rahsia.

### Fasa 9 — Pengerasan dan serahan (½–1 hari)
- `code-review`, `security-review`, `simplify`. Semakan pra-penghantaran UI UX Pro Max (kontras, fokus, 44 px, reduced-motion, 375–1440 px).
- README penuh (setup, tests, env, migration, seed, import, deploy, rollback, **batasan katalog: hanya Busyra**).
- Serahan: URL repo, URL production, commit SHA, ID deployment, checks yang lulus, batasan sebenar.

**Anggaran jumlah:** ~14–18 hari kerja pembangun (Fasa 7 bergantung pada ketersediaan PDF).

---

## 12. Risiko dan keputusan yang perlu pengguna buat

| # | Risiko / soalan | Cadangan |
|---|---|---|
| 1 | PDF sumber tidak dilampirkan dalam sesi ini | Muat naik kedua-dua PDF. Sementara itu seed ditanda `transcribed_from_spec` |
| 2 | Harga varian bertiga/berempat Busyra tidak ditranskripsi | Transkripsi dari brosur. Tanpanya senario E hanya boleh memberi "tiada konfigurasi sah" |
| 3 | Pasukan/projek Vercel dan penyedia DB | Sahkan pasukan Vercel. Cadangan: Neon + Vercel Blob (pelan percuma sedia ada) |
| 4 | Status kelulusan PJH 1448H | Perlu sumber rasmi (senarai PJH diluluskan TH) sebelum label "diluluskan" |
| 5 | Teks glosari (Aziziyah, PMN, Tarwiyah) | Gunakan penerangan brosur hlm. 6 + sumber rasmi TH. Minta semakan pengguna |
| 6 | Pemberat skor v1 | Boleh diubah oleh admin dengan versi baharu. Laporan menyimpan versi |
| 7 | Had masa fungsi/upload Vercel | Semak dokumentasi semasa (seksyen 22) sebelum Fasa 6/8 |

---

## 13. Checklist ringkas pelaksana

- [ ] Fasa 0 asas + UI UX Pro Max + CI
- [ ] Fasa 1 engine + senario A–F
- [ ] Fasa 2 skema/migration/seed idempotent
- [ ] Fasa 3 API assess/compare/katalog
- [ ] Fasa 4 wizard
- [ ] Fasa 5 hasil/banding/laporan cetak
- [ ] Fasa 6 pentadbir + auth + publish/history
- [ ] Fasa 7 sahkan seed dengan PDF
- [ ] Fasa 8 Vercel preview → production + pemeriksaan
- [ ] Fasa 9 semakan, README, serahan
