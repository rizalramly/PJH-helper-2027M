# Stor data, seed dan rollback

Keputusan pengguna (pelan §0.1): **Vercel Blob** ialah stor persisten. Tiada pangkalan data SQL.

## Susun atur Blob (akses `private`)

| Laluan                                       | Kandungan                                               | Penulisan                               |
| -------------------------------------------- | ------------------------------------------------------- | --------------------------------------- |
| `catalog/<musim>/datasets/<versi>.json`      | Snapshot katalog penuh (34 fail PJH + manifest liputan) | Sekali sahaja (`allowOverwrite: false`) |
| `catalog/<musim>/active.json`                | Penunjuk versi aktif                                    | Bersyarat (`ifMatch` ETag)              |
| `audit/<yyyy-mm>/<masa>-<uuid>.json`         | Satu peristiwa (terbit, aktif, draf, sumber, log masuk) | Sekali sahaja                           |
| `catalog/seasons.json`                       | Musim tambahan yang dicipta pentadbir                   | Bersyarat (`ifMatch`)                   |
| `drafts/<musim>/<pjh>.json`                  | Draf suntingan satu PJH                                 | Bersyarat (`ifMatch`)                   |
| `admin/users.json`                           | Pengguna pentadbir (hash scrypt)                        | Bersyarat (`ifMatch`)                   |
| `sources/<sha256>.pdf`, `sources/index.json` | PDF sumber dan indeksnya                                | PDF sekali sahaja; indeks bersyarat     |

- Versi dataset berasaskan kandungan: `ds-<musim>-<sha256[0..12]>` daripada JSON berkanun fail katalog dan manifest liputan. Menerbitkan kandungan yang sama → `unchanged` (seed idempotent, tiada pendua).
- Penerbitan: tulis snapshot dahulu, kemudian kemas kini penunjuk dengan ETag yang dibaca. Jika penerbit lain mendahului → `ConflictError`; ulang operasi selepas membaca keadaan terkini.
- Kod: `src/lib/storage/` (`kv.ts`, `blob-kv.ts`, `catalog-repo.ts`). Aplikasi membaca katalog melalui `getActiveCatalog()` (`src/lib/catalog/active.ts`), yang mencache penunjuk 30 saat dan snapshot ikut versi.

## Persekitaran

| Persekitaran Vercel | Blob store                                                               | Seed                                                                                                                                                  |
| ------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Development         | Store pembangunan sendiri, atau tiada token (aplikasi membaca fail repo) | `pnpm db:seed --yes` dengan token store pembangunan                                                                                                   |
| Preview             | Store preview berasingan                                                 | Hanya ke store preview                                                                                                                                |
| Production          | Store production                                                         | Operator menjalankan `pnpm db:seed --yes` dengan token production **sekali** selepas katalog repo berubah; tidak dijalankan semasa build atau request |

`BLOB_READ_WRITE_TOKEN` hanya di server. Production tanpa token gagal dengan mesej jelas (katalog tidak dibaca daripada filesystem fungsi).

## Arahan

```bash
pnpm db:seed --dry-run          # sahkan katalog + manifest, terbit ke stor memori, semak idempotensi
pnpm db:seed --yes              # terbit ke Blob (BLOB_READ_WRITE_TOKEN), papar ID store sasaran
pnpm catalog:status             # versi aktif, bilangan PJH dan varian
pnpm catalog:history            # semua versi + log audit
pnpm exec tsx scripts/catalog-store.ts activate <versi> --yes   # rollback ke versi lama
```

`db:seed` menolak penerbitan jika mana-mana fail katalog tidak sah atau `data/catalog-coverage.json` tidak selaras (`pnpm catalog:coverage`).

## Rollback

- **Data**: `activate <versi-lama> --yes`. Snapshot lama tidak pernah dipadam, jadi rollback hanya menukar penunjuk dan direkod dalam audit.
- **Kod**: promote deployment Vercel sebelumnya atau `git revert`. Rollback kod tidak mengubah versi data aktif; semak `pnpm catalog:status` selepas rollback.
- **Skema**: snapshot menyimpan `schemaVersion`. Perubahan skema yang tidak serasi mesti menambah versi dan transformasi semasa memuat, supaya snapshot lama kekal boleh dibaca untuk rollback.

## Panel pentadbir

Selepas seed pertama bagi setiap persekitaran:

1. Tetapkan `AUTH_SECRET` (berbeza bagi Preview dan Production).
2. `pnpm admin:create --email <emel> --role admin` dengan token Blob persekitaran itu.
3. Log masuk di `/admin`, muat naik PDF kompilasi melalui _Dokumen sumber_ (untuk skrin semakan).

