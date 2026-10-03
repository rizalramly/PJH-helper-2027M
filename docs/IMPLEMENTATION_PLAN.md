# Pelan Pelaksanaan — Perancang Pakej Haji PJH (MVP 1448H/2027M)

Versi pelan: 1.2 | Tarikh: 3 Oktober 2026 | Rujukan: `Spesifikasi_Aplikasi_Perancang_Pakej_Haji_PJH.md` v1.3

Pelan ini menterjemah spesifikasi kepada kerja pembangunan berperingkat yang boleh disemak. Setiap fasa ada senarai fail, kriteria penerimaan dan ujian yang dipetakan ke Definition of Done (DoD, seksyen 17 spesifikasi). Jika pelan ini bercanggah dengan spesifikasi, spesifikasi menang.

---

## 0. Keadaan semasa dan andaian

| Perkara                                  | Status pada 3 Okt 2026                                                                                          | Kesan kepada pelan                                                                  |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Repository `rizalramly/PJH-helper-2027M` | Fasa 0 siap (Next.js 16, CI, sistem reka bentuk)                                                                | Teruskan dengan Fasa 1 (katalog 34 PJH)                                             |
| PDF sumber                               | Versi termampat diterima (`docs/…_Bawah_29MB.pdf`, 141 hlm., imej ~103 ppi). Versi resolusi asal belum diterima | Ekstraksi visual daripada versi termampat. Teks kabur → `unclear` + blocker (§14.5) |
| Kelulusan PJH Busyra untuk 1448H         | Belum disahkan                                                                                                  | `approval_status = unverified`; tiada badge "diluluskan"                            |
| Harga bilik bertiga/berempat Busyra      | **Ditemui** dalam PDF hlm. 34–36 (bilik 2–6)                                                                    | Senario E menggunakan varian bertiga sebenar (cth. MTSP03, SFSP03, MJPP03)          |
| Pakej VIP ±25 hari                       | Ditranskripsi daripada hlm. 37 (VIP02 RM159,990)                                                                | Di-seed. Senario D: VIP ±25 hari lulus had 30 hari tetapi melebihi bajet RM100,000  |
| Projek/akaun Vercel, DB dan storage      | Belum ditentukan                                                                                                | Fasa 8 menyemak melalui connector Vercel. Jangan beli pelan                         |

### 0.1 Keputusan pengguna (3 Okt 2026), mengatasi bahagian lain pelan ini

1. **Sumber data:** gunakan PDF kompilasi yang dimuat naik, `docs/Pakej_Haji_2027_Semua_34_PJH_Bawah_29MB.pdf` (141 halaman, SHA-256 `e900b9c5…fa4060`, halaman imej tanpa lapisan teks). Brosur Busyra 12 halaman tidak diberikan, jadi halaman Busyra dalam kompilasi (hlm. PDF 33–44) menjadi sumber. Jika sesuatu medan tidak dinyatakan, ikut templat halaman pakej dalam PDF tersebut sahaja dan rekod sebagai `not_stated`. Tiada nilai dicipta. Ini meliputi item risiko 1–3 (§12).
2. **Stor data:** **Vercel Blob** menggantikan PostgreSQL sebagai stor persisten. Reka bentuk:
   - `catalog/<season>/datasets/<dataset_version>.json`: snapshot katalog yang tidak boleh diubah (pakej, varian, stays, naik taraf, caj, evidence, kelulusan). Sejarah = senarai fail ini.
   - `catalog/<season>/active.json`: penunjuk versi aktif. Publish menulis snapshot baharu dahulu, kemudian mengemas kini penunjuk dengan `put(..., { ifMatch: etag })` (optimistic concurrency). Jika ETag berubah, operasi gagal dan perlu dicuba semula, jadi tiada tulis senyap.
   - `drafts/<id>.json` (draf import/semakan), `audit/<yyyy-mm>/<timestamp>-<uuid>.json` (satu objek setiap peristiwa, append-only), `admin/users.json` (hash argon2id, dikemas kini dengan `ifMatch`), `sources/<sha256>.pdf` (`access: 'private'`).
   - Akses melalui antara muka `CatalogStore` dalam `src/lib/storage/`. Ujian menggunakan pelaksanaan dalam memori. Jika PostgreSQL diperlukan kemudian, hanya pelaksanaan stor ditukar.
   - Had yang diterima: tiada transaksi berbilang objek dan tiada pertanyaan SQL. Katalog kecil (puluhan varian) dimuatkan penuh dan dicache ikut `dataset_version`. Preview dan Production menggunakan Blob store berasingan.
   - Bahagian §2–§4, §9–§10 yang menyebut Drizzle/PostgreSQL/PGlite/migration SQL dibaca sebagai: skema Zod + fail JSON berversi dalam Blob, ujian dengan stor dalam memori, "migration" = skrip transformasi JSON berversi (`schema_version`).
3. **Nota repo:** PDF kompilasi 26 MB telah di-commit oleh pengguna ke `docs/`. Spesifikasi §19 mencadangkan PDF besar disimpan di object storage, jadi pertimbangkan untuk memindahkannya ke Blob (`sources/`) selepas Fasa 6.

### 0.2 Perubahan spesifikasi v1.3 dan kesannya

