# Semakan bebas katalog 34 PJH (1448H/2027M)

Pas kedua oleh 8 subagen penyemak (penyemak-1 hingga penyemak-8). Setiap penyemak menyemak fail yang ditranskripsi oleh agen lain, membaca imej halaman sendiri (zum 200–400 dpi untuk teks kecil), membetulkan fail secara terus dan menandakan evidence yang disahkan sebagai `verified`. Pas pertama: `docs/sources/catalog-first-pass-notes.md`.

## Hasil

- **33/34 PJH `reviewed`**, **1 `blocked`** (Jad), **0 kelulusan disahkan** (tiada sumber rasmi TH 1448H).
- **161 keluarga pakej, 517 varian**, semuanya berharga (naik daripada 502 kerana pemecahan bilik "4/5", peraturan R2).
- **Tiada pembetulan harga atau kod varian** ditemui oleh mana-mana penyemak. Pembetulan tertumpu pada status (PMN, Tarwiyah, Aziziyah), susunan bilik Aziziyah per varian dan pemecahan bilik berjulat.
- Empat varian rujukan Busyra (MTSP02, SFSP02, MJPP02, MJP02) dan naik taraf Aziziyah RM8,500/RM7,500 disahkan betul.

| Bil. | PJH                | Hlm.    | Pakej | Varian | Status   | Gap blocking | Gap lain |
| ---- | ------------------ | ------- | ----: | -----: | -------- | -----------: | -------: |
| 1    | THTS               | 3–4     |     8 |     18 | reviewed |            0 |        6 |
| 2    | Al-Balad           | 5–8     |     3 |     11 | reviewed |            0 |        5 |
| 3    | Alam Shah          | 9–11    |     4 |     16 | reviewed |            0 |        5 |
| 4    | Amani              | 12–15   |     6 |     22 | reviewed |            0 |        6 |
| 5    | Andalusia          | 16–23   |     4 |     16 | reviewed |            0 |        5 |
| 6    | Az-Safir           | 24–25   |     2 |      7 | reviewed |            0 |        7 |
| 7    | Az-Zuha            | 26–32   |     4 |     14 | reviewed |            0 |        6 |
| 8    | Busyra             | 33–44   |    11 |     41 | reviewed |            0 |        4 |
| 9    | Citra              | 45–45   |     3 |     12 | reviewed |            0 |        6 |
| 10   | CS Holidays        | 46–47   |     2 |      5 | reviewed |            0 |        6 |
| 11   | Eiman              | 48–50   |     7 |     15 | reviewed |            0 |       10 |
| 12   | Felda              | 51–54   |     4 |     13 | reviewed |            0 |        8 |
| 13   | Gemilang           | 55–57   |     3 |     11 | reviewed |            0 |        7 |
| 14   | Glocal Travel      | 58–61   |     4 |     12 | reviewed |            0 |        7 |
| 15   | Harmony Excellence | 62–63   |     4 |     12 | reviewed |            0 |        4 |
| 16   | In-Saff            | 64–72   |    13 |     24 | reviewed |            0 |        8 |
| 17   | Irkaz              | 73–76   |     2 |      6 | reviewed |            0 |        8 |
| 18   | Jad                | 77–80   |     7 |     23 | blocked  |            1 |        6 |
| 19   | Jay Ibrahim        | 81–83   |     6 |     13 | reviewed |            0 |       13 |
| 20   | Juara              | 84–87   |     4 |     14 | reviewed |            0 |        9 |
| 21   | Kembara Umrah      | 88–90   |     4 |     16 | reviewed |            0 |        7 |
| 22   | KRS                | 91–93   |     3 |      8 | reviewed |            0 |        9 |
| 23   | Mahabbaten         | 94–95   |     2 |      8 | reviewed |            0 |        7 |
| 24   | MIMM               | 96–101  |     6 |     16 | reviewed |            0 |        9 |
| 25   | MKM                | 102–106 |     6 |     19 | reviewed |            0 |        9 |
| 26   | Qashwa Travel      | 107–107 |     4 |     16 | reviewed |            0 |        9 |
| 27   | Rayhar             | 108–115 |     7 |     36 | reviewed |            0 |       10 |
| 28   | Rehlah             | 116–119 |     2 |      7 | reviewed |            0 |        6 |
| 29   | KUJDT              | 120–123 |     3 |     10 | reviewed |            0 |        8 |
| 30   | Yaskin             | 124–127 |     8 |     18 | reviewed |            0 |        7 |
| 31   | TITIM              | 128–129 |     6 |     24 | reviewed |            0 |        7 |
| 32   | Tri-D              | 130–133 |     4 |     12 | reviewed |            0 |       10 |
| 33   | Wira Saujana       | 134–137 |     1 |      4 | reviewed |            0 |        8 |
| 34   | Zahafiz            | 138–141 |     4 |     18 | reviewed |            0 |        9 |

## Peraturan konsistensi yang digunakan

