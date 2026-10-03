import { connection } from "next/server";

import { SeasonForm } from "@/components/admin/SeasonForm";
import { StatusBadge } from "@/components/results/StatusBadge";
import { requirePageUser } from "@/lib/auth/page";
import { listSeasons } from "@/lib/catalog/season-store";
import { getActivePointer } from "@/lib/storage/catalog-repo";
import { requireStore } from "@/lib/storage/env";

export default async function SeasonsPage() {
  await connection();
  const user = await requirePageUser("/admin/musim");
  const store = requireStore();
  const seasons = await listSeasons(store.kv);
  const pointers = await Promise.all(seasons.map((s) => getActivePointer(store.kv, s.id)));
  return (
    <>
      <header>
        <h1 className="text-2xl font-semibold">Musim</h1>
        <p className="text-sm text-muted-foreground">
          Data musim berlainan tidak dicampur. Musim baharu memerlukan katalognya sendiri (import
          dan terbit) sebelum boleh dinilai.
        </p>
      </header>
      <ul className="flex flex-col gap-2">
        {seasons.map((s, i) => (
          <li
            key={s.id}
            className="flex flex-wrap items-center gap-3 rounded-md border bg-card p-3 text-sm"
          >
            <span className="font-semibold">{s.label}</span>
            <StatusBadge status={s.active ? "MEMENUHI" : "PERLU_PENGESAHAN"}>
              {s.active ? "Aktif" : "Tidak aktif"}
            </StatusBadge>
            <span className="text-muted-foreground">
              Versi aktif:{" "}
              <span className="font-mono">
                {pointers[i]?.datasetVersion ?? "tiada (fail repo)"}
              </span>
            </span>
          </li>
        ))}
      </ul>
      {user.role === "admin" ? (
        <SeasonForm />
      ) : (
        <p className="text-sm">Hanya pentadbir boleh mengubah musim.</p>
      )}
    </>
  );
}
