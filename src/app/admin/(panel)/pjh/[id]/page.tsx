import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { DraftEditor } from "@/components/admin/DraftEditor";
import { OpenDraftButton } from "@/components/admin/OpenDraftButton";
import { draftView } from "@/lib/admin/queries";
import { requirePageUser } from "@/lib/auth/page";
import { PAGE_INDEX } from "@/lib/catalog/page-index";
import { DEFAULT_SEASON_ID } from "@/lib/catalog/seasons";
import { requireStore } from "@/lib/storage/env";

export default async function DraftPage(props: PageProps<"/admin/pjh/[id]">) {
  await connection();
  const { id } = await props.params;
  const user = await requirePageUser(`/admin/pjh/${id}`);
  const entry = PAGE_INDEX.find((p) => p.id === id);
  if (!entry) notFound();
  const view = await draftView(requireStore(), DEFAULT_SEASON_ID, id);
  if (!view) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm">
          <Link href="/admin/pjh" className="text-primary underline">
            PJH & draf
          </Link>{" "}
          / {id}
        </p>
        <h1 className="text-2xl font-semibold">{entry.label}</h1>
        <p>Tiada draf terbuka untuk PJH ini.</p>
        <OpenDraftButton
          seasonId={DEFAULT_SEASON_ID}
          pjhId={id}
          label="Buka draf"
          name={entry.label}
        />
      </div>
    );
  }
  return <DraftEditor view={view} role={user.role} />;
}
