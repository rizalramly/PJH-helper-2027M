# Panel pentadbir (`/admin`)

Panel untuk menyemak, membetulkan dan menerbitkan katalog PJH. Pengguna awam tidak memerlukan akaun.

## Peranan

| Tindakan                                                   | Penyemak (`reviewer`) | Pentadbir (`admin`) |
| ---------------------------------------------------------- | :-------------------: | :-----------------: |
| Lihat ringkasan, draf, sumber, audit                       |           ✓           |          ✓          |
| Buka/sunting/buang draf, import JSON/CSV, muat naik PDF    |           ✓           |          ✓          |
| Hantar dan **luluskan semakan** draf                       |           ✓           |          ✓          |
| Tukar **status kelulusan PJH** (memerlukan sumber rasmi)   |                       |          ✓          |
| **Terbit** draf, **aktifkan semula** versi lama (rollback) |                       |          ✓          |
| Tambah/kemas kini musim                                    |                       |          ✓          |

## Aliran kerja

1. **PJH & draf** → _Buka draf_: salinan fail PJH daripada versi aktif. Katalog awam tidak berubah.
2. **Skrin semakan dua panel**: kiri = halaman PDF sumber (julat halaman PJH, nota transkripsi); kanan = borang pakej/varian, naik taraf/caj, kelulusan PJH dan editor JSON lanjutan (stays, bukti, jurang).
   - Harga baharu atau berubah **mesti** disertakan halaman PDF dan petikan seperti dicetak. Harga kosong = "perlu pengesahan" (bukan RM0).
   - Perubahan Tarwiyah, Aziziyah atau tempoh memerlukan bukti halaman.
   - Setiap suntingan membatalkan semakan yang telah diluluskan.
   - Validasi pra-terbit (skema, rujukan kod, bukti dalam julat halaman, musim) dan senarai perubahan berbanding katalog aktif dipaparkan sentiasa.
3. **Luluskan semakan** (hanya jika validasi lulus). Nota semakan disimpan dalam fail (`review`).
4. **Terbit & sejarah** → pilih draf yang diluluskan → _Terbitkan_ (pentadbir). Ini mencipta snapshot baharu, mengemas kini penunjuk aktif dan manifest liputan, dan membuang draf. Kandungan yang sama tidak menghasilkan versi baharu.
5. **Rollback**: _Aktifkan semula_ mana-mana versi dalam sejarah. Tiada snapshot dipadam.

Draf berasaskan versi aktif ketika ia dibuka. Jika fail PJH yang sama telah berubah dalam katalog aktif sejak itu, penerbitan ditolak dan draf mesti dibuka semula. Suntingan serentak dilindungi ETag (ralat 409: muat semula halaman).

## Import

- **JSON**: satu fail PJH penuh dengan skema `data/catalog/1448h/<pjh>.json`. Masuk sebagai draf; tidak diterbitkan terus.
- **CSV varian**: lajur wajib `package_id, code, makkah, madinah, price_rm, pmn, pdf_page, evidence_text`; pilihan `aziziyah, category, room_label, notes`. Baris dengan kod + bilik + kategori yang sama mengemas kini varian sedia ada. Ralat dilaporkan ikut nombor baris dan tiada perubahan dibuat jika ada ralat.

## Dokumen sumber

- PDF sahaja (tandatangan `%PDF-` dan `%%EOF`), ≤ 50 MB. PDF dengan JavaScript, fail terbenam atau tindakan pelancaran ditolak.
- Disimpan `private` di `sources/<sha256>.pdf`; dokumen yang sama tidak disimpan dua kali. Nama fail dibersihkan.
- Production: muat naik klien Vercel Blob (token daripada `/api/admin/sources/upload`, laluan sementara `uploads/`), kemudian `/register` mengesahkan bait, mengira SHA-256 dan membuang fail sementara. Pembangunan: muat naik terus (multipart).
- Skrin semakan memaparkan kompilasi utama (`sha256 e900b9c5…`). Dalam production, muat naik PDF itu sekali melalui _Dokumen sumber_.

## Keselamatan