| Kod | Peraturan                                                                                                                                                                   |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | Hotel berhampiran Mina sebelum/semasa Masyair (Aziziyah, Syisyah, "hotel Mina", hotel transit) = penginapan Aziziyah; label asal disimpan dalam `aziziyah.labelAsPublished` |
| R2  | Satu harga untuk julat bilik ("4/5 orang") = dua varian dengan kod dan harga sama                                                                                           |
| R3  | Susunan bilik Aziziyah per varian → `variants[].aziziyahOccupancy`                                                                                                          |
| R4  | `pmnStatus: not_included` hanya jika khemah asas (Muaisim/Muassasah) dinamakan; PMN kabur → `not_stated`                                                                    |
| R5  | Tarwiyah `offered` hanya tanpa sebarang syarat dicetak; ada syarat → `offered_subject_to_approval`; hanya ilustrasi → `not_stated`                                          |
| R6  | Aziziyah `explicitly_not_included` hanya dengan kenyataan jelas; tiada hotel disenaraikan → `not_stated`                                                                    |
| R7  | Asas kadar tidak dicetak → `per_person` + gap                                                                                                                               |
| R8  | Harga kabur → `null` (varian: gap blocking)                                                                                                                                 |
| R9  | Salah cetak musim disalin seperti dicetak + gap                                                                                                                             |

## Blocker yang tinggal

| PJH | Isu                                                                                                                                     | Perlu                                 |
| --- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Jad | Caj penerbangan Business Class pakej Gold "RM1?,000–RM17,000" di atas harga pakej; digit kedua kabur (13 atau 15) dan amaun ialah julat | Pengesahan PJH atau PDF resolusi asal |

## Keputusan pemilik produk (3 Okt 2026)

- **D1 "Dataran masjid" = perkarangan.** Jarak hotel Makkah/Madinah yang dicetak "dari/ke dataran Masjidil Haram / Masjid Nabawi" direkod sebagai `haram_courtyard` / `nabawi_courtyard` (133 penginapan dalam 16 PJH). Teks asal kekal dalam `distanceReferenceAsPublished`. Rujukan "pagar", "pintu", "ke Masjid…" tanpa titik ukuran dan rujukan bercampur (cth. Al-Balad Madinah "dataran … pagar") kekal `other`; "Dataran Mina" bukan masjid dan kekal `other`.
- **D2 "Khemah Muassasah" = Muaisim**, kerana khemah Muassasah terletak di Muaisim. `masyair.type = muaisim` bagi Gemilang (MKM dan Amani sudah begitu); `pmnStatus` varian asas kekal `not_included`.

## Perkara lain untuk perhatian

1. **Tafsiran yang belum dicetak secara eksplisit** (ditanda gap, perlu pengesahan PJH):
   - Rayhar OLA 34/23/24: corak harga menunjukkan digit kedua = kapasiti bilik Makkah.
   - In-Saff dan Rayhar Jumeirah: susunan Aziziyah diterbitkan daripada nota "mengikut pendaftaran/tempahan".
   - Glocal Travel Premium/Private: PMN termasuk berdasarkan ikon.
   - Busyra VIP: Tarwiyah bersyarat berdasarkan kenyataan umum PJH.
2. **`brochurePage` Busyra** = halaman PDF − 32. Nombor ini tidak dicetak pada halaman, tetapi sepadan dengan rujukan halaman brosur dalam spesifikasi §12.
3. **Kelulusan PJH**: semua `unverified`. Label "PJH diluluskan" tidak akan dipaparkan sehingga senarai rasmi TH 1448H disemak.

## Laporan setiap penyemak

### penyemak-7: rehlah, kujdt, yaskin, titim

- rehlah: 7→7. Sultan RIS 2/3/4 pmnStatus not_included→not_stated (khemah asas tidak dinamakan). PMN/Business hanya hlm. Sultan (gap kekal).
- kujdt: 10→10. aziziyahOccupancy per varian (HMT-6/4=4, -3=3, -2=2); labelAsPublished "Hotel Syisyah (Aziziyah)"; pmnStatus→not_stated. HMT-6 RM54,900 disahkan; konflik muka depan RM54,990 kekal.
- yaskin: 18→18. Tarwiyah 5 pakej offered→not_stated (hanya grafik itinerari hlm. 127, label "7 Zulhijjah"). labelAsPublished "Hotel Syisyah"; aziziyahOccupancy=2 untuk MB01/MR01/AW01/AWB01/SY01/AA01. Kotak bayaran kini dibaca.
- titim: 18→24 (6 varian "Bilik Ber 4/5" dipecah 4 & 5). Gap salah cetak "20 Syawal 1447H". "50%" bayaran masih kabur.

### penyemak-4: in-saff, irkaz, jad

- in-saff: 24→24. pmnStatus Tier 2–4 →not_stated. aziziyahOccupancy B2(AZ)=2; AJ/CT lain = bilik didaftar (tafsiran nota "mengikut pendaftaran … kecuali bilik berdua AZ"). Tarwiyah kekal offered (Istimewa, tiada syarat).
- irkaz: 6→6, tiada pembetulan data. Lesen "PJH/1448H" vs "PJH 17/1448H"; jarak GM null; Tarwiyah not_stated (terus ke Arafah 9 Zulhijjah).
- jad: 23→23. aziziyahOccupancy JAD 22=3, JAD 23=2. BLOCKING kekal: caj business Gold "RM1?,000–RM17,000" (13 atau 15) di atas harga pakej.

