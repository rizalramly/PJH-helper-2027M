import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { PjhPicker } from "@/components/browse/PjhPicker";
import { StatusBadge } from "@/components/results/StatusBadge";
import { packageDTO } from "@/lib/api/dto";
import { getActiveCatalog } from "@/lib/catalog/active";
import { browsePjh, pjhOptions, type BrowsePackage } from "@/lib/catalog/browse";
import { DEFAULT_SEASON_ID } from "@/lib/catalog/seasons";
import { APPROVAL } from "@/lib/catalog/status-labels";
import { AVAILABILITY_LABEL } from "@/lib/engine/compare";
import { formatRM } from "@/lib/engine/money";
import type { Variant } from "@/lib/engine/types";
import {
  aziziyahText,
  classText,
  durationText,
  hotelsText,
  pageText,
  tarwiyahText,
} from "@/lib/results/format";

export const metadata: Metadata = {
  title: "Semak pakej | Perancang Pakej Haji PJH",
  description:
    "Lihat semua pakej satu PJH, disusun dari harga terendah hingga paling premium, dengan harga setiap susunan bilik dan sumber halaman.",
};

const CATEGORY: Record<Variant["travellerCategory"], string> = {
  adult: "Dewasa",
  child_with_bed: "Kanak-kanak (dengan katil)",
  child_no_bed: "Kanak-kanak (tanpa katil)",
  infant: "Bayi",
};
const PMN: Record<Variant["pmnStatus"], string> = {
  included: "Termasuk",
  not_included: "Tidak termasuk",
  not_stated: "Tidak dinyatakan",
};
const MASYAIR = { pmn: "PMN", muaisim: "Muaisim", not_stated: "Tidak dinyatakan" } as const;

export default async function SemakPakejPage(props: PageProps<"/pakej">) {
  await connection();
  const sp = await props.searchParams;
  const pjhId = typeof sp.pjh === "string" ? sp.pjh : null;

  let data: {
    options: ReturnType<typeof pjhOptions>;
    selected: ReturnType<typeof browsePjh>;
  } | null = null;
  try {
    const { catalog } = await getActiveCatalog(DEFAULT_SEASON_ID);
    data = { options: pjhOptions(catalog), selected: pjhId ? browsePjh(catalog, pjhId) : null };
  } catch {
    data = null;
  }

  return (
    <main
      id="kandungan"
      className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 sm:py-10"
    >
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold sm:text-3xl">Semak pakej</h1>
        <p className="max-w-[70ch] leading-relaxed">
          Pilih PJH untuk melihat semua pakejnya, disusun dari harga terendah hingga paling premium.
          Harga ialah seorang mengikut susunan bilik seperti dicetak dalam brosur (Haji 1448H /
          2027M). Untuk padanan dengan bajet dan keperluan anda, guna{" "}
          <Link href="/nilai" className="text-primary underline">
            Nilai pakej
          </Link>
          .
        </p>
      </header>

      {!data ? (
        <p role="alert" className="rounded-md bg-status-fail-bg p-4 text-status-fail">
          Katalog tidak dapat dibaca sekarang. Cuba lagi sebentar.
        </p>
      ) : (
        <>
          <PjhPicker options={data.options} value={data.selected ? pjhId : null} />
          {pjhId && !data.selected ? (
            <p role="alert" className="rounded-md bg-status-fail-bg p-4 text-status-fail">
              PJH ini tiada dalam katalog. Pilih PJH daripada senarai.
            </p>
          ) : null}
          {data.selected ? <PjhPackages {...data.selected} /> : null}
        </>
      )}
    </main>
  );
}

function PjhPackages({ pjh, packages }: NonNullable<ReturnType<typeof browsePjh>>) {
  const approval = APPROVAL[pjh.approvals[0]?.status ?? "unverified"];
  const variantCount = packages.reduce((n, p) => n + p.variants.length, 0);
  return (
    <section aria-labelledby="pjh-terpilih" className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 rounded-lg border bg-card p-4">
        <h2 id="pjh-terpilih" className="text-xl font-semibold">
          {pjh.name}
        </h2>
        <p className="text-sm text-muted-foreground">
          {packages.length} pakej, {variantCount} varian; disusun dari harga terendah.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={approval.status}>{approval.text}</StatusBadge>
          <Link
            href={`/liputan#pjh-${pjh.id}`}
            className="inline-flex min-h-11 items-center text-sm text-primary underline"
          >
            Liputan data PJH ini
          </Link>
          {pjh.website ? (
            <a
              href={pjh.website.startsWith("http") ? pjh.website : `https://${pjh.website}`}
              className="inline-flex min-h-11 items-center text-sm text-primary underline"
              rel="noopener noreferrer"
              target="_blank"
            >
              Laman web PJH
            </a>
          ) : null}
        </div>
      </div>
      {packages.length === 0 ? (
        <p className="rounded-md bg-muted p-4">Tiada pakej direkodkan bagi PJH ini.</p>
      ) : (
        <ol className="flex flex-col gap-4">
          {packages.map((p, i) => (
            <PackageCard key={p.pkg.id} item={p} rank={i + 1} />
          ))}
        </ol>
      )}
    </section>
  );
}

