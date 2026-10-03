import { connection } from "next/server";

import { ImportForms } from "@/components/admin/ImportForms";
import { requirePageUser } from "@/lib/auth/page";
import { PAGE_INDEX } from "@/lib/catalog/page-index";
import { DEFAULT_SEASON_ID } from "@/lib/catalog/seasons";

export default async function ImportPage() {
  await connection();
  await requirePageUser("/admin/import");
  return (
    <>
      <header>
        <h1 className="text-2xl font-semibold">Import ke draf</h1>
        <p className="text-sm text-muted-foreground">
          Import tidak pernah diterbitkan terus. Semak draf, luluskan, kemudian terbitkan.
        </p>
      </header>
      <ImportForms
        seasonId={DEFAULT_SEASON_ID}
        pjhs={PAGE_INDEX.map((p) => ({ id: p.id, label: p.label }))}
      />
    </>
  );
}
