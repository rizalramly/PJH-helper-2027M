import { readFileSync } from "node:fs";
import { join } from "node:path";

import { toEngineCatalog } from "@/lib/catalog/load";
import { pjhCatalogFileSchema } from "@/lib/catalog/schema";

export function loadCatalogFiles(ids: string[]) {
  return ids.map((id) =>
    pjhCatalogFileSchema.parse(
      JSON.parse(readFileSync(join(__dirname, "../../data/catalog/1448h", `${id}.json`), "utf8")),
    ),
  );
}

export const busyraCatalog = () => toEngineCatalog(loadCatalogFiles(["busyra"]), "test-busyra");
