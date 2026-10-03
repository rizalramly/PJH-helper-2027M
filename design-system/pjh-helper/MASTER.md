# PJH Helper: sistem reka bentuk (MASTER)

Sumber: carian skill UI UX Pro Max (`.claude/skills/ui-ux-pro-max`), disaring secara manual untuk alat keputusan kewangan yang mengutamakan telefon dan dibaca dalam Bahasa Melayu. Butiran pilihan: `docs/IMPLEMENTATION_PLAN.md` §7. Token sebenar: `src/app/globals.css`. Fail ini menerangkan sebabnya.

## Arah

- **Gaya:** Minimalism & Swiss Style + Accessible & Ethical. Grid jelas, ruang putih, kontras tinggi, tanpa hiasan.
- **Corak produk:** Insurance Platform / "Conversion-Optimized + Trust". Ketelusan harga dan sumber lebih penting daripada promosi.
- **Dial:** variance 2/10 (tengah/minimal), motion 1/10 (halus), density 6/10 (standard; jadual banding lebih padat).
- **Elak:** foto generik, aliran tempahan, gradien ungu/merah jambu, emoji sebagai ikon, slider sebagai satu-satunya input wang, status yang bergantung pada warna sahaja.

## Warna (mod cerah; nisbah kontras pada latar `--card` #FFFFFF)

| Token                  | Nilai   | Guna                                      | Kontras |
| ---------------------- | ------- | ----------------------------------------- | ------- |
| `--background`         | #F0F9FF | Latar halaman                             | —       |
| `--foreground`         | #0C4A6E | Teks utama                                | 9.4:1   |
| `--card`               | #FFFFFF | Kad, panel                                | —       |
| `--primary`            | #0369A1 | CTA utama, pautan, fokus                  | 5.9:1   |
| `--primary-foreground` | #FFFFFF | Teks atas primary                         | 5.9:1   |
| `--secondary`          | #E0F2FE | Butang sekunder (latar)                   | —       |
| `--muted`              | #E7EFF5 | Latar lembut                              | —       |
| `--muted-foreground`   | #475569 | Teks sekunder                             | 7.6:1   |
| `--border`             | #BAE6FD | Sempadan hiasan                           | —       |
| `--input`              | #64748B | Sempadan medan borang (≥3:1, WCAG 1.4.11) | 4.8:1   |
| `--ring`               | #0369A1 | Cincin fokus                              | 5.9:1   |
| `--destructive`        | #B91C1C | Ralat, tindakan memadam                   | 6.5:1   |

Warna aksen hijau palet asal (#16A34A) **tidak** digunakan untuk CTA supaya tidak bertembung dengan status "Memenuhi".

### Status keperluan (sentiasa ikon + teks + warna)

| Status           | Token             | Nilai   | Ikon Lucide     | Kontras |
| ---------------- | ----------------- | ------- | --------------- | ------- |
| Memenuhi         | `--status-ok`     | #15803D | `CircleCheck`   | 5.0:1   |
| Bersyarat        | `--status-cond`   | #B45309 | `TriangleAlert` | 5.0:1   |
| Perlu pengesahan | `--status-verify` | #1D4ED8 | `CircleHelp`    | 6.7:1   |
| Tidak memenuhi   | `--status-fail`   | #B91C1C | `CircleX`       | 6.5:1   |

Setiap status ada token `-bg` yang lembut sebagai latar badge. Teks badge kekal pada warna status penuh.

## Tipografi

- **Tajuk:** Lexend (direka untuk kebolehbacaan). **Badan:** Source Sans 3. Kedua-duanya dimuat melalui `next/font/google`.
- Asas 16 px, line-height 1.5, panjang baris ≤ 70ch. Tiada teks badan < 14 px.
- Nombor wang menggunakan `tabular-nums` dan dipaparkan sebagai `RM 86,490.00`. Jumlah selepas naik taraf ialah angka terbesar pada kad.

## Ruang, bentuk, gerakan

- Skala ruang Tailwind (4 px). Gutter mudah alih 16 px.
- Sasaran sentuh ≥ 44×44 px, jarak antara sasaran ≥ 8 px.
- Radius `0.5rem`. Bayang minimum (`shadow-sm` untuk kad sahaja).
- Gerakan 150–250 ms, hanya `opacity`/`transform`. `prefers-reduced-motion` mematikan semua animasi bukan penting.

## Komponen asas

shadcn/ui (Radix) dalam `src/components/ui/`. Komponen domain (`StatusBadge`, `MoneyInput`, `Money`, `EvidenceLink`, `ScoreExplainer`, `GlossaryTerm`, `WizardShell`, `HardSoftToggle`) diterangkan dalam pelan §7.3.

## Cetak

`@media print`: latar putih, teks hitam, tiada navigasi atau butang. Status kekal dengan ikon + teks. Satu kad tidak dipecahkan merentas halaman (`break-inside: avoid`).

## Senarai semak pra-penghantaran (UI UX Pro Max)

- [ ] Tiada emoji sebagai ikon (SVG Lucide sahaja)
- [ ] `cursor-pointer` pada semua elemen boleh klik
- [ ] Kontras teks ≥ 4.5:1, sempadan medan ≥ 3:1
- [ ] Fokus kelihatan untuk navigasi papan kekunci
- [ ] `prefers-reduced-motion` dihormati
- [ ] Label kelihatan (bukan placeholder sahaja), ralat di bawah medan
- [ ] Teks, cip dan badge membalut tanpa terpotong pada zum 200%
- [ ] Responsif pada 375, 768, 1024, 1440 px tanpa skrol mendatar halaman