function PackageCard({ item, rank }: { item: BrowsePackage; rank: number }) {
  const { pkg, variants, from } = item;
  const dto = packageDTO(pkg);
  const headingId = `pakej-${pkg.id}`;
  const facts: [string, string][] = [
    ["Tempoh", durationText(dto)],
    ["Hotel Makkah", hotelsText(dto, "makkah")],
    ["Hotel Madinah", hotelsText(dto, "madinah")],
    ["Aziziyah", aziziyahText(dto)],
    ["Tarwiyah", tarwiyahText(dto)],
    [
      "Masyair",
      `${MASYAIR[pkg.masyair.type]}${pkg.masyair.description ? `; ${pkg.masyair.description}` : ""}`,
    ],
    ["Penerbangan", classText(pkg.flightClass.value)],
    ["Tarikh", pkg.travelDates.label ?? "Tidak dinyatakan"],
    ["Kekosongan", AVAILABILITY_LABEL[pkg.availability.status]],
  ];
  return (
    <li>
      <article
        aria-labelledby={headingId}
        className="flex flex-col gap-3 rounded-lg border bg-card p-4"
      >
        <header className="flex flex-col gap-1">
          <h3 id={headingId} className="text-lg font-semibold">
            {rank}. {pkg.name}
          </h3>
          {pkg.tierLabel || pkg.series ? (
            <p className="text-sm text-muted-foreground">
              {[pkg.series, pkg.tierLabel].filter(Boolean).join(" · ")}
            </p>
          ) : null}
          <p className="text-base">
            {from ? (
              <>
                Dari <span className="font-semibold money">{formatRM(from.priceSen!)}</span> seorang
                (Makkah ber-{from.makkahOccupancy}, Madinah ber-{from.madinahOccupancy})
              </>
            ) : (
              <StatusBadge status="PERLU_PENGESAHAN">Harga perlu pengesahan</StatusBadge>
            )}
          </p>
          {pkg.unresolvedConflicts.length ? (
            <StatusBadge status="BERSYARAT">
              Konflik sumber belum diselesaikan: {pkg.unresolvedConflicts.join("; ")}
            </StatusBadge>
          ) : null}
        </header>

        <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[10rem_1fr]">
          {facts.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="font-medium text-muted-foreground">{k}</dt>
              <dd className="break-words">{v}</dd>
            </div>
          ))}
        </dl>

        <div
          className="overflow-x-auto rounded-md border"
          tabIndex={0}
          role="region"
          aria-label={`Harga varian ${pkg.name} (boleh skrol mendatar)`}
        >
          <table className="w-full border-collapse text-left text-sm">
            <caption className="sr-only">Harga seorang bagi setiap varian {pkg.name}</caption>
            <thead className="bg-muted">
              <tr>
                <th scope="col" className="p-2 font-semibold">
                  Kod
                </th>
                <th scope="col" className="p-2 font-semibold">
                  Bilik Makkah / Madinah
                </th>
                <th scope="col" className="p-2 font-semibold">
                  Aziziyah
                </th>
                <th scope="col" className="p-2 font-semibold">
                  PMN
                </th>
                <th scope="col" className="p-2 font-semibold">
                  Kategori
                </th>
                <th scope="col" className="p-2 text-right font-semibold">
                  Harga seorang
                </th>
                <th scope="col" className="p-2 font-semibold">
                  Sumber
                </th>
              </tr>
            </thead>
            <tbody>
              {variants.map((v) => (
                <tr key={v.id} className="border-t align-top">
                  <th scope="row" className="p-2 font-medium whitespace-nowrap">
                    {v.code}
                    {v.codeIsInternal ? (
                      <span className="block text-xs font-normal text-muted-foreground">
                        ID dalaman
                      </span>
                    ) : null}
                  </th>
                  <td className="p-2 whitespace-nowrap">
                    ber-{v.makkahOccupancy} / ber-{v.madinahOccupancy}
                    {v.roomLabelAsPublished ? (
                      <span className="block text-xs text-muted-foreground">
                        {v.roomLabelAsPublished}
                      </span>
                    ) : null}
                  </td>
                  <td className="p-2 whitespace-nowrap">
                    {v.aziziyahOccupancy ? `ber-${v.aziziyahOccupancy}` : "Ikut pakej"}
                  </td>
                  <td className="p-2 whitespace-nowrap">{PMN[v.pmnStatus]}</td>
                  <td className="p-2 whitespace-nowrap">{CATEGORY[v.travellerCategory]}</td>
                  <td className="p-2 text-right whitespace-nowrap money">
                    {v.priceSen === null ? "Perlu pengesahan" : formatRM(v.priceSen)}
                  </td>
                  <td className="p-2 text-xs whitespace-nowrap text-muted-foreground">
                    {v.evidence[0] ? pageText(v.evidence[0]) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {variants.some((v) => v.notes) ? (
          <ul className="list-disc pl-5 text-sm text-muted-foreground">
            {variants
              .filter((v) => v.notes)
              .map((v) => (
                <li key={v.id}>
                  {v.code}: {v.notes}
                </li>
              ))}
          </ul>
        ) : null}
      </article>
    </li>
  );
}