| Perubahan v1.3                                                                                                                                         | Kesan kepada pelan                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| §2, §23: **katalog wajib semua 34 PJH** dalam kompilasi, semua pakej dan semua varian bilik/harga                                                      | Fasa 1 kini ialah inventori + ekstraksi 34 PJH (§14 pelan ini). Busyra bukan lagi satu-satunya seed                               |
| §12: empat varian Busyra ialah **fixture rujukan pengiraan**, bukan katalog                                                                            | Ujian DoD 1–2 kekal pada empat varian ini. Semua 41 varian Busyra lain turut diekstrak                                            |
| §17 DoD 14–18 baharu: rekod sumber/halaman setiap PJH, katalog penuh di production, kelulusan per PJH, blocking data gaps, ujian merentas beberapa PJH | §9 dikemas kini. Fasa 8 tidak boleh publish "liputan lengkap" selagi ada blocker                                                  |
| §23.3: `data/catalog-coverage.json` + halaman awam "Liputan data"                                                                                      | Ditambah kepada Fasa 1 (data) dan Fasa 6 (UI)                                                                                     |
| §23.4: pilihan "Utamakan kepelbagaian PJH"; cadangan menyatakan liputan dataset                                                                        | Ditambah kepada engine (§5.5) dan kad hasil                                                                                       |
| §23.1: jika teks kecil kabur dalam versi termampat, rujuk versi resolusi asal                                                                          | Medan kabur ditanda `unclear` dan disenaraikan sebagai blocker. Perlu fail `Pakej_Haji_2027_Semua_34_PJH.pdf` (resolusi asal)     |
| §15 masih menyebut PostgreSQL                                                                                                                          | Keputusan pengguna §0.1 (Vercel Blob) dikekalkan. Antara muka `CatalogStore` membolehkan pertukaran ke PostgreSQL jika diperlukan |

---

## 1. Skill dan alat yang digunakan

| Skill / alat                                                     | Digunakan untuk                                                                                                                                                   | Fasa       |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| **UI UX Pro Max** (`nextlevelbuilder/ui-ux-pro-max-skill` v2.13) | Sistem reka bentuk (gaya, warna, tipografi), semakan UX/aksesibiliti, garis panduan stack `nextjs` dan `shadcn`, ikon. Hasil carian sebenar diringkaskan dalam §7 | 0, 5, 6, 9 |
| `anthropic-skills:pdf`                                           | Ekstrak teks dan halaman daripada brosur ke draf import (secara luar talian, bukan dalam request penilaian)                                                       | 2, 7       |
| `anthropic-skills:postgres-pro`                                  | Reka bentuk skema, indeks, kekangan unik untuk versi aktif, strategi migration                                                                                    | 2          |
| `anthropic-skills:karpathy-guidelines`                           | Disiplin pengekodan: perubahan kecil, kriteria kejayaan yang boleh disahkan                                                                                       | Semua      |
| `anthropic-skills:data-quality-audit`                            | Peraturan validasi import (medan wajib, konflik, pendua) sebelum publish                                                                                          | 7          |
| `run` + Playwright (Chromium pra-pasang)                         | Lancar app dan uji wizard → laporan pada 375 px dan 1440 px                                                                                                       | 6, 9       |
| `code-review`, `security-review`, `simplify`                     | Semakan sebelum setiap PR dan sebelum production                                                                                                                  | 9          |
| `session-start-hook`                                             | Hook supaya sesi cloud Claude Code boleh jalankan `pnpm test`/lint                                                                                                | 0          |
| GitHub MCP                                                       | Branch, PR dan status CI                                                                                                                                          | 0, 8       |
| Vercel MCP                                                       | Projek, env, deployment, logs, storage Blob                                                                                                                       | 8          |

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
  └─ src/lib/storage/ (CatalogStore) → Vercel Blob: katalog JSON berversi, draf, audit, PDF sumber (§0.1)
```

Prinsip:

1. **Engine tulen.** Engine menerima `CatalogSnapshot` + `Requirements` + `ScoringRules`, kemudian memulangkan `AssessmentResult`. Tiada DB, `Date.now()` atau rangkaian. Masa penilaian dihantar sebagai argumen. Dengan cara ini engine deterministik dan mudah diuji.
2. **Snapshot katalog.** `/api/assess` memuatkan katalog `published` bagi satu musim dan `dataset_version` aktif. Hasil dicache mengikut `dataset_version` (revalidate apabila publish).
3. **Tanpa LLM.** Naratif rekomendasi dijana daripada templat BM dan data berstruktur (`explain.ts`).
4. **Versi.** Setiap laporan menyimpan `dataset_version`, `scoring_rules_version` dan `engine_version`.

### Pilihan teknologi (sahkan versi stabil semasa pelaksanaan; guna lockfile)

| Lapisan           | Pilihan                                                                    | Sebab                                                          |
| ----------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Framework         | Next.js (App Router) + React + TypeScript `strict`                         | Ditetapkan spesifikasi                                         |
| UI                | Tailwind CSS + shadcn/ui (Radix) + ikon Lucide                             | Garis panduan stack `shadcn` UI UX Pro Max; aksesibiliti Radix |
| Borang            | React Hook Form + Zod (`useForm` + `Controller` + `Field`)                 | Ikut cadangan stack shadcn semasa                              |
| Skema / migration | Zod + `schema_version` dalam setiap fail JSON; skrip transformasi berversi | Tiada ORM kerana tiada SQL (§0.1)                              |
| Stor data         | Vercel Blob (`CatalogStore`); ujian: stor dalam memori                     | Keputusan pengguna §0.1; tiada SQLite/filesystem fungsi        |
| Storage           | Vercel Blob (`@vercel/blob` client upload)                                 | Upload PDF besar terus ke storage, bukan melalui body fungsi   |
| Auth admin        | Auth.js (Credentials) + argon2id + sesi JWT/DB, peranan `admin`/`reviewer` | Tiada kata laluan plaintext atau lalai                         |
| Ujian             | Vitest (unit + integration), Playwright (E2E), `@axe-core/playwright`      | DoD 1–12                                                       |
| Kualiti           | ESLint, Prettier, `tsc --noEmit`                                           | CI                                                             |
| Pakej             | pnpm                                                                       | Lockfile deterministik                                         |

---

## 3. Struktur direktori

```text
.
├─ .claude/skills/ui-ux-pro-max/        # dipasang Fasa 0
├─ .github/workflows/ci.yml
├─ data/
│  ├─ catalog-coverage.json             # manifest liputan 34 PJH (spesifikasi §23.3)
│  ├─ catalog/1448h/<pjh-id>.json       # katalog berstruktur setiap PJH + evidence
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