Perincian aliran kerja dan keselamatan: `docs/admin.md`.

## Penggunaan Vercel (Fasa 8) — langkah operator

Connector Vercel dalam sesi pembangunan tidak mempunyai kebenaran mencipta projek dalam team `apai`, jadi langkah 1–4 dibuat oleh pemilik akaun di papan pemuka Vercel. Projek `retirement-calculator` dalam team yang sama tidak disentuh.

1. **Projek**: _Add New → Project → Import_ `rizalramly/PJH-helper-2027M` (team `apai`). Framework **Next.js**, Root Directory `/`, arahan lalai (pnpm dikesan daripada `packageManager`). Cabang production = cabang lalai repo (`claude/blissful-cray-nvzz0y`). Disyorkan: _Settings → Functions → Region_ **sin1 (Singapura)**.
2. **Blob store berasingan** (_Storage → Create → Blob_, akses **Private**, rantau sin1):
   - `pjh-helper-production` → _Connect Project_, persekitaran **Production** sahaja.
   - `pjh-helper-preview` → persekitaran **Preview** (dan Development jika perlu).
     Ini mencipta `BLOB_READ_WRITE_TOKEN` bagi setiap persekitaran. Preview tidak boleh menyentuh data production.
3. **Environment Variables** (_Settings → Environment Variables_):
   - `AUTH_SECRET`: nilai rawak ≥ 32 aksara (`openssl rand -base64 32`), **berbeza** bagi Production dan Preview.
   - `ADMIN_SETUP_TOKEN`: nilai rawak ≥ 32 aksara (Production; Preview jika mahu menguji). Simpan nilai ini; ia diperlukan sekali di langkah 5.
   - Jangan guna awalan `NEXT_PUBLIC_` untuk mana-mana nilai ini.
4. **Deploy**: _Deployments → Redeploy_ (atau push baharu) supaya pemboleh ubah di atas digunakan. Status mesti **Ready**.
5. **Persediaan pertama** (pelayar): buka `https://<domain-production>/admin/persediaan`. Bahagian _Status konfigurasi_ menunjukkan sama ada stor Blob, `AUTH_SECRET` dan `ADMIN_SETUP_TOKEN` telah dikesan (ya/tidak sahaja); betulkan dan _Redeploy_ jika ada yang belum. Kemudian masukkan `ADMIN_SETUP_TOKEN`, emel dan kata laluan (≥ 12 aksara). Hanya berjaya jika belum ada pengguna.
6. Log masuk di `/admin` → _Ringkasan_ → **Terbitkan katalog awal daripada repo** (sekali; setara `pnpm db:seed`). Sebelum langkah ini, halaman awam memaparkan katalog asas yang dibundel bersama deployment (data sama), dan `/liputan` menandakannya "belum diterbitkan melalui panel pentadbir". Selepas terbit, katalog dibaca daripada Blob dan suntingan panel berkuat kuasa.
7. _Dokumen sumber_ → muat naik `docs/Pakej_Haji_2027_Semua_34_PJH_Bawah_29MB.pdf` (untuk skrin semakan; SHA-256 `e900b9c5…`).
8. Padam `ADMIN_SETUP_TOKEN` (titik akhir persediaan tidak lagi berfungsi selepas pentadbir pertama wujud, tetapi buang juga) dan redeploy.
9. Disyorkan: _Firewall → Rate limiting_ pada `POST /api/admin/session` (cth. 10 permintaan / minit / IP).

### Pemeriksaan selepas penggunaan

- [ ] `/` memaparkan musim 1448H dan liputan "33 daripada 34 PJH disemak".
- [ ] Wizard pasangan RM100,000 → `/hasil` memaparkan cadangan; Busyra MTSP02 (Aziziyah ber-2) RM 86,490.00 seorang.
- [ ] `/banding` dan `/laporan` (cetak) berfungsi pada telefon dan desktop.
- [ ] `/liputan` memaparkan jurang menghalang Jad.
- [ ] `/admin` tanpa sesi → ubah hala log masuk; `/api/admin/drafts` → 401.
- [ ] Ujian tulis/baca: buka draf PJH, ubah nota/harga ujian, buang draf; log audit merekodkannya. Data kekal selepas redeploy.
- [ ] `/api/admin/sources/<sha>` tanpa sesi → 401.
- [ ] Log runtime tiada ralat 5xx berulang atau rahsia.

Rollback kod: _Deployments → … → Promote to Production_ pada deployment terdahulu. Rollback data: _Terbit & sejarah → Aktifkan semula_ (bebas daripada rollback kod).
