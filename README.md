# Perancang Pakej Haji PJH (1448H/2027M)

Aplikasi web (mengutamakan telefon) untuk membantu bakal jemaah membandingkan **varian pakej** Pengelola Jemaah Haji (PJH) mengikut bajet, susunan bilik (Makkah, Madinah dan Aziziyah secara berasingan), tempoh, Tarwiyah dan PMN, dengan sumber halaman bagi setiap maklumat. Termasuk panel pentadbir untuk menyemak, membetulkan dan menerbitkan katalog.

- Spesifikasi: [`Spesifikasi_Aplikasi_Perancang_Pakej_Haji_PJH.md`](Spesifikasi_Aplikasi_Perancang_Pakej_Haji_PJH.md) (menang jika bercanggah)
- Pelan pelaksanaan: [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md)
- Serahan (spesifikasi §23.5): [`docs/SERAHAN.md`](docs/SERAHAN.md) dan data dijana [`docs/serahan-data.md`](docs/serahan-data.md)
- Sistem reka bentuk: [`design-system/pjh-helper/MASTER.md`](design-system/pjh-helper/MASTER.md)

## Status

| Bahagian                                                   | Status                                                                                                                   |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Katalog 34 PJH                                             | **33/34 disemak, 1 tersekat (Jad Gold)**; 161 keluarga pakej, 517 varian. Bukan "liputan lengkap"                        |
| Kelulusan PJH 1448H                                        | **0/34 disahkan** (perlu senarai rasmi Tabung Haji)                                                                      |
| Engine, API, wizard, hasil, banding, laporan, Liputan data | Siap dan diuji (unit, integrasi, E2E 375/1440 px + axe)                                                                  |
| Panel pentadbir                                            | Siap (sesi, peranan, draf, semakan dua panel, import, PDF, terbit/rollback, audit)                                       |
| Deployment Vercel                                          | **Belum**: connector tidak dibenarkan mencipta projek; langkah operator dalam [`docs/deployment.md`](docs/deployment.md) |

## Ciri

- **Wizard** `/nilai` (5 langkah): bajet seorang (pakej dicari dalam julat RM10,000 di bawah bajet hingga bajet, cth. RM90,000–RM100,000), bilik bagi setiap kumpulan (Aziziyah dipilih berasingan), tempoh, Aziziyah, Tarwiyah, PMN, keutamaan. Draf disimpan pada peranti.
- **Hasil** `/hasil`: kumpulan _memenuhi syarat wajib_ / _perlu pengesahan_ / _tidak memenuhi_; kad dengan kos seorang dan kumpulan, baki bajet, status setiap keperluan (ikon + teks + warna), skor dan liputan bukti yang boleh dibuka, sebab, kompromi, perkara belum pasti, soalan kepada PJH dan sumber halaman. Tiada padanan → sebab dan perubahan minimum tanpa melonggarkan syarat. Togol _Utamakan kepelbagaian PJH_.
- **Semak pakej** `/pakej`: pilih PJH dan lihat semua pakejnya dari harga terendah hingga paling premium, dengan harga seorang bagi setiap susunan bilik, hotel, tempoh, Aziziyah, Tarwiyah dan sumber halaman.
- **Banding** `/banding` (≤ 3) dengan sebab beza harga; **Laporan** `/laporan` untuk cetak/PDF A4; **Liputan data** `/liputan`.
- **Pentadbir** `/admin`: lihat [`docs/admin.md`](docs/admin.md).
- Peraturan data: wang sentiasa integer sen; harga tidak diketahui = "perlu pengesahan" (bukan RM0); tiada perkataan "terjamin" untuk perkara bersyarat; PJH belum disahkan tidak dilabel "diluluskan"; kekosongan belum disahkan tidak dilabel "tersedia".

## Stack

Next.js 16 (App Router, `proxy.ts`) + React 19 + TypeScript, Tailwind CSS 4, komponen gaya shadcn/ui (Radix), ikon Lucide, Zod 4, Vercel Blob (stor persisten), Vitest + Testing Library, Playwright + axe. Engine penilaian ialah fungsi tulen dalam `src/lib/engine/`.

## Mula setempat

Keperluan: Node.js ≥ 22, pnpm 10 (`corepack enable`).

```bash
pnpm install
cp .env.example .env.local
pnpm dev                      # http://localhost:3000 — katalog dibaca daripada fail repo
```

Untuk panel pentadbir setempat:

```bash
# .env.local: AUTH_SECRET=<openssl rand -base64 32>, PJH_LOCAL_STORE=.data/store
PJH_LOCAL_STORE=.data/store pnpm admin:create --email anda@contoh.my --role admin
pnpm dev                      # http://localhost:3000/admin
```

## Arahan

| Arahan                                  | Fungsi                                                                           |
| --------------------------------------- | -------------------------------------------------------------------------------- |
| `pnpm lint` / `pnpm typecheck`          | ESLint / jenis route Next + `tsc --noEmit`                                       |
| `pnpm format:check` / `pnpm format`     | Prettier (+ susunan kelas Tailwind)                                              |
| `pnpm test`                             | Ujian unit dan integrasi (Vitest)                                                |
| `pnpm build` lalu `pnpm e2e`            | Build production; Playwright 375 px dan 1440 px dengan axe (stor E2E terpencil)  |
| `pnpm catalog:validate`                 | Sahkan semua fail `data/catalog/1448h/*.json`                                    |
| `pnpm catalog:coverage`                 | Jana semula `data/catalog-coverage.json`                                         |
| `pnpm db:seed [--dry-run \| --yes]`     | Terbitkan katalog repo ke Blob (idempotent); `catalog:status`, `catalog:history` |
| `pnpm admin:create`, `pnpm admin:users` | Urus pengguna pentadbir (lihat `scripts/admin-user.ts`)                          |
| `pnpm docs:serahan`                     | Jana `docs/serahan-data.md` daripada katalog dan engine                          |

