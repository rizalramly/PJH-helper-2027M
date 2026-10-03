import Link from "next/link";

/** Pengepala tapak: pautan langkau ke kandungan dan navigasi utama (disembunyikan semasa cetak). */
export function SiteHeader() {
  return (
    <>
      <a
        href="#kandungan"
        className="sr-only z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:inline-flex focus:min-h-11 focus:items-center"
      >
        Langkau ke kandungan
      </a>
      <header className="border-b bg-card print:hidden">
        <nav
          aria-label="Utama"
          className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-x-4 px-4"
        >
          <Link href="/" className="flex min-h-11 items-center font-heading font-semibold">
            Perancang Pakej Haji PJH
          </Link>
          <ul className="flex flex-wrap gap-x-1 text-sm">
            <li>
              <Link
                href="/nilai"
                className="flex min-h-11 items-center rounded-md px-2 hover:bg-accent"
              >
                Nilai pakej
              </Link>
            </li>
            <li>
              <Link
                href="/hasil"
                className="flex min-h-11 items-center rounded-md px-2 hover:bg-accent"
              >
                Hasil
              </Link>
            </li>
            <li>
              <Link
                href="/liputan"
                className="flex min-h-11 items-center rounded-md px-2 hover:bg-accent"
              >
                Liputan data
              </Link>
            </li>
          </ul>
        </nav>
      </header>
    </>
  );
}