## 4. Model data (skema Zod; disimpan sebagai JSON berversi dalam Vercel Blob, §0.1)

Semua ID ialah teks stabil (cth. `busyra`, `busyra-1448-mtsp`, `MTSP02`). Wang disimpan sebagai `bigint` sen. Nilai "tidak diketahui" disimpan sebagai enum eksplisit atau `NULL` bersama evidence, bukan `false` atau `0`.

### 4.1 Jadual spesifikasi (seksyen 10)

| Jadual                    | Medan utama / nota                                                                                                                                                                                                         |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `seasons`                 | `id`, `hijri_year`, `gregorian_year`, `label`, `active`                                                                                                                                                                    |
| `pjhs`                    | `id`, `name`, `website`, `public_contact`                                                                                                                                                                                  |
| `pjh_approvals`           | `pjh_id`, `season_id`, `approval_status` (`verified_approved`/`unverified`/`not_approved`), `licence_number`, `verified_at`, `source_id`                                                                                   |
| `sources`                 | + `document_hash` UNIQUE, `supersedes_source_id`, `version`, `source_type` enum                                                                                                                                            |
| `packages`                | Medan seksyen 10 + `supersedes_package_id`, `is_active_version` (unique partial index per `logical_package_key`+`season_id`)                                                                                               |
| `package_variants`        | + `price_status` (`priced`/`unpriced`), `pmn_status` (`included`/`not_included`/`optional`/`not_stated`), `flight_class`/`train_class` (`not_stated` dibenarkan), `aziziyah_occupancy` (biasanya NULL: ikut `stays`)       |
| `stays`                   | Urutan `sequence_no` (Makkah → Aziziyah → Makkah), `or_equivalent`, `distance_m` + `distance_reference` enum (`haram_courtyard`/`gate`/`prayer_area`/`nabawi_courtyard`/`not_stated`)                                      |
| `upgrades`                | `pricing_basis` enum (`per_person`/`per_room`/`per_group`/`per_night`), `price_sen` NULL = Unpriced, `applicable_variant_ids[]`, `included_in_variant_ids[]`, `resulting_occupancy`                                        |
| `evidence`                | `entity_type`, `entity_id`, `field_name`, `source_id`, `source_page`, `pdf_page_in_compilation`, `original_text`, `verification_status` (`transcribed_from_spec`/`draft`/`verified`/`conflict`), `reviewer`, `reviewed_at` |
| `hotels`, `hotel_reviews` | Rating mengikut platform; `rating_scale` wajib; tiada agregat merentas platform                                                                                                                                            |

### 4.2 Jadual tambahan yang diperlukan untuk pelaksanaan

| Jadual                      | Sebab                                                                                                                                      |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `charges`                   | Caj wajib atau tetap: `package_id`, `variant_ids[]`, `basis`, `price_sen` NULL, `included` (cth. bayaran haji TH RM23,398 `included=true`) |
| `dataset_versions`          | `id`, `season_id`, `published_at`, `published_by`, `notes`. Setiap publish menaikkan versi                                                 |
| `scoring_rule_versions`     | Pemberat dan parameter JSON, `version`, `active`                                                                                           |
| `import_batches` / `drafts` | Draf import JSON/CSV/PDF sebelum semakan: `payload` JSONB, `status` (`draft`/`in_review`/`approved`/`rejected`), `validation_report`       |
| `admin_users`               | `email`, `password_hash` (argon2id), `role`, `disabled_at`                                                                                 |
| `audit_log`                 | `actor`, `action`, `entity`, `before`/`after` JSONB, `at` (append-only)                                                                    |

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

| Keperluan                          | MEMENUHI                                             | BERSYARAT                                   | PERLU_PENGESAHAN                     | TIDAK_MEMENUHI                                      |
| ---------------------------------- | ---------------------------------------------------- | ------------------------------------------- | ------------------------------------ | --------------------------------------------------- |
| Bajet                              | kos lengkap ≤ bajet                                  | kos diketahui ≤ bajet tetapi ada `Unpriced` | —                                    | kos diketahui > bajet                               |
| Bilik Makkah/Madinah               | varian occupancy sama                                | —                                           | occupancy `not_stated`               | tiada varian sah                                    |
| Aziziyah wajib ada                 | `included`/`optional` + naik taraf berharga & sesuai | naik taraf Unpriced / kekosongan belum sah  | `not_stated`                         | `explicitly_not_included`                           |
| Aziziyah tidak mahu                | `explicitly_not_included`                            | —                                           | `not_stated`                         | `included` (tiada andaian boleh dibuang, senario C) |
| Tempoh                             | julat dalam had                                      | `±N` anggaran dan `acceptApproximate`       | maks ketat + anggaran (perlu tarikh) | di luar had (±40 > 30, senario D)                   |
| Tarwiyah wajib + terima syarat     | `offered`                                            | `offered_subject_to_approval` (label kekal) | `not_stated`                         | `explicitly_not_offered`                            |
| Tarwiyah wajib tanpa terima syarat | `offered`                                            | —                                           | `not_stated`                         | `offered_subject_to_approval` (senario B)           |
| PMN wajib                          | `pmn_status=included`                                | —                                           | `not_stated`                         | `not_included` (MJP02, senario A)                   |
| Bilik khusus pasangan              | `private_for_booking_group=true`                     | —                                           | NULL (Busyra)                        | `false`                                             |

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
- **Kepelbagaian PJH** (spesifikasi §23.4): pilihan `diversifyPjh` memilih calon terbaik setiap PJH untuk slot cadangan tanpa menyembunyikan calon lain. Tiada PJH di-hardcode sebagai pemenang.
- Setiap hasil menyatakan liputan dataset: PJH diproses, PJH layak selepas penapisan, varian ditapis dan tarikh semakan. PJH `unverified` kekal dalam katalog tetapi tidak dilabel "PJH diluluskan".
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

