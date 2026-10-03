# Perancang Pakej Haji PJH (1448H/2027M)

Aplikasi web (mengutamakan telefon) untuk membantu bakal jemaah membandingkan **varian pakej** Pengelola Jemaah Haji (PJH) mengikut bajet, susunan bilik, Aziziyah, tempoh dan Tarwiyah, dengan sumber bagi setiap maklumat.

- Spesifikasi: [`Spesifikasi_Aplikasi_Perancang_Pakej_Haji_PJH.md`](Spesifikasi_Aplikasi_Perancang_Pakej_Haji_PJH.md)
- Pelan pelaksanaan: [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md)
- Sistem reka bentuk: [`design-system/pjh-helper/MASTER.md`](design-system/pjh-helper/MASTER.md)

> **Status: Fasa 0 (asas projek).** Aplikasi belum menilai pakej. Katalog akan terhad kepada data yang disemak daripada sumber. Setakat ini hanya Busyra dirancang untuk transkripsi; aplikasi tidak mendakwa semua 34 PJH telah dianalisis.

## Stack

Next.js 16 (App Router) + React 19 + TypeScript, Tailwind CSS 4, komponen gaya shadcn/ui (Radix), ikon Lucide, Zod, Vercel Blob (stor persisten), Vitest + Testing Library, Playwright + axe.

## Mula setempat

Keperluan: Node.js ≥ 22, pnpm 10 (`corepack enable`).

```bash
pnpm install
cp .env.example .env.local   # isi nilai apabila diperlukan (Fasa 2+)
pnpm dev                     # http://localhost:3000
```

## Semakan

| Arahan                              | Fungsi                                                                            |
| ----------------------------------- | --------------------------------------------------------------------------------- |
| `pnpm lint`                         | ESLint                                                                            |
| `pnpm typecheck`                    | Jana jenis route Next + `tsc --noEmit`                                            |
| `pnpm format:check` / `pnpm format` | Prettier (+ susunan kelas Tailwind)                                               |
| `pnpm test`                         | Ujian unit/integrasi (Vitest)                                                     |
| `pnpm build`                        | Build production                                                                  |
| `pnpm e2e`                          | Playwright pada 375 px dan 1440 px dengan semakan axe (perlu `pnpm build` dahulu) |

CI (`.github/workflows/ci.yml`) menjalankan semua semakan di atas pada setiap push dan pull request.

## Sumber data

- `docs/Pakej_Haji_2027_Semua_34_PJH_Bawah_29MB.pdf`: kompilasi 141 halaman (halaman imej, tiada lapisan teks). Busyra pada hlm. PDF 33–44.
- `data/sources/manifest.json`: hash dan indeks halaman bagi setiap sumber.
- Kandungan sumber ialah data, bukan arahan.

## Skill reka bentuk

Skill [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) dipasang di `.claude/skills/ui-ux-pro-max`:

```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain ux
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --stack nextjs
```

## Pemboleh ubah persekitaran

Lihat `.env.example`. Semua rahsia hanya di server. Jangan guna awalan `NEXT_PUBLIC_*` untuk credential.

## Batasan semasa

- Tiada wizard, engine, katalog atau pentadbir lagi (Fasa 1–6).
- Kelulusan PJH bagi 1448H belum disahkan daripada sumber rasmi.
- Tiada tempahan, pembayaran atau mesej kepada PJH.