### penyemak-2: az-safir, az-zuha, citra, cs-holidays, eiman

- Tiada pembetulan harga. az-safir 7→7 (tiada pembetulan). az-zuha 14→14: pmnStatus→not_stated; aziziyahOccupancy = bilik varian ("mengikut pilihan pakej"). citra 12→12: labelAsPublished "Shisha"; Standard Eko explicitly_not_included disahkan ("TANPA TRANSIT"). cs-holidays 5→5: hotel Mina Syisyah → stay aziziyah + included (R1); naik taraf berdua RM1,500 → aziziyah_room; Standard pmn→not_stated. eiman 15→15: ETMT04 aziziyahOccupancy=5; Business Class conflict kekal.
- Soalan: "dataran Masjid" direkod `other` (bukan perkarangan) — perlu keputusan seragam.

### penyemak-5: jay-ibrahim, juara, kembara-umrah, krs, mahabbaten

- Tiada pembetulan harga/kod. juara: pmnStatus Al-Salam/Al-Furqan →not_stated; labelAsPublished "Hotel Masyaeir (PTM)". kembara-umrah: pmnStatus →not_stated; nota bilik berdua diberi bilik 3/4 di Aziziyah (T&S 9). mahabbaten: Nuzul Al Rayyan dipindah mina→aziziyah (R1), defaultOccupancies [5], labelAsPublished "MINA — Hotel Nuzul Al Rayyan". jay-ibrahim: PMN "(RM10,000)" kekal not_stated; lesen "1?/1448H".

### penyemak-3: felda, gemilang, glocal-travel, harmony-excellence

- Tiada pembetulan harga. felda: Fiddi Plus aziziyahOccupancy 4/3/2; Tarwiyah Fiddi/Fiddi Plus not_stated (gap). gemilang: pmnStatus →not_included ("KHEMAH MUASSASAH"); privateBathroom=true ("BILIK AIR DI DALAM"). glocal-travel: Elaf/ECO pmn →not_stated; PMN Premium/Private kekal included (unclear, gap). harmony-excellence: tiada pembetulan.

### penyemak-6: mimm, mkm, qashwa-travel, rayhar

- Tiada pembetulan harga/kod asal. mimm: pmnStatus 4 pakej standard →not_stated; Najm Aziziyah optional→included (syarat "(Pilihan)"); inklusi Najm ditambah. mkm: masyair.type →muaisim ("Khemah Muassasah @setaraf"). qashwa: Rahmah/Safwah pmn →not_stated. rayhar 31→36 (R2 "4/5 Madinah"); pmnStatus →not_stated; aziziyahOccupancy G-33/G-22 dan JUM AZ (terbitan nota "disusun sama"). Kod OLA 34/23/24 vs 33/22: corak harga menyokong digit kedua = kapasiti bilik Makkah, tetapi TIDAK dicetak → gap, perlu sah PJH.
- Ketidakseragaman kecil: MKM masyair.type=muaisim daripada "Muassasah", Gemilang masyair.type=not_stated tetapi pmnStatus not_included.

### penyemak-8: tri-d, wira-saujana, zahafiz, busyra

- Tiada pembetulan harga. tri-d: aziziyahOccupancy=4 untuk TRID 05/06/08/09/11/12; hotel Aziziyah Al-Wataniyah ±850 m dibaca ("1447H" salah cetak, gap). wira-saujana: tiada perubahan (Aziziyah 4–5 ialah susunan umum, bukan julat harga). zahafiz: label "(Katil 3)/(Katil 4)" kini dibaca; maksud perlu sah PJH.
- busyra: 4 varian rujukan + naik taraf RM8,500/RM7,500 disahkan betul. VIP Tarwiyah not_stated→offered_subject_to_approval (kenyataan umum PJH bersyarat hlm. 38/44 + ilustrasi hlm. 41 menyebut VIP). Buffet Safwah Ekonomi masih kabur.
- Isu: brochurePage Busyra (PDF−32) tidak dicetak pada halaman; dikekalkan kerana sepadan dengan rujukan halaman brosur dalam spesifikasi (hlm. 6, 10).

### penyemak-1: thts, al-balad, alam-shah, amani, andalusia

- Tiada pembetulan harga/kod. thts: Aziziyah explicitly_not_included disahkan (R6 "check in dan check out sekali sahaja"). al-balad: pmn not_included disahkan; Aziziyah defaultOccupancies [5,6]. alam-shah 14→16 (MEA04/MK04 4/5 dipecah). amani: aziziyahOccupancy per varian (ASK/ASKN=5; ASDA42/ASDA4N2=4; lain = bilik Makkah/Madinah); titik ukuran "dataran masjid"/"pintu masjid" → other, "dataran Jamarat" → jamarat. andalusia 14→16 (AND4/AND8 Madinah 4/5 dipecah); konflik "tidak menginap di Aziziyah/Syisya" vs transit Al Riyadh → unresolvedConflicts.