## 6. Katalog, fixture rujukan Busyra dan fixture sintetik

Katalog sebenar ialah semua 34 PJH (§14). Busyra telah ditranskripsi dahulu (hlm. PDF 33–44, nota: `docs/sources/busyra-1448h-transcription.md`):

- **11 keluarga pakej, 41 varian**: Makkah Tower Ekonomi (Muaisim 5 + PMN 4), Makkah Tower Standard (5 + 4), Safwah Tower Ekonomi (4 + 4), Safwah Tower Standard (4 + 4), Menara Jam Premium (3 + 3), VIP (1).
- Hotel Makkah: "Makkah Tower @ Setaraf", "Safwah Tower @ Setaraf", "Movenpick Menara Jam @ Setaraf", "Makkah Hotel / @ Setaraf" (VIP). Madinah: Worth Peninsular (Ekonomi) atau Grand Millennium Al Haram (Standard/Premium/VIP). Aziziyah: Hotel Dar Salah @ Setaraf. Semua "@ Setaraf" → `or_equivalent=true`.
- **Aziziyah juga bersyarat**: "Penginapan di Aziziyah (Bergantung kepada kebenaran Tabung Haji dan Kerajaan Saudi)". Enjin menyokong `aziziyah.acceptConditional` seperti Tarwiyah.
- Takaful tambahan kecuali Makkah Tower Ekonomi dan Safwah Ekonomi (hlm. 44). Business Class Haramain hanya Safwah Standard, Menara Jam dan VIP (hlm. 44).
- Naik taraf buffet Standard bagi pakej Ekonomi: RM5,500 (hlm. 34) dan **kabur** (RM5,500 atau RM6,500) pada hlm. 35 → `unclear`, harga `null`.

**Fixture rujukan pengiraan** (spesifikasi §12) kekal empat varian ini:

| Varian | Pakej                       | `price_sen` | PMN          | Aziziyah berdua (`per_person`) | Jumlah seorang |
| ------ | --------------------------- | ----------: | ------------ | -----------------------------: | -------------: |
| MTSP02 | Makkah Tower Standard + PMN |   7 799 000 | included     |                        850 000 |      8 649 000 |
| SFSP02 | Safwah Tower Standard + PMN |   8 299 000 | included     |                        850 000 |      9 149 000 |
| MJPP02 | Menara Jam Premium + PMN    |   9 399 000 | included     |                        850 000 |     10 249 000 |
| MJP02  | Menara Jam Premium, Muaisim |   8 599 000 | not_included |                        850 000 |      9 449 000 |

Evidence menggunakan `sourceId = compilation-34pjh-1448h`, `pdfPage` (kompilasi) dan `brochurePage` (= pdfPage − 32 bagi Busyra), `status = transcribed` hingga disemak manusia.

`tests/fixtures/synthetic-catalog.ts`: PJH rekaan berlabel "SINTETIK" dalam `season_id: "TEST"` untuk liputan kes (per_room, per_group, per_night, varian bertiga/berempat, Tarwiyah `offered`/`not_stated`, konflik harga, pakej `sold_out`, versi supersede). Tidak dimuatkan oleh `scripts/seed.ts` production. Lint rule/ujian memastikan ID fixture tidak muncul dalam seed.

---

## 7. Reka bentuk UI/UX (daripada UI UX Pro Max)

### 7.1 Hasil carian skill yang dipilih

| Carian                                                                                                            | Keputusan dipilih                                                                                                                              | Sebab                                                                          |
| ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `--design-system "comparison decision tool insurance financial planning trust"` (variance 2, motion 1, density 6) | Gaya **Minimalism & Swiss Style** (+ Accessible & Ethical); palet "Security blue + protected green"                                            | Risiko aksesibiliti rendah, kos prestasi rendah, sesuai untuk alat profesional |
| `--domain product "comparison travel booking insurance"`                                                          | Insurance Platform: Minimalism + Flat, "Conversion-Optimized + Trust"                                                                          | Lebih tepat daripada "Travel Agency" (Aurora/Motion, tidak sesuai)             |
| `--domain typography "trustworthy readable professional accessible numbers"`                                      | **Lexend** (tajuk) + **Source Sans 3** (badan)                                                                                                 | Lexend direka untuk kebolehbacaan. Ramai pengguna warga emas                   |
| `--domain ux` wizard/borang                                                                                       | Penunjuk kemajuan, label kelihatan (bukan placeholder), validasi on-blur, maklum balas submit, ruang terpelihara (tiada content jump)          | Severity High/Medium                                                           |
| `--domain ux` jadual/status                                                                                       | Ikon + teks selain warna. Jadual: skrol mendatar atau layout kad di telefon. Kontras ≥ 4.5:1                                                   | Severity High                                                                  |
| `--stack nextjs`                                                                                                  | Server Components lalai, client hanya di hujung interaktif, Server Actions untuk mutasi admin, `dynamic()` untuk komponen berat (penonton PDF) | Severity High                                                                  |
| `--stack shadcn`                                                                                                  | `Table` semantik (`thead`/`tbody`), React Hook Form `useForm + Controller + Field`                                                             | Severity High                                                                  |
| Elak (anti-pattern)                                                                                               | Foto generik, aliran tempahan kompleks, gradien ungu/merah jambu, emoji sebagai ikon                                                           | Daripada output design system                                                  |

### 7.2 Token reka bentuk (`design-system/pjh-helper/MASTER.md` → `globals.css`)

