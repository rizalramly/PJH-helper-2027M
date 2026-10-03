# API

Semua respons JSON. Wang = `{ "sen": "8649000", "text": "RM 86,490.00" }`; `null` = harga belum diketahui (bukan RM0). Setiap respons katalog/penilaian membawa `datasetVersion` (juga pengepala `x-dataset-version`). Ralat:

```json
{
  "error": {
    "code": "validation_failed",
    "message": "Keperluan tidak lengkap atau tidak sah.",
    "details": [{ "field": "requirements.budget.perPersonRM", "message": "Nilai RM tidak sah …" }]
  }
}
```

| Kod                   | HTTP      | Bila                                                  |
| --------------------- | --------- | ----------------------------------------------------- |
| `bad_request`         | 400 / 413 | JSON rosak atau badan > 32 KB                         |
| `validation_failed`   | 422       | Medan tidak sah, komposisi bilik tidak sah, > 3 calon |
| `not_found`           | 404       | Musim/PJH/varian/calon tidak wujud                    |
| `catalog_unavailable` | 503       | Katalog aktif tidak dapat dibaca (Blob)               |
| `internal_error`      | 500       | Ralat lain (butiran hanya dalam log server)           |

## `POST /api/assess`

```jsonc
{
  "requirements": {
    "seasonId": "1448H",
    "rooms": [{ "pilgrims": 2, "makkah": 2, "madinah": 2, "aziziyah": 2 }], // aziziyah: null = ikut susunan asal
    "budget": { "perPersonRM": "100000", "scope": "package_only", "hard": true }, // all_in → extrasPerPersonRM wajib
    "aziziyah": { "mode": "required", "acceptConditional": true }, // required | preferred | not_wanted | any
    "duration": { "target": 40, "tolerance": 0, "acceptApproximate": true, "hard": true }, // atau min/max
    "tarwiyah": { "mode": "required", "acceptConditional": true }, // required | preferred | any | want_not_offered
    "pmn": "required", // required | preferred | any
    "privateRoom": "any",
    "proximity": { "maxMakkahM": 300, "maxMadinahM": null },
    "comfortFeatures": ["private_bathroom"],
    "importance": { "relocations": "dont_care", "savings": "important" },
  },
  "options": { "diversifyPjh": false, "requireVerifiedApproval": false, "notMatchingLimit": 10 },
}
```

Respons utama:

- `counts`, `groups`: ID calon ikut kumpulan (`full_match`, `needs_verification`, `not_matching`).
- `recommendations`: label (`CADANGAN_UTAMA`, `ALTERNATIF_JIMAT`, `ALTERNATIF_KESELESAAN`, `CALON_BERSYARAT`) dan naratif.
- `noMatch`: mesej, sebab dan calon terdekat dengan perubahan minimum (tambahan bajet seorang atau satu syarat).
- `candidates`: pakej, varian per bilik, pecahan kos, status setiap keperluan dengan bukti, skor, liputan bukti, sebab, kompromi, perkara belum pasti, soalan kepada PJH dan sumber halaman.
- `rejected` (pakej tanpa harga untuk susunan bilik), `archived` (habis/ditarik balik), `coverageSummary` (`totals`, `generatedAt`, dan `pjhs[id]` = label, status pemprosesan, status kelulusan, tarikh semakan).

Semua calon `full_match` dan `needs_verification` dipulangkan; `not_matching` dihadkan oleh `notMatchingLimit` (jumlah sebenar dalam `counts`). Respons senario A ≈ 0.5 MB.

## `POST /api/compare`

`{ "requirements": { … }, "candidateIds": ["<id1>", "<id2>", "<id3>"] }`: 2–3 ID daripada `/api/assess` dengan keperluan yang sama. Respons: `rows` (label, nilai setiap calon, `differs`), `priceDifferences` (beza berbanding calon termurah ikut harga varian / naik taraf / caj) dan `candidates`.

## Katalog dan liputan

| Endpoint                                 | Kandungan                                                                                                               |
| ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `GET /api/catalog/seasons`               | Musim disokong                                                                                                          |
| `GET /api/catalog/pjhs?season=`          | Semua PJH (termasuk belum disahkan): status kelulusan, lesen seperti dicetak, bilangan pakej/varian, status pemprosesan |
| `GET /api/catalog/packages?season=&pjh=` | Pakej dengan varian                                                                                                     |
| `GET /api/catalog/variants/:id?season=`  | Varian, pakej, naik taraf, caj, terma PJH dan bukti halaman                                                             |
| `GET /api/coverage?season=`              | Manifest liputan dalam snapshot aktif                                                                                   |

GET katalog dicache di CDN selama 60 saat; `POST` tidak dicache. Katalog dibaca melalui `getActiveCatalog()` (Vercel Blob dalam production; fail repo dalam pembangunan tanpa token).
