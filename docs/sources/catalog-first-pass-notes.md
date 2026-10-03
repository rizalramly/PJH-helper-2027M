# Nota transkripsi pas pertama: 34 PJH (1448H/2027M)

Transkripsi visual oleh 8 subagen selari (agen-A hingga agen-H) daripada `docs/Pakej_Haji_2027_Semua_34_PJH_Bawah_29MB.pdf`, mengikut arahan dalam spesifikasi §23. Setiap fail `data/catalog/1448h/<pjh-id>.json` lulus `pnpm catalog:validate`. **Semakan bebas belum dibuat**, jadi tiada PJH berstatus `reviewed`.

Ringkasan (daripada `data/catalog-coverage.json`): 34/34 PJH mempunyai fail katalog, 161 keluarga pakej, 502 varian diimport, 1 PJH `blocked` (Jad), 0 kelulusan disahkan.

## Keputusan pemodelan biasa

- Bayaran Haji PJH RM23,398 → caj `included: true`. Caj tambahan TH → caj `conditional`, tiada harga.
- Harga "bermula dari"/promosi berulang → `excludedItems` (`countsAsVariant: false`).
- Naik taraf berjulat atau "minimum/bermula" → `priceSen: null` jika julat, atau harga minimum dengan nota.
- Jarak tanpa titik ukuran → `distanceReference: not_stated`. "Dataran/ke Masjid" → `other`.
- Tarwiyah disenaraikan sebagai inklusi tanpa syarat → `offered`; dengan syarat → `offered_subject_to_approval`.
- Nombor lesen pada brosur direkod sebagai `licenceNumberAsPublished` sahaja; bukan bukti kelulusan.

## Perkara untuk semakan bebas (ikut keutamaan)

### Blocking

- **Jad Gold**: caj penerbangan Business Class "RM1?,000–RM17,000" kabur; tidak jelas sama ada di atas harga pakej.

### Keputusan tafsiran yang mempengaruhi penapisan

- **Amani**: susunan bilik Aziziyah berbeza mengikut kod varian (cth. ASDA42 ber-2 Makkah/Madinah, ber-4 Aziziyah). Skema perlu medan `aziziyahOccupancy` per varian; kini hanya dalam nota.
- **THTS**: Aziziyah `explicitly_not_included` ditafsir daripada "check in dan check out sekali sahaja".
- **Citra Standard Eko**: Aziziyah `explicitly_not_included` daripada label "TANPA TRANSIT".
- **CS Holidays / Mahabbaten**: hotel Syisyah 1–15 Zulhijjah dicetak sebagai "hotel Mina"; CS Holidays direkod `aziziyah: not_stated`, Mahabbaten `included`. Perlu keputusan konsisten.
- **Yaskin**: Tarwiyah `offered` bagi pakej Muassim disimpulkan daripada "Ringkasan Perjalanan (Tarwiyah)".
- **Jay Ibrahim** (Balqis, Kesuma, Cindai): "PMN disediakan (RM10,000)" tidak jelas termasuk → `not_stated`.
- **Glocal Travel**: PMN Premium/Private ditafsir termasuk daripada ikon kabur.
- **Felda Brunzi**: info wukuf "bermalam di Arafah pada 8 Zulhijjah" → Tarwiyah `not_stated`.

### Susunan bilik yang dianggarkan

- Kembara Umrah ber-5: bilik Madinah direkod 4 (T&S 8: Madinah hanya 4/3/2).
- Rayhar "4/5 Madinah": direkod 4. Kod OLA 34/23/24 vs 33/22 belum jelas bezanya.
- TITIM "Bilik Ber 4/5": satu varian occupancy 5.
- Alam Shah MEA04/MK04 "Berempat/Berlima": direkod 4. Andalusia AND4/AND8 Madinah ber-4/5: direkod 5.
- CS Holidays CSS03 "4–5 orang": dipecah kepada dua varian (kod dan harga sama).
- Zahafiz ZTC23/24, ZTB23/24 "Bilik Ber-2 (Katil 3/4)": teks kabur.

### Konflik dan teks kabur

- KUJDT: muka depan "dari RM54,990" vs jadual HMT-6 RM54,900.
- Eiman: Business Class RM17,990 vs RM17,900.
- Tri-D Eksklusif: PMN termasuk tetapi kotak "Naiktaraf ke PMN RM8,500" turut dicetak.
- Gemilang Elite Express: Business Class tanpa jaminan tempat duduk.
- Busyra: naik taraf buffet Safwah Ekonomi RM5,500/RM6,500.
- Kod kabur dibaca ikut corak: MIMM MTx02/03, Qashwa, Az-Safir.
- Nombor lesen kabur/tidak lengkap: Zahafiz, Az-Safir, Jay Ibrahim, Irkaz, Jad; THTS tiada.
- Salah cetak musim "1447H/2026M" pada nota bayaran haji: Qashwa, Eiman. Felda "14487H". Tri-D tarikh Aziziyah "1447H".

### Asas kadar tidak dicetak (direkod `per_person`)