```css
:root {
  --background: #f0f9ff;
  --foreground: #0c4a6e;
  --card: #ffffff;
  --card-foreground: #0c4a6e;
  --primary: #0369a1;
  --primary-foreground: #ffffff; /* CTA utama: "Nilai pakej" */
  --secondary: #0ea5e9;
  --secondary-foreground: #0f172a;
  --muted: #e7eff5;
  --muted-foreground: #475569;
  --border: #bae6fd;
  --ring: #0369a1;
  --destructive: #dc2626;
  /* Status: TIDAK hanya warna, sentiasa ikon + teks */
  --status-ok: #15803d; /* Memenuhi        ✓ CheckCircle2 */
  --status-cond: #b45309; /* Bersyarat       ⚠ AlertTriangle */
  --status-verify: #1d4ed8; /* Perlu pengesahan ? HelpCircle  */
  --status-fail: #b91c1c; /* Tidak memenuhi  ✕ XCircle      */
  --radius: 0.5rem;
}
```

- Warna aksen hijau daripada palet **tidak** digunakan sebagai CTA supaya tidak bertembung dengan status "Memenuhi". CTA = `--primary`.
- Nombor wang: `font-variant-numeric: tabular-nums`. Jumlah selepas naik taraf paling besar pada kad. Harga "bermula dari" tidak dipaparkan sebagai jumlah.
- Saiz asas 16 px, line-height 1.5, sasaran sentuh ≥ 44×44 px, jarak ≥ 8 px.
- Motion minimum (150–250 ms, fade/translate kecil). Ikut `prefers-reduced-motion`. Tiada GSAP (motion 1/10).
- Mod gelap: tidak dalam MVP (token disediakan untuk masa depan). Mod cetak: hitam-putih, status kekal dengan ikon + teks.
- Breakpoint ujian: 375, 768, 1024, 1440 px.

### 7.3 Komponen utama

| Komponen         | Spesifikasi                                                                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `StatusBadge`    | Ikon Lucide + label BM + `aria-label` penuh ("Tarwiyah: Bersyarat — tertakluk kelulusan"). Satu sumber kebenaran untuk kad, banding dan laporan (DoD 5) |
| `MoneyInput`     | `inputmode="decimal"`, prefix "RM", format semasa blur, ralat di bawah medan. Tiada slider sahaja                                                       |
| `Money`          | Paparan `RM 86,490.00`. Varian `incomplete` menambah "Kos diketahui; caj tambahan belum lengkap"                                                        |
| `EvidenceLink`   | "Sumber: Brosur Busyra hlm. 10 · disemak 3 Okt 2026". Popover memaparkan petikan asal                                                                   |
| `ScoreExplainer` | Disclosure (`<details>`) memaparkan jadual dimensi → pemberat → utility → sumbangan, serta liputan bukti berasingan                                     |
| `GlossaryTerm`   | Tooltip/sheet untuk Aziziyah, PMN, Tarwiyah, Muaisim (teks dari sumber disemak)                                                                         |
| `WizardShell`    | Stepper "Langkah 2 daripada 5", butang Kembali/Seterusnya melekat di bawah (mobile), autosave localStorage, butang "Mula semula"                        |
| `HardSoftToggle` | Setiap keperluan: "Wajib (tidak boleh kompromi)" / "Keutamaan"                                                                                          |

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
10. **Liputan data** (awam, spesifikasi §23.3): PJH diproses / dijangka, pakej dan varian disemak, item belum selesai, liputan medan penting, kelulusan disahkan. Metrik dipaparkan berasingan; "34/34 diproses" tidak bermaksud semua diluluskan atau tersedia.
11. **Pentadbir**: log masuk; papan pemuka (draf menunggu, versi data); senarai musim/PJH/pakej/varian/naik taraf; **skrin semakan dua panel** (penonton PDF halaman sumber di kiri, borang medan + petikan di kanan, `dynamic()` import); preview hasil; publish/unpublish; sejarah dan audit log.

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

| DoD | Ujian                                                                                            | Fail                                                                                                               |
| --- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| 1   | 4 jumlah Busyra tepat, tiada PMN/TH berganda                                                     | `tests/unit/engine/costing.busyra.test.ts`                                                                         |
| 2   | Senario A: 172,980 / 182,980 / 204,980; baki 27,020 / 17,020 / −4,980; MJP02 gagal PMN           | `tests/unit/engine/scenario-a.test.ts`                                                                             |
| 3   | Aziziyah tidak ikut bilik Makkah                                                                 | `eligibility.rooms.test.ts` + E2E wizard                                                                           |
| 4   | Ketidakpadanan PMN/Tarwiyah/Aziziyah/tempoh keluar daripada `full_match` (senario B, C, D)       | `scenario-bcd.test.ts`                                                                                             |
| 5   | Status unknown/bersyarat konsisten di kad, banding, laporan                                      | Snapshot `StatusBadge` + E2E `consistency.spec.ts`                                                                 |
| 6   | `per_room`/`per_group`/`per_night` tidak didarab salah                                           | `costing.basis.test.ts` (fixture sintetik)                                                                         |
| 7   | Komposisi 3/5 orang divalidasi; tiada harga tanpa konfigurasi sah (senario E)                    | `costing.composition.test.ts`                                                                                      |
| 8   | Sifar padanan: mesej, sebab, perubahan minimum, tiada pelonggaran senyap                         | `recommend.nomatch.test.ts`                                                                                        |
| 9   | Ranking deterministik, normalisasi, data hilang ≠ skor penuh                                     | `ranking.test.ts` (property test: shuffle input → susunan sama)                                                    |
| 10  | Publish brosur baharu: sejarah kekal, versi aktif tunggal                                        | `tests/integration/db/publish.test.ts` (PGlite)                                                                    |
| 11  | `unverified` → tiada badge diluluskan; kekosongan belum sah → tiada badge tersedia               | `badges.test.tsx` + `explain.wording.test.ts` (larangan "terjamin")                                                |
| 12  | Wizard → hasil → banding → cetak pada 375 px & 1440 px                                           | `tests/e2e/flow.spec.ts` + axe                                                                                     |
| 13  | README lengkap                                                                                   | Semakan checklist dalam PR                                                                                         |
| 14  | Semua 34 PJH ada rekod sumber, pemetaan halaman dan rekod pemprosesan; varian direkonsiliasi     | `tests/unit/catalog/coverage.test.ts` (34 entri, setiap halaman 1–141 dipetakan, identified = imported + excluded) |
| 15  | Katalog penuh + manifest + evidence di production; cadangan merentas semua PJH layak             | Pemeriksaan selepas deploy (Fasa 8) + `tests/integration/catalog/load.test.ts`                                     |
| 16  | Kelulusan disemak per PJH per musim; `unverified` dikecualikan daripada label diluluskan         | `recommend.approval.test.ts`                                                                                       |
| 17  | Halaman tidak boleh dibaca / varian harga belum selesai = blocker; tiada dakwaan liputan lengkap | `coverage.test.ts` (status `blocked` jika ada `unclear`/`unresolved`) + E2E halaman Liputan                        |
| 18  | Ujian meliputi beberapa PJH, struktur harga, konfigurasi hotel/masyair berlainan, tiada padanan  | `tests/unit/engine/cross-pjh.test.ts` (data sebenar ≥ 3 PJH)                                                       |

