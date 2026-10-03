# Engine penilaian (`src/lib/engine/`)

Fungsi TypeScript tulen: tiada I/O, tiada jam sistem, tiada LLM. Input: `Catalog` (daripada `src/lib/catalog/load.ts`), `Requirements`, `ScoringRules`. Output: `AssessmentResult`.

```text
assess()
 ├─ validateRooms()            komposisi bilik; musim; bajet > 0
 ├─ setiap pakej published dalam musim
 │   ├─ sold_out / withdrawn → archived
 │   ├─ costPackage()          varian per bilik, naik taraf Aziziyah, caj → CostBreakdown
 │   │    └─ tiada varian untuk susunan bilik → rejected (tiada harga rekaan)
 │   ├─ evaluateRequirements() status setiap keperluan
 │   ├─ groupOf()              full_match / needs_verification / not_matching
 │   ├─ scoreCandidate()       skor + liputan bukti
 │   └─ explainCandidate()     sebab, kompromi, belum pasti, soalan kepada PJH (BM)
 ├─ susun: kumpulan → skor ↓ → liputan ↓ → kos ↑ → ID
 ├─ label cadangan (utama, jimat, keselesaan, bersyarat)
 └─ noMatch jika tiada full_match
```

## Kos (`costing.ts`)

- Semua wang `bigint` sen. `null` = Unpriced, tidak pernah dianggap sifar.
- Setiap `RoomSpec` dipadankan dengan varian dewasa yang `makkahOccupancy` dan `madinahOccupancy` sama. Jika tiada, pakej ditolak ("Tiada harga diterbitkan untuk bilik …"). Jika lebih daripada satu (cth. kod sama dengan Aziziyah berlainan), pilih yang paling sesuai dengan bilik Aziziyah yang diminta (`included`/`default` dahulu, kemudian naik taraf berharga, tanpa harga, tiada), kemudian harga seorang termurah termasuk naik taraf `per_person`, kemudian kod.
- Bilik Aziziyah dipilih berasingan (`RoomSpec.aziziyah`):
  - `null` → tiada naik taraf (`not_requested`).
  - Dalam `aziziyah.defaultOccupancies` → `default`, tiada caj.
  - Naik taraf `aziziyah_room` dengan `resultingOccupancy` sama dan layak untuk varian → `upgrade` / `upgrade_unpriced` (naik taraf `sold_out`/`withdrawn` diabaikan). Termasuk dalam varian → `included`. Tiada → `not_offered`. Pakej tanpa susunan asal Aziziyah yang dicetak dan tanpa naik taraf → `unknown_default`.
  - Pengguna pilih `not_wanted` → bilik Aziziyah tidak diminta; tiada caj naik taraf ditambah.
- Asas kadar: `per_person` × jemaah dalam bilik; `per_room` × 1 setiap bilik; `per_group` sekali untuk seluruh kumpulan; `per_night` × bilangan malam setiap bilik (bukan × jemaah). `per_night` tanpa `nightCount` → Unpriced.
- Caj `included: true` dipaparkan "sudah termasuk" dengan amaun 0 (cth. Bayaran Haji PJH, caj PMN RM8,000). Caj `conditional` disenaraikan sebagai ketidakpastian, tidak dijumlahkan.
- Bajet `all_in` menambah peruntukan peribadi pengguna sebagai baris berasingan (`extras`) dan membandingkan jumlah itu dengan bajet.

## Status keperluan (`eligibility.ts`)

| Keperluan              | Nota keputusan                                                                                                                                                                                                                                                    |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bajet                  | Julat `[minPerPersonSen, perPersonSen]` seorang (API/wizard: bajet − RM10,000 hingga bajet). Di atas bajet atau di bawah julat → `TIDAK_MEMENUHI`; kos tidak lengkap tetapi dalam julat → `BERSYARAT` + `blocksPrimary`                                           |
| Aziziyah               | Aziziyah bertanda syarat ("bergantung kepada kebenaran…") dirawat seperti Tarwiyah: `acceptConditional` menentukan `BERSYARAT` atau `TIDAK_MEMENUHI`. `not_wanted` + `included` → `TIDAK_MEMENUHI` (tiada andaian boleh dibuang)                                  |
| Susunan bilik Aziziyah | Susunan asal berbilang (cth. 4/5/6 ikut jantina) → `PERLU_PENGESAHAN` kerana diputuskan syarikat; naik taraf tanpa harga atau `unknown_default` → `PERLU_PENGESAHAN`; naik taraf bersyarat → `BERSYARAT` jika pengguna terima syarat, jika tidak `TIDAK_MEMENUHI` |
| Tempoh                 | Anggaran (±N) dalam julat → `BERSYARAT` jika pengguna terima anggaran, jika tidak `PERLU_PENGESAHAN`; nilai di luar julat → `TIDAK_MEMENUHI`                                                                                                                      |
| Tarwiyah               | `not_stated` → `PERLU_PENGESAHAN` (tidak lulus syarat wajib)                                                                                                                                                                                                      |
| Bilik khusus           | Jemaah < kapasiti bilik → `TIDAK_MEMENUHI`; tidak dinyatakan → `PERLU_PENGESAHAN`                                                                                                                                                                                 |

Kumpulan: sebarang keperluan wajib `TIDAK_MEMENUHI` → `not_matching`; sebarang `PERLU_PENGESAHAN` → `needs_verification`; selainnya `full_match`.

## Skor (`ranking.ts`, `rules.ts`)

`skor = 100 × Σ(w × u) / Σ(w_aktif)`; liputan = Σ(w × bahagian diketahui) / Σ(w_aktif). Pemberat v1 mengikut spesifikasi §9; `important` × 2. Dimensi aktif hanya apabila pengguna memberi input yang boleh diukur (penjimatan dan perpindahan sentiasa aktif kecuali "tidak kisah"). Keselesaan hanya menggunakan ciri yang dipilih pengguna dan mempunyai bukti; label "Premium" atau bintang tidak dikira.

## Label cadangan (`recommend.ts`)

- **Cadangan utama**: `full_match` teratas tanpa `blocksPrimary` atau konflik data.
- **Alternatif lebih jimat**: `full_match` termurah yang lebih murah daripada cadangan utama (kos lengkap).
- **Alternatif keselesaan**: `full_match` dengan sumbangan keselesaan/kedekatan/masyair berbukti yang lebih tinggi.
- **Calon bersyarat**: `full_match` yang disekat atau `needs_verification`, sehingga 3 cadangan. Tiada cadangan palsu.
- `diversifyPjh`: satu slot setiap PJH. `requireVerifiedApproval`: kecualikan PJH `unverified` daripada cadangan (kekal dalam senarai calon).
- Sifar padanan: mesej tetap, sebab teragregat dan sehingga 3 calon terdekat dengan perubahan minimum (tambahan bajet seorang atau satu syarat). Syarat pengguna tidak diubah.
