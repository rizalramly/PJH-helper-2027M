// Penjelasan istilah dalam bahasa mudah (spesifikasi §14), berpandukan penerangan brosur
// dalam kompilasi sumber. Butiran sebenar berbeza mengikut PJH dan pakej.
export const GLOSSARY = {
  aziziyah: {
    term: "Aziziyah",
    text: "Kawasan berhampiran Mina. Sesetengah pakej menempatkan jemaah di hotel di Aziziyah atau Syisyah sekitar hari-hari Masyair (lazimnya dalam tempoh 1–15 Zulhijjah) supaya lebih dekat ke Mina dan Jamarat. Tarikh, susunan bilik dan syaratnya berbeza mengikut pakej.",
  },
  pmn: {
    term: "PMN",
    text: "Perkhidmatan Masyair Naik Taraf: khemah dan perkhidmatan di Arafah dan Mina yang dinaik taraf, biasanya di lokasi lebih dekat ke Jamarat dan dengan caj tambahan. Pakej tanpa PMN menggunakan khemah Muassasah di Muaisim.",
  },
  tarwiyah: {
    term: "Tarwiyah",
    text: "Bermalam di Mina pada 8 Zulhijjah sebelum wukuf di Arafah, mengikut sunnah. Kebanyakan brosur menyatakan pelaksanaannya tertakluk kepada kebenaran pihak berkuasa.",
  },
  muaisim: {
    term: "Muaisim",
    text: "Kawasan khemah Muassasah di Mina. Brosur menyatakan jaraknya ke Jamarat lebih jauh berbanding khemah PMN.",
  },
} as const;

export type GlossaryKey = keyof typeof GLOSSARY;
