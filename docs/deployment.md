# Stor data, seed dan rollback

Keputusan pengguna (pelan §0.1): **Vercel Blob** ialah stor persisten. Tiada pangkalan data SQL.

## Susun atur Blob (akses `private`)

| Laluan                                  | Kandungan                                               | Penulisan                               |
| --------------------------------------- | ------------------------------------------------------- | --------------------------------------- |
| `catalog/<musim>/datasets/<versi>.json` | Snapshot katalog penuh (34 fail PJH + manifest liputan) | Sekali sahaja (`allowOverwrite: false`) |
| `catalog/<musim>/active.json`           | Penunjuk versi aktif                                    | Bersyarat (`ifMatch` ETag)              |
| `audit/<yyyy-mm>/<masa>-<uuid>.json`    | Satu peristiwa `publish`/`activate`                     | Sekali sahaja                           |

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