Senario F (data tidak lengkap): `scenario-f.test.ts`. Naik taraf Unpriced menghasilkan `complete:false` dan `BERSYARAT`. Tarwiyah `not_stated` tidak lulus wajib.

Ujian API integrasi: `/api/assess` dan `/api/compare` dengan PGlite + seed Busyra + fixture TEST. Ujian keselamatan: `/api/admin/*` memulangkan 401 tanpa sesi. Upload bukan PDF ditolak.

---

## 10. CI/CD dan persekitaran

`.github/workflows/ci.yml` (push + pull_request): `pnpm install --frozen-lockfile` → `lint` → `typecheck` → `test` (Vitest, PGlite) → `build` → `e2e` (Playwright terhadap `next start` dengan DB ujian). Tiada akses DB production dalam CI.

| Env              | DB                                | Migration/seed                                                                                                                                                                                |
| ---------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Development      | Postgres setempat atau cabang dev | `pnpm db:migrate && pnpm db:seed` manual                                                                                                                                                      |
| Preview (Vercel) | Cabang DB preview berasingan      | Tidak pernah sentuh production. Seed hanya pada cabang preview                                                                                                                                |
| Production       | DB production                     | `pnpm db:migrate` melalui langkah terkawal (GitHub Action manual `workflow_dispatch` atau arahan operator). Seed idempotent dijalankan sekali. **Tidak** dijalankan pada setiap build/request |

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

### Fasa 1 — Model katalog + ekstraksi semua 34 PJH (5–8 hari) ← kerja paling kritikal

- Skema Zod katalog (`src/lib/catalog/schema.ts`) dan jenis engine (`src/lib/engine/types.ts`).
- Ekstraksi visual setiap julat halaman (§14) ke `data/catalog/1448h/<pjh-id>.json` dengan evidence setiap medan.
- `data/catalog-coverage.json` + skrip rekonsiliasi (`scripts/reconcile-catalog.ts`).
- **Terima:** 34 entri liputan; setiap halaman 1–141 mempunyai rekod semakan; varian dikenal pasti = diimport + dikecualikan bersebab; blocker disenaraikan (DoD 14, 17).

### Fasa 2 — Engine + ujian (2–3 hari)

- `money.ts`, `costing.ts`, `eligibility.ts`, `ranking.ts`, `recommend.ts`, `explain.ts`.
- Ujian pada fixture rujukan Busyra, katalog sebenar beberapa PJH dan fixture sintetik `season_id: "TEST"`.
- **Terima:** DoD 1–4, 6–9, 11, 16, 18 (bahagian engine), senario A–F lulus.

### Fasa 3 — Stor Blob + seed idempotent (1–2 hari)

- `CatalogStore` (Blob + memori), snapshot berversi, penunjuk aktif dengan `ifMatch`, `scripts/seed.ts` idempotent.
- **Terima:** seed dua kali = tiada perubahan; snapshot = JSON katalog; penapisan musim.

### Fasa 4 — API awam (1 hari)

- `/api/assess`, `/api/compare`, `/api/catalog/*`, `/api/coverage`, Zod, ralat BM berstruktur, cache ikut `dataset_version`.
- **Terima:** ujian integrasi API. Respons mengandungi versi data/peraturan/engine dan liputan dataset.

### Fasa 5 — Wizard (2 hari)

- `WizardShell`, 5 langkah, `MoneyInput`, `HardSoftToggle`, glosari, autosave/reset localStorage, validasi on-blur.
- **Terima:** E2E pasangan RM100,000 sampai skrin semakan. Aziziyah berasingan (DoD 3). Axe tiada pelanggaran serius.

### Fasa 6 — Hasil, banding, laporan, Liputan data (2–3 hari)

- Kad hasil, `StatusBadge`, `ScoreExplainer`, `EvidenceLink`, keadaan sifar padanan, banding ≤ 3, laporan cetak, togol "Utamakan kepelbagaian PJH", halaman Liputan data.
- Semakan UI UX Pro Max: `"comparison table mobile" --domain ux`, `"print layout" --domain ux`, checklist pra-penghantaran.
- **Terima:** DoD 5, 8 (UI), 11 (badge), 12. Snapshot cetak A4.

### Fasa 7 — Pentadbir (3 hari)

- Auth.js + `create-admin.ts`, `proxy.ts` (Next 16), RBAC, CRUD musim/PJH/pakej/varian/naik taraf/caj, import JSON/CSV → draf, upload Blob + hash, skrin semakan dua panel, validasi pra-publish, publish/unpublish, sejarah, audit log, ringkasan liputan.
- **Terima:** DoD 10. Admin 401 tanpa sesi. Upload bukan PDF ditolak. `security-review` lulus.