- Kata laluan: scrypt (N=2^17, r=8, p=1), tiada kata laluan lalai atau plaintext. Minimum 12 aksara.
- Sesi: kuki `__Host-pjh_admin` (HttpOnly, Secure, SameSite=Strict, 8 jam) bertandatangan HMAC-SHA256 dengan `AUTH_SECRET` (≥ 32 aksara). Setiap permintaan menyemak semula pengguna, peranan, status dilumpuhkan dan `sessionVersion` (lumpuhkan/tukar kata laluan membatalkan semua sesi).
- `src/proxy.ts` menghalang `/admin/*` dan `/api/admin/*` tanpa token sah (401 / ubah hala). Setiap Route Handler dan halaman turut mengesahkan sesi sepenuhnya.
- CSRF: kuki SameSite=Strict + semakan `Origin`/`Sec-Fetch-Site` bagi permintaan yang mengubah data.
- Had log masuk: 5 cubaan / 15 minit bagi setiap IP dan emel, ditempah **sebelum** kata laluan disemak (letusan serentak tidak melepasi had), maksimum 4 semakan scrypt serentak setiap instans, mesej ralat generik dan masa respons disamakan bagi emel yang tidak wujud. Had ini dalam memori setiap instans; untuk production, tambah peraturan had kadar Vercel WAF pada `/api/admin/session`.
- Log keluar menaikkan `sessionVersion`, jadi token yang dicuri tidak boleh digunakan lagi (semua sesi pengguna itu ditamatkan).
- Laluan stor disahkan secara berpusat (`src/lib/storage/paths.ts`): segmen `..`/`.`/kosong dan aksara `? # % \` ditolak dalam semua pelaksanaan stor; parameter musim dan PJH dalam URL disahkan sebelum digunakan.
- Badan permintaan dibaca dengan had bait (termasuk badan chunked). Fail muat naik klien terikat pada laluan `uploads/<pengguna>/`; pengguna lain tidak boleh mendaftar atau membuangnya.
- PDF disajikan kepada pentadbir sahaja dengan `nosniff`, `Content-Security-Policy: default-src 'none'; frame-ancestors 'self'` dan `X-Frame-Options: SAMEORIGIN`. Penapis kandungan aktif PDF ialah usaha terbaik (bukan jaminan); PDF tidak pernah dilaksanakan oleh pelayan.
- Semua tindakan direkod dalam log audit (append-only), termasuk log masuk gagal.

> Keputusan pelaksanaan: pelan asal menyebut Auth.js (Credentials). Untuk panel kecil dengan stor Blob, modul sesi dan scrypt yang ringkas dalam `src/lib/auth/` dipilih supaya tiada kebergantungan beta atau modul natif, setiap guard boleh diuji terus, dan semakan CSRF/peranan jelas dalam kod. Peralihan ke Auth.js kemudian hanya menyentuh `src/lib/auth/`.

## Pengguna

```bash
# Stor: BLOB_READ_WRITE_TOKEN (Vercel Blob) atau PJH_LOCAL_STORE (pembangunan)
pnpm admin:create --email nama@contoh.my --role admin      # kata laluan diminta (tidak dipaparkan)
pnpm admin:create --email penyemak@contoh.my --role reviewer
pnpm admin:users                                            # senarai (tanpa hash)
pnpm exec tsx scripts/admin-user.ts disable --email nama@contoh.my --yes
pnpm exec tsx scripts/admin-user.ts reset-password --email nama@contoh.my
```

## Pembangunan setempat

```bash
cp .env.example .env.local     # isi AUTH_SECRET (openssl rand -base64 32) dan PJH_LOCAL_STORE=.data/store
PJH_LOCAL_STORE=.data/store pnpm admin:create --email anda@contoh.my
pnpm dev                        # http://localhost:3000/admin
```

Tanpa versi aktif dalam stor setempat, katalog awam dan draf berasaskan fail repo sehingga penerbitan pertama. E2E menggunakan stor terpencil `.data/e2e-store` yang dicipta semula setiap kali (`tests/e2e/global-setup.ts`).