Wira Saujana (RM6,000), KUJDT (PMN RM12,000), Glocal Travel (add-on), Jay Ibrahim (Aziziyah RM8,000/RM4,000), Az-Zuha (RM8,900/RM11,900), KRS (+RM20,000).

## Laporan penuh setiap agen

### agen-H: tri-d, wira-saujana, zahafiz

- tri-d: 4 pakej/12 varian. Eksklusif: PMN termasuk tetapi kotak "Naiktaraf ke PMN RM8,500" dicetak (unresolvedConflicts). Tarikh Aziziyah dicetak "1447H". Hotel Aziziyah Eksklusif tidak dicetak. Kelas tren ditafsir daripada grafik HRR. Tarwiyah offered (inklusi tanpa syarat).
- wira-saujana: 1 pakej/4 varian. WIRA 1 Makkah 5 / Madinah 4. Tarwiyah bersyarat. Aziziyah Manazil Al-Maqam 4–5 ikut jantina; naik taraf berdua RM6,000 (asas tidak dicetak → per_person + gap). pmn not_stated.
- zahafiz: 4 pakej/18 varian. Lesen "PJH3?/1448H" kabur → null. ZTC23/24, ZTB23/24 "Bilik Ber-2 (Katil 3/4)" kabur. Aziziyah B/A not_stated. Amaun "±" direkod nominal. Pakej A PMN ±RM10,000 included.

### agen-D: in-saff, irkaz, jad

- in-saff: 13 pakej/24 varian (modular: Anjum A/B, Clock Tower A/B, Raffles; Madinah Biltmore vs Grand Millenium). PMN naik taraf RM5,500 (Tier 4/3) / RM4,500 (Tier 2) bergantung kelulusan TH; Raffles termasuk (refund RM4,500 jika tidak lulus). Business class flight julat → null. Tarwiyah offered (Istimewa, tanpa syarat). masyair not_stated.
- irkaz: 2 pakej/6 varian. Aziziyah 4–5 sebilik. Lesen "PJH/1448H" vs "PJH 17/1448H". Selesa: dua hotel Makkah tidak jelas. Jarak GM Madinah ditutup imej → null.
- jad: 7 pakej/23 varian. Gold ±25 hari PMN, lain ±40 Muaisim. BLOCKING: caj business class Gold "RM1?,000–RM17,000" kabur. Teks Info Pakej Gold unclear. Lesen "18/1448".

### agen-C: felda, gemilang, glocal-travel, harmony-excellence

- felda: 4 pakej/13 varian. Nuhasi Aziziyah explicitly_not_included; Brunzi info wukuf "bermalam di Arafah pada 8 Zulhijjah" → tarwiyah not_stated + gap. Jarak tanpa titik ukuran. Terma "14487H" (salah cetak).
- gemilang: 3 pakej/11 varian. Tarwiyah tambahan berbayar atas permintaan (bersyarat) + caj conditional null. Masyair "Khemah Muassasah" → not_stated. Elite Express business class "tiada jaminan tempat duduk" → unresolvedConflicts. Sajian SAR 580/hari → null.
- glocal-travel: 4 pakej/12 varian. Imej 120 ppi: kapsyen ikon hlm. 59 unclear; PMN Premium/Private ditafsir termasuk (perlu sah). Add-on asas tidak dicetak → per_person + gap. Aziziyah Premium/Private bercanggah dengan terma 4/5 sebilik → unresolvedConflicts.
- harmony-excellence: 4 pakej/12 varian. Teks jelas.

### agen-G: rehlah, kujdt, yaskin, titim

- rehlah: 2 pakej/7 varian. PMN RM10,000 & Business Class (min RM10,000) hanya pada hlm. Sultan; Ajwa pmn not_stated. Tempoh 40–45 hari.
- kujdt: 3 pakej/10 varian. Konflik: muka depan "dari RM54,990" vs jadual HMT-6 RM54,900 (unresolvedConflicts). HMT-6 Makkah 6/Madinah 4. Tarwiyah bersyarat TH. Aziziyah 4–14 Zulhijjah 10 malam. PMN RM12,000 asas tidak dicetak. HCTP penerbangan pergi carter / pulang komersial.
- yaskin: 8 pakej/18 varian. Syisyah (Aziziyah) dahulu, Makkah selepas 15 Zulhijjah. PMN/Business seat termasuk sebagai charges included. Naik taraf "Dari RM…" = harga minimum. Tarwiyah offered untuk Muassim disimpulkan daripada "Ringkasan Perjalanan (Tarwiyah)" — PERLU SEMAKAN. Aaliah trainClass/relocations not_stated.
- titim: 6 pakej/18 varian. "Bilik Ber 4/5" = satu varian occupancy 5 (perlu semakan: boleh pilih 4?). PMN RM12,000 termasuk. Aziziyah hanya Makkah Tower Aziziyah (Nuzl Rayan ±900m).

### agen-F: mimm, mkm, qashwa-travel, rayhar