### Fasa 8 — Deployment Vercel (1 hari)

1. Vercel MCP: `list_teams` → `list_projects`. Guna projek sedia ada yang berkaitan, atau cipta `pjh-helper-2027m` dan sambungkan ke repo GitHub.
2. Pasang integrasi Postgres (Neon) dan Blob melalui Marketplace (pelan percuma sedia ada sahaja; sebarang kos memerlukan kelulusan pengguna).
3. Env berasingan Development/Preview/Production. Migration production terkawal, seed sekali, `create-admin`.
4. Preview deployment → sahkan → production.
5. **Pemeriksaan selepas deploy** (seksyen 20 spesifikasi): laman utama + liputan, wizard senario A memberi angka tepat, API berfungsi, admin login + tulis/baca rekod ujian (kemudian dibersihkan) + kekal selepas redeploy, akses PDF ikut aturan storage, cetak/telefon/ralat, logs tanpa rahsia.

### Fasa 9 — Pengerasan dan serahan (½–1 hari)

- `code-review`, `security-review`, `simplify`. Semakan pra-penghantaran UI UX Pro Max (kontras, fokus, 44 px, reduced-motion, 375–1440 px).
- README penuh (setup, tests, env, seed, import, deploy, rollback, **liputan katalog sebenar daripada `data/catalog-coverage.json`**).
- Serahan (spesifikasi §23.5): URL repo, URL production, commit SHA, ID deployment, checks yang lulus, katalog 34 PJH, manifest liputan, senarai unknown/kelulusan/konflik/kekosongan, bukti ujian merentas PJH, jumlah pakej/varian sebenar dan batasan sebenar.

**Anggaran jumlah:** ~19–26 hari kerja pembangun. Fasa 1 bergantung pada kebolehbacaan PDF; medan kabur memerlukan versi resolusi asal.

---

## 12. Risiko dan keputusan yang perlu pengguna buat

| #   | Risiko / soalan                                                    | Cadangan                                                                                                                |
| --- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| 1   | ~~PDF sumber tidak dilampirkan~~ **Selesai:** kompilasi di `docs/` | Transkripsi hlm. 33–44 secara visual (halaman imej). Brosur 12 halaman tidak diperlukan (§0.1)                          |
| 2   | Harga varian bertiga/berempat Busyra                               | Ambil daripada hlm. Busyra dalam kompilasi. Jika tiada, `not_stated` dan senario E memberi "tiada konfigurasi sah"      |
| 3   | Pasukan/projek Vercel                                              | Stor = Vercel Blob (§0.1). Pasukan Vercel disahkan dalam Fasa 8                                                         |
| 4   | Status kelulusan PJH 1448H                                         | Perlu sumber rasmi (senarai PJH diluluskan TH) sebelum label "diluluskan"                                               |
| 5   | Teks glosari (Aziziyah, PMN, Tarwiyah)                             | Gunakan penerangan brosur hlm. 6 + sumber rasmi TH. Minta semakan pengguna                                              |
| 6   | Pemberat skor v1                                                   | Boleh diubah oleh admin dengan versi baharu. Laporan menyimpan versi                                                    |
| 7   | Had masa fungsi/upload Vercel                                      | Semak dokumentasi semasa (seksyen 22) sebelum Fasa 7/8                                                                  |
| 8   | PDF termampat (~103 ppi) mengaburkan teks kecil                    | Muat naik `Pakej_Haji_2027_Semua_34_PJH.pdf` (resolusi asal) atau brosur berasingan untuk menyelesaikan medan `unclear` |
| 9   | Ekstraksi 141 halaman imej memakan masa dan berisiko salah baca    | Ekstraksi berganda: satu pas transkripsi + satu pas semakan bebas terhadap halaman; percanggahan → `conflict`           |
| 10  | Spesifikasi §15 menyebut PostgreSQL; pengguna memilih Vercel Blob  | Kekalkan Blob (§0.1). Boleh bertukar melalui `CatalogStore` tanpa mengubah engine                                       |

---

## 13. Checklist ringkas pelaksana

- [x] Fasa 0 asas + UI UX Pro Max + CI
- [x] Fasa 1 katalog 34 PJH + manifest liputan + rekonsiliasi (33/34 reviewed, 1 blocked: Jad Gold; 517 varian)
- [x] Fasa 2 engine + senario A–F + ujian merentas PJH (dibina lebih awal bersama Fasa 1)
- [x] Fasa 3 stor Blob + seed idempotent (`docs/deployment.md`)
- [ ] Fasa 4 API assess/compare/katalog/liputan
- [ ] Fasa 5 wizard
- [ ] Fasa 6 hasil/banding/laporan cetak/Liputan data
- [ ] Fasa 7 pentadbir + auth + publish/history
- [ ] Fasa 8 Vercel preview → production + pemeriksaan
- [ ] Fasa 9 semakan, README, serahan

---

## 14. Katalog 34 PJH: inventori, ekstraksi dan liputan (spesifikasi §23)

### 14.1 Indeks sumber

Halaman PDF kompilasi (1-indexed), daripada spesifikasi §23.1. Disimpan dalam `data/sources/manifest.json` dan `data/catalog-coverage.json`.

