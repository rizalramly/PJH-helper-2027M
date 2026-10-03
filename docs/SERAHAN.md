# Serahan projek Perancang Pakej Haji PJH (1448H/2027M)

Tarikh: 3 Oktober 2026. Repo: <https://github.com/rizalramly/PJH-helper-2027M>, cabang `claude/blissful-cray-nvzz0y` (cabang lalai). Commit serahan: commit terkini cabang ini (`git log -1`).

## 1. Ringkasan jujur

- Aplikasi lengkap dari segi kod: katalog, engine, API, wizard, hasil, banding, laporan cetak, Liputan data dan panel pentadbir, dengan ujian unit, integrasi dan E2E.
- Katalog: **33 daripada 34 PJH disemak; 1 tersekat (Jad)**. Ini **bukan** katalog lengkap.
- **0 kelulusan PJH** disahkan; **tiada kekosongan** disahkan.
- **Belum dideploy ke Vercel.** Connector Vercel sesi ini ditolak (403) apabila mencipta projek dalam team `apai`, dan rangkaian sesi menyekat `*.vercel.app`. Langkah operator yang lengkap ada dalam [`deployment.md`](deployment.md#penggunaan-vercel-fasa-8--langkah-operator). Tiada URL production atau ID deployment lagi.

## 2. Serahan wajib (spesifikasi §23.5)

| #   | Serahan                                                        | Lokasi                                                                                                     |
| --- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1   | Katalog berstruktur 34 PJH (JSON boleh diaudit, bukti halaman) | `data/catalog/1448h/*.json` (skema `src/lib/catalog/schema.ts`; `pnpm catalog:validate`)                   |
| 2   | Manifest liputan dan rekonsiliasi                              | `data/catalog-coverage.json` (`pnpm catalog:coverage`), `data/sources/manifest.json`, nota `docs/sources/` |
| 3   | Senarai unknown, kelulusan belum disahkan, konflik, kekosongan | [`serahan-data.md`](serahan-data.md) §3–§6                                                                 |
| 4   | Bukti penilaian merentas PJH dan cadangan berbeza ikut input   | [`serahan-data.md`](serahan-data.md) §7 (6 senario, dijana daripada engine) + ujian di bawah               |
| 5   | Jumlah pakej/varian sebenar (34 PJH ≠ 34 pakej)                | [`serahan-data.md`](serahan-data.md) §1: 161 keluarga pakej, 517 varian                                    |

Blocker khusus: **Jad Gold**, caj penerbangan kelas perniagaan dicetak "RM1?,000–RM17,000" (digit kabur pada kompilasi termampat). Perlu brosur asal atau pengesahan PJH.

## 3. Definition of Done (spesifikasi §17) → bukti

| DoD | Perkara                                                | Bukti                                                                                                                       |
| --: | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
|   1 | Empat jumlah Busyra tepat; tiada caj PMN/TH berganda   | `tests/unit/engine/scenarios.test.ts` (Senario A)                                                                           |
|   2 | Jumlah pasangan dan baki bajet senario A               | `scenarios.test.ts`, `tests/integration/api/api.test.ts`                                                                    |
|   3 | Aziziyah tidak ikut bilik Makkah                       | `scenarios.test.ts` (DoD 3), `synthetic.test.ts`, E2E `wizard.spec.ts`                                                      |
|   4 | Ketidakpadanan PMN/Tarwiyah/Aziziyah/tempoh            | `scenarios.test.ts` (Senario B–D), `cross-pjh.test.ts`                                                                      |
|   5 | Status konsisten di kad, banding, laporan              | `tests/unit/results/card.test.tsx`, E2E `results.spec.ts`                                                                   |
|   6 | Asas harga per bilik/kumpulan/malam                    | `synthetic.test.ts` (DoD 6)                                                                                                 |
|   7 | Komposisi 3/5 orang; tiada harga tanpa konfigurasi sah | `scenarios.test.ts` (Senario E)                                                                                             |
|   8 | Sifar padanan: penjelasan tanpa melonggarkan syarat    | `synthetic.test.ts` (DoD 8), E2E `results.spec.ts`                                                                          |
|   9 | Ranking deterministik, pemberat dinormalkan            | `synthetic.test.ts` (DoD 9), `results/format.test.ts`                                                                       |
|  10 | Terbit brosur baharu: sejarah kekal, tiada pendua      | `tests/integration/storage/catalog-repo.test.ts`, `admin/admin-api.test.ts` (draf → terbit → rollback), E2E `admin.spec.ts` |
|  11 | Tiada badge diluluskan/tersedia tanpa pengesahan       | `synthetic.test.ts` (DoD 11/16), `card.test.tsx`                                                                            |
|  12 | Wizard, hasil, banding, cetak pada telefon dan desktop | E2E 375 px dan 1440 px dengan axe (`wizard`, `results`, `admin`, `home`)                                                    |
|  13 | README                                                 | [`README.md`](../README.md)                                                                                                 |
|  14 | 34 PJH: rekod sumber, pemetaan halaman, rekonsiliasi   | `tests/unit/catalog/coverage.test.ts`, `files.test.ts`                                                                      |
|  15 | Katalog penuh di production                            | **Belum** (deployment tertangguh); katalog awal diterbitkan melalui panel selepas deploy                                    |
|  16 | Kelulusan per PJH per musim                            | `synthetic.test.ts`, panel pentadbir (`set_approval` memerlukan sumber rasmi)                                               |
|  17 | Blocker tidak didakwa lengkap                          | `coverage.test.ts`, E2E `/liputan` ("Liputan belum lengkap")                                                                |
|  18 | Ujian merentas beberapa PJH                            | `tests/unit/engine/cross-pjh.test.ts`, `serahan-data.md` §7                                                                 |

## 4. Semakan yang lulus (commit serahan)

`pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm test` (unit + integrasi), `pnpm build` (tanpa amaran; PDF sumber tidak dijejak ke dalam fungsi), `pnpm e2e` (375 px dan 1440 px, axe WCAG 2.1 AA). Semakan keselamatan bebas panel pentadbir (Fasa 7) dijalankan dan penemuannya dibaiki dengan ujian regresi. Semakan kod bebas Fasa 9 (engine/API dan UI/pentadbir) dijalankan; penemuan yang disahkan dibaiki dengan ujian regresi (`tests/unit/engine/review-fixes.test.ts`, `tests/unit/admin/review-fixes.test.ts`, `tests/integration/api/api.test.ts`): pemilihan varian ikut bilik Aziziyah, ID varian unik (517), naik taraf bersyarat/habis dijual, had bajet input, import CSV tidak memadam medan, ETag editor draf, dan lain-lain. Semakan UI pra-penghantaran: kontras token ≥ 4.5:1 bagi semua gandingan yang digunakan, cincin fokus kelihatan, sasaran sentuh ≥ 44 px, `prefers-reduced-motion`, tiada skrol mendatar 375–1440 px.

## 5. Keputusan yang dibuat dalam pelaksanaan

- Vercel Blob sebagai stor (pengguna); "dataran masjid" = perkarangan; khemah Muassasah = Muaisim (pengguna).
- Pengesahan pentadbir: modul sesi scrypt + HMAC sendiri, bukan Auth.js (sebab dalam [`admin.md`](admin.md)).
- Persediaan production tanpa skrip setempat: `/admin/persediaan` (token sekali guna) dan butang _Terbitkan katalog awal_ kerana sesi pembangunan tidak boleh mencapai Blob production.

## 6. Tindakan seterusnya (pemilik)

1. Ikut langkah 1–9 dalam [`deployment.md`](deployment.md#penggunaan-vercel-fasa-8--langkah-operator) dan senarai semakan selepas deploy.
2. Dapatkan senarai rasmi PJH diluluskan 1448H (Tabung Haji); kemas kini status kelulusan setiap PJH dalam panel.
3. Sahkan caj Jad Gold dengan PJH atau brosur asal; kemas kini melalui draf.
4. Semak dan luluskan setiap PJH dalam panel supaya varian dikira "diterbitkan pentadbir".
5. Muat naik brosur resolusi asal jika tersedia untuk menyemak teks kabur yang direkodkan dalam jurang data.
