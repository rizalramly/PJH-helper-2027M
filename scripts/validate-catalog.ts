// Guna: pnpm catalog:validate [fail.json ...]  (tanpa argumen = semua fail dalam data/catalog/1448h)
import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";

import { validateCatalogFile, type PageIndexEntry } from "../src/lib/catalog/validate";

const root = join(__dirname, "..");
const manifest = JSON.parse(readFileSync(join(root, "data/sources/manifest.json"), "utf8"));
const pageIndex: PageIndexEntry[] = manifest.sources[0].page_index.pjhs;

const args = process.argv.slice(2);
const dir = join(root, "data/catalog/1448h");
const files = args.length
  ? args
  : readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .map((f) => join(dir, f));

let failed = 0;
for (const file of files) {
  const id = basename(file, ".json");
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    console.log(`✗ ${id}: JSON tidak sah: ${(e as Error).message}`);
    failed++;
    continue;
  }
  const r = validateCatalogFile(raw, id, pageIndex);
  const s = r.summary;
  console.log(
    `${r.ok ? "✓" : "✗"} ${id}` +
      (s
        ? `: ${s.packages} pakej, ${s.variants} varian (${s.pricedVariants} berharga, ${s.unpricedVariants} tanpa harga), ${s.excludedVariantItems} dikecualikan, ${s.blockingGaps} gap blocking`
        : ""),
  );
  for (const e of r.errors) console.log(`   RALAT: ${e}`);
  for (const w of r.warnings) console.log(`   amaran: ${w}`);
  if (!r.ok) failed++;
}
process.exit(failed ? 1 : 0);