- mimm: 6 pakej/16 varian. Kod MTx02/03 kabur (dibaca ikut corak; harga jelas). PMN naik taraf RM12,000. Tarwiyah offered (banner, tiada syarat). Najm Aziziyah "(Pilihan)" tanpa harga → optional. Bilik bertiga Thur/Najm "on request" → excluded.
- mkm: 6 pakej/19 varian. Salam Aziziyah not_stated. "Muassasah" tidak dipetakan ke Muaisim. Sakinah/Safa ±20 hari PMN termasuk. PMN RM10,000 & Aziziyah berdua RM7,000 naik taraf.
- qashwa-travel: 4 pakej/16 varian. Kod kabur dibaca ikut corak. Jarak Aziziyah 590 m & teks khemah unclear. Footnote "1447H/2026M RM23,398" (salah cetak?). PMN RM9,880.
- rayhar: 7 pakej/31 varian. "4/5 Madinah orang sebilik" → 4 + nota/gap. Kod OLA 34/23/24 vs 33/22 tidak jelas bezanya — PERLU SEMAKAN. Aziziyah pilihan RM9,900/6,600/5,000/4,000 (2/3/4/5). Business class Platinum julat → null.

### agen-A: thts, al-balad, alam-shah, amani, andalusia

- thts: 8 pakej/18 varian. Tiada lesen. Aziziyah explicitly_not_included ditafsir daripada "check in dan check out sekali sahaja" — PERLU SEMAKAN. PMN termasuk kecuali Delima. Jarak Raffles kabur (±80/±60). Business Class ±RM14,500.
- al-balad: 3 pakej/11 varian. pmn not_included daripada "khemah asal di Mina Muassim". Bilangan sebilik melalui ikon. Tarikh Aziziyah daripada lakaran umum.
- alam-shah: 4 pakej/14 varian. MEA04/MK04 "Berempat/Berlima" → 4. Mekah Klasik Aziziyah not_stated, caj bas RM2,500. Aziziyah "350 m" vs ±540 m.
- amani: 6 pakej/22 varian. Label titik ukuran jarak tidak boleh dibaca. **Bilik Aziziyah per kod berbeza daripada Makkah/Madinah (cth. ASDA42 ber-2 Makkah/Madinah, ber-4 Aziziyah) — skema perlu medan aziziyahOccupancy per varian.**
- andalusia: 4 pakej/14 varian. Amjad & Elaf transit Apartment Al Riyadh 10–13 Zulhijjah (Aziziyah included) walaupun muka depan kata tidak. AND4/AND8 Madinah ber-4/5 → 5. Dua hotel Madinah digabung.

### agen-E: jay-ibrahim, juara, kembara-umrah, krs, mahabbaten

- jay-ibrahim: 6 pakej/13 varian. Balqis/Kesuma/Cindai "PMN disediakan (RM10,000)" tidak jelas termasuk → not_stated + gap. Lesen "19/1448H" (mungkin 10). Naik taraf Aziziyah RM8,000/RM4,000 asas tidak dicetak. Tarwiyah bersyarat; teks "ke Arafah pada 7 Zulhijjah" (salah cetak?).
- juara: 4 pakej/14 varian. JTT01/05 Makkah 5/Madinah 4. Al-Salam Aziziyah optional (PTM dari RM7,500 → null). Jarak bercanggah (kelebihan vs kad).
- kembara-umrah: 4 pakej/16 varian. Bilik ber-5 Madinah → 4 (inferens daripada T&S 8). Tarwiyah offered. Tempoh ±40 vs 40–45.
- krs: 3 pakej/8 varian. PMN/Muaisim tidak disebut. Tarwiyah offered (keistimewaan umum). Tukar carter ke komersial +RM20,000.
- mahabbaten: 2 pakej/8 varian. Aziziyah (Nuzul Al Rayyan, 1–15 Zulhijjah, 5 sebilik) dicetak bawah tajuk "MINA" → included + stay mina — PERLU SEMAKAN.

### agen-B: az-safir, az-zuha, citra, cs-holidays, eiman

- az-safir: 2 pakej/7 varian. Kod "Safir 0X" kecil. Lesen "06/1448H" kabur. Safir Z PMN termasuk, Aziziyah Al Maqam (bilik 4/5 sahaja), 25–30 hari.
- az-zuha: 4 pakej/14 varian. Aziziyah Dar AlHamd/Dar AlSalah 600 m ~15 hari. PMN naik taraf RM8,900; business RM11,900 (asas tidak dicetak).
- citra: 3 pakej/12 varian. Standard Eko explicitly_not_included daripada "TANPA TRANSIT" — PERLU SEMAKAN. Naik taraf bilik berdua SAR 5,000 → null.
- cs-holidays: 2 pakej/5 varian. Hotel 01–15 Zulhijjah "hotel Mina" di Syisyah → stay mina + aziziyah not_stated — PERLU KEPUTUSAN. CSS03 "4-5 sebilik" dipecah dua varian (kod sama).
- eiman: 7 pakej/15 varian. Business class bercanggah RM17,990 vs RM17,900 → null + conflict. Nota bayaran haji "1447H/2026M".
