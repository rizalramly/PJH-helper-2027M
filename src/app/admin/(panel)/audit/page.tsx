import Link from "next/link";
import { connection } from "next/server";

import { AUDIT_ACTION, fmtDateTime } from "@/components/admin/labels";
import { requirePageUser } from "@/lib/auth/page";
import { listAuditEvents } from "@/lib/storage/catalog-repo";
import { requireStore } from "@/lib/storage/env";

export default async function AuditPage(props: PageProps<"/admin/audit">) {
  await connection();
  await requirePageUser("/admin/audit");
  const sp = await props.searchParams;
  const now = new Date().toISOString().slice(0, 7);
  const month = typeof sp.bulan === "string" && /^\d{4}-\d{2}$/.test(sp.bulan) ? sp.bulan : now;
  const events = (await listAuditEvents(requireStore().kv, month)).reverse();
  const [y, m] = month.split("-").map(Number);
  const prev = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
  const next = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7);
  return (
    <>
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold">Log audit {month}</h1>
        <p className="text-sm text-muted-foreground">
          Setiap peristiwa disimpan sebagai objek berasingan dan tidak diubah (append-only).
        </p>
        <nav aria-label="Bulan" className="flex gap-3 text-sm">
          <Link
            href={`/admin/audit?bulan=${prev}`}
            className="inline-flex min-h-11 items-center text-primary underline"
          >
            ← {prev}
          </Link>
          {month < now ? (
            <Link
              href={`/admin/audit?bulan=${next}`}
              className="inline-flex min-h-11 items-center text-primary underline"
            >
              {next} →
            </Link>
          ) : null}
        </nav>
      </header>
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">Tiada peristiwa bagi bulan ini.</p>
      ) : (
        <div
          className="overflow-x-auto rounded-md border"
          tabIndex={0}
          role="region"
          aria-label="Jadual log audit"
        >
          <table className="w-full min-w-[40rem] border-collapse bg-card text-left text-sm">
            <caption className="sr-only">Peristiwa audit {month}</caption>
            <thead className="bg-muted">
              <tr>
                <th scope="col" className="p-2">
                  Masa
                </th>
                <th scope="col" className="p-2">
                  Tindakan
                </th>
                <th scope="col" className="p-2">
                  Sasaran
                </th>
                <th scope="col" className="p-2">
                  Pelaku
                </th>
                <th scope="col" className="p-2">
                  Nota
                </th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id} className="border-t align-top">
                  <td className="p-2 whitespace-nowrap">{fmtDateTime(e.at)}</td>
                  <td className="p-2">{AUDIT_ACTION[e.action] ?? e.action}</td>
                  <td className="p-2 font-mono text-xs [overflow-wrap:anywhere]">
                    {e.target ?? e.datasetVersion ?? "—"}
                  </td>
                  <td className="p-2">{e.actor}</td>
                  <td className="p-2 [overflow-wrap:anywhere]">{e.note ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