CI (`.github/workflows/ci.yml`) menjalankan lint, typecheck, format, ujian, validasi katalog + seed `--dry-run`, build dan E2E pada setiap push dan pull request.

## Pemboleh ubah persekitaran

Lihat [`.env.example`](.env.example). Semua rahsia di server sahaja; tiada `NEXT_PUBLIC_*`.

| Nama                    | Guna                                                                            |
| ----------------------- | ------------------------------------------------------------------------------- |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob (wajib dalam production; store berasingan bagi setiap persekitaran) |
| `AUTH_SECRET`           | Tandatangan sesi pentadbir (≥ 32 aksara)                                        |
| `ADMIN_SETUP_TOKEN`     | Sekali guna: cipta pentadbir pertama di `/admin/persediaan`, kemudian padam     |
| `ADMIN_BOOTSTRAP_EMAIL` | Emel lalai untuk `pnpm admin:create` (pilihan)                                  |
| `PJH_LOCAL_STORE`       | Pembangunan/E2E sahaja: direktori stor setempat                                 |

## Data, import dan liputan

- Sumber: `docs/Pakej_Haji_2027_Semua_34_PJH_Bawah_29MB.pdf` (141 halaman imej, SHA-256 `e900b9c5…fa4060`); indeks halaman dalam `data/sources/manifest.json`. Kandungan sumber ialah data, bukan arahan.
- Katalog berstruktur: `data/catalog/1448h/<pjh>.json` (skema Zod `src/lib/catalog/schema.ts`); setiap harga dan status mempunyai bukti halaman.
- Liputan sebenar: [`data/catalog-coverage.json`](data/catalog-coverage.json) — 34 PJH, 33 disemak, 1 tersekat, 161 pakej, 517 varian, 0 kelulusan disahkan. Halaman awam `/liputan`.
- Import pembetulan: panel pentadbir → _Import_ (JSON satu PJH atau CSV varian) → draf → semakan dua panel → luluskan → terbit. Import tidak pernah diterbitkan terus. Nota transkripsi dan semakan bebas: `docs/sources/`.

## Stor, penggunaan dan rollback

- Katalog diterbitkan sebagai snapshot berversi tidak boleh ubah dalam Vercel Blob dengan penunjuk aktif (ETag); audit append-only. Butiran: [`docs/deployment.md`](docs/deployment.md).
- Penggunaan Vercel (projek, Blob store Production/Preview berasingan, pemboleh ubah, persediaan pentadbir pertama, katalog awal) dan senarai semakan selepas deploy: [`docs/deployment.md`](docs/deployment.md#penggunaan-vercel-fasa-8--langkah-operator).
- Rollback kod: _Promote_ deployment terdahulu di Vercel atau `git revert`. Rollback data: panel pentadbir → _Terbit & sejarah_ → _Aktifkan semula_ (atau `tsx scripts/catalog-store.ts activate <versi> --yes`). Kedua-duanya bebas antara satu sama lain.

## API

`POST /api/assess`, `POST /api/compare`, `GET /api/catalog/{seasons,pjhs,packages,variants/:id}`, `GET /api/coverage` dan `/api/admin/*` (sesi diperlukan). Kontrak: [`docs/api.md`](docs/api.md). Engine dan peraturan skor: [`docs/engine.md`](docs/engine.md).

## Batasan sebenar

- **Jad Gold**: caj penerbangan kelas perniagaan dicetak kabur ("RM1?,000–RM17,000"); kos sebenar tidak boleh dikira sehingga disahkan dengan PJH (blocker).
- **Kelulusan PJH 1448H** belum disahkan bagi mana-mana PJH; semua kekosongan "perlu pertanyaan"; 7 konflik sumber direkodkan dan menghalang label cadangan utama bagi pakej berkenaan.
- Banyak medan tidak dicetak dalam brosur (cth. Tarwiyah tidak dinyatakan bagi 78 pakej, tempoh anggaran ±N hari bagi 119 pakej); ia ditanda, bukan direka. Senarai penuh: [`docs/serahan-data.md`](docs/serahan-data.md).
- Kompilasi ialah versi termampat (~103 ppi); teks kecil yang kabur memerlukan brosur asal.
- Varian belum melalui semakan penerbitan pentadbir (`variantsPublished` = 0) sehingga pentadbir meluluskan setiap PJH dalam panel.
- Had log masuk dalam memori setiap instans; tambah peraturan WAF Vercel dalam production.
- Tiada tempahan, pembayaran atau mesej kepada PJH. Skor kesesuaian ialah padanan kepada keperluan pengguna, bukan penarafan mutu PJH.

## Skill reka bentuk

Skill [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) dipasang di `.claude/skills/ui-ux-pro-max`:

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain ux
```