| Bil. | PJH         | Hlm.  | Bil. | PJH                | Hlm.   | Bil. | PJH           | Hlm.    |
| ---- | ----------- | ----- | ---- | ------------------ | ------ | ---- | ------------- | ------- |
| 01   | THTS        | 3–4   | 13   | Gemilang           | 55–57  | 25   | MKM           | 102–106 |
| 02   | Al-Balad    | 5–8   | 14   | Glocal Travel      | 58–61  | 26   | Qashwa Travel | 107     |
| 03   | Alam Shah   | 9–11  | 15   | Harmony Excellence | 62–63  | 27   | Rayhar        | 108–115 |
| 04   | Amani       | 12–15 | 16   | In-Saff            | 64–72  | 28   | Rehlah        | 116–119 |
| 05   | Andalusia   | 16–23 | 17   | Irkaz              | 73–76  | 29   | KUJDT         | 120–123 |
| 06   | Az-Safir    | 24–25 | 18   | Jad                | 77–80  | 30   | Yaskin        | 124–127 |
| 07   | Az-Zuha     | 26–32 | 19   | Jay Ibrahim        | 81–83  | 31   | TITIM         | 128–129 |
| 08   | Busyra      | 33–44 | 20   | Juara              | 84–87  | 32   | Tri-D         | 130–133 |
| 09   | Citra       | 45    | 21   | Kembara Umrah      | 88–90  | 33   | Wira Saujana  | 134–137 |
| 10   | CS Holidays | 46–47 | 22   | KRS                | 91–93  | 34   | Zahafiz       | 138–141 |
| 11   | Eiman       | 48–50 | 23   | Mahabbaten         | 94–95  |      |               |         |
| 12   | Felda       | 51–54 | 24   | MIMM               | 96–101 |      |               |         |

Halaman 1–2 ialah halaman pengenalan kompilasi dan direkodkan sebagai `non_pjh`.

### 14.2 Aliran ekstraksi setiap PJH

1. Render setiap halaman (`pdftoppm`, 110–150 dpi untuk halaman penuh; potongan 300 dpi untuk teks kecil).
2. **Pas transkripsi**: baca semua halaman dalam julat (jadual harga, footnote, terma, itinerary). Senaraikan keluarga pakej, varian (bilik 2–6 dan lain-lain), Muaisim/PMN, naik taraf, caj termasuk/tidak, hotel + jarak + titik ukuran, tarikh menginap, Aziziyah, tempoh, Tarwiyah, kelas pengangkutan, makanan, terma.
3. Tulis `data/catalog/1448h/<pjh-id>.json` mengikut skema Zod. Setiap medan penting ada evidence `{ sourceId, pdfPage, brochurePage?, text, status }`. Medan yang tidak diterbitkan selepas semakan = `not_stated` dengan senarai halaman yang telah diperiksa.
4. **Pas semakan bebas**: agen/penyemak kedua membandingkan JSON dengan halaman. Percanggahan → `conflict`. Teks kabur → `unclear` (harga = `null`).
5. Harga promosi berulang (muka depan/belakang) dipadankan dengan varian sedia ada, bukan pakej baharu.
6. Kod varian tidak diterbitkan → ID dalaman stabil `<pjh>-<pakej>-<bilik>` dengan `codeIsInternal: true`.
7. Kelulusan: `approval_status = unverified` untuk semua sehingga sumber rasmi TH bagi 1448H disemak. Nombor lesen pada brosur direkod sebagai `licenceNumberAsPublished` sahaja.

Pelaksanaan: kelompok PJH diproses secara selari oleh subagen (transkripsi), diikuti subagen semakan. Hasil disatukan dan disahkan dengan skema + skrip rekonsiliasi sebelum commit.

### 14.3 Skema `data/catalog-coverage.json`

```jsonc
{
  "seasonId": "1448H",
  "datasetVersion": "ds-1448h-0001",
  "generatedAt": "2026-10-03",
  "sources": ["compilation-34pjh-1448h"],
  "pagesTotal": 141,
  "nonPjhPages": [1, 2],
  "pjhs": [
    {
      "index": 8,
      "id": "busyra",
      "label": "Busyra",
      "legalName": "Busyra Holidays Sdn Bhd",
      "seasonId": "1448H",
      "sourceIds": ["compilation-34pjh-1448h"],
      "pageRange": [33, 44],
      "pagesExpected": 12,
      "pagesReviewed": [33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44],
      "packageFamiliesIdentified": 11,
      "variantsIdentified": 41,
      "variantsImported": 0,
      "variantsPublished": 0,
      "excludedVariants": [],
      "processingStatus": "in_progress", // not_started | in_progress | reviewed | blocked
      "approvalStatus": "unverified", // berasingan daripada status ekstraksi
      "factsVerified": 0,
      "fieldsNotPublished": 0,
      "unreadablePages": [],
      "unresolvedVariants": [],
      "gaps": ["…"],
      "reviewedAt": null,
      "reviewer": null,
    },
  ],
}
```

### 14.4 Rekonsiliasi automatik (`scripts/reconcile-catalog.ts`, dijalankan dalam CI)

- 34 entri PJH; setiap label ada fail katalog atau isu identiti yang ditanda.
- Setiap halaman 1–141 dipetakan kepada tepat satu PJH atau `nonPjhPages`; semua halaman dalam julat ada dalam `pagesReviewed` sebelum status `reviewed`.
- `variantsIdentified = variantsImported + excludedVariants.length`.
- Setiap varian dipublish ada evidence harga dan konfigurasi bilik.
- Varian tanpa harga dipaparkan "Harga perlu pengesahan", bukan RM0.
- Kunci unik `season + pjh + package + code + room configuration`; pendua → gagal.
- Status `blocked` jika ada `unreadablePages`, `unresolvedVariants` atau evidence `unclear` pada harga.

### 14.5 Blocker semasa (selepas semakan bebas; butiran: `docs/sources/catalog-independent-check.md`)

| PJH    | Isu                                                                                                   | Tindakan                                     |
| ------ | ----------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Jad    | Caj penerbangan Business Class Gold "RM1?,000–RM17,000" kabur (blocking)                              | Pengesahan PJH atau PDF resolusi asal        |
| Busyra | Harga naik taraf buffet Standard (Safwah Ekonomi, hlm. 35) kabur: RM5,500 atau RM6,500 (non-blocking) | Perlu versi resolusi asal atau brosur Busyra |
| Semua  | Kelulusan 1448H belum disemak daripada sumber rasmi                                                   | Perlu senarai PJH diluluskan TH 1448H        |
