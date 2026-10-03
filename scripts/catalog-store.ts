// Operasi stor katalog (Vercel Blob). Token: BLOB_READ_WRITE_TOKEN (server sahaja).
//   pnpm db:seed [--yes] [--dry-run]       terbitkan katalog repo (idempotent)
//   pnpm catalog:status                    versi aktif dan bilangan PJH/varian
//   pnpm catalog:history                   sejarah versi + audit
//   tsx scripts/catalog-store.ts activate <versi> --yes   jadikan versi lama aktif (rollback)
// Setiap persekitaran Vercel (Development/Preview/Production) mesti mempunyai Blob store sendiri.
import { join } from "node:path";

import { readRepoCatalog } from "../src/lib/catalog/repo-files";
import { BlobKV } from "../src/lib/storage/blob-kv";
import {
  activateVersion,
  computeDatasetVersion,
  getActivePointer,
  getActiveSnapshot,
  listAuditEvents,
  listDatasetVersions,
  publishCatalog,
} from "../src/lib/storage/catalog-repo";
import { MemoryKV, type JsonKV } from "../src/lib/storage/kv";

const root = join(__dirname, "..");
const args = process.argv.slice(2);
const command = args[0] ?? "status";
const flag = (name: string) => args.includes(`--${name}`);
const SEASON = process.env.SEASON_ID ?? "1448H";
const actor = process.env.CATALOG_ACTOR ?? "catalog-store-script";

function storeLabel(token: string) {
  // Format token: vercel_blob_rw_<storeId>_<rahsia>. Paparkan ID store sahaja.
  const parts = token.split("_");
  return parts.length >= 5 ? `store ${parts[3]}` : "store (ID tidak dikenal pasti)";
}

function openStore(): { kv: JsonKV; label: string } {
  if (flag("dry-run")) return { kv: new MemoryKV(), label: "memori (dry-run)" };
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.error("BLOB_READ_WRITE_TOKEN tidak ditetapkan. Guna --dry-run untuk ujian tanpa Blob.");
    process.exit(2);
  }
  return { kv: new BlobKV(token), label: `Vercel Blob, ${storeLabel(token)}` };
}

function requireYes(label: string) {
  if (!flag("yes") && !flag("dry-run")) {
    console.error(`Operasi tulis ke ${label}. Ulang dengan --yes untuk meneruskan.`);
    process.exit(2);
  }
}

async function main() {
  if (command === "publish") {
    const repo = readRepoCatalog(root, SEASON);
    if (repo.errors.length) {
      console.error(`Katalog repo tidak sah (${repo.errors.length} ralat):`);
      for (const e of repo.errors.slice(0, 20)) console.error(`  - ${e}`);
      process.exit(1);
    }
    const { datasetVersion } = computeDatasetVersion(SEASON, repo.raw, repo.coverage);
    const { kv, label } = openStore();
    console.log(
      `Sasaran: ${label}. Musim ${SEASON}: ${repo.raw.length} PJH, versi ${datasetVersion}.`,
    );
    requireYes(label);
    const result = await publishCatalog(kv, {
      seasonId: SEASON,
      files: repo.raw,
      coverage: repo.coverage,
      actor,
      now: new Date(),
    });
    console.log(JSON.stringify(result));
    if (flag("dry-run")) {
      const again = await publishCatalog(kv, {
        seasonId: SEASON,
        files: repo.raw,
        coverage: repo.coverage,
        actor,
        now: new Date(),
      });
      console.log(`Larian kedua (idempotensi): ${again.status}`);
    }
    return;
  }
  const { kv, label } = openStore();
  if (command === "status") {
    const pointer = await getActivePointer(kv, SEASON);
    if (!pointer) return console.log(`${label}: tiada katalog aktif untuk ${SEASON}.`);
    const snap = await getActiveSnapshot(kv, SEASON);
    const variants =
      snap?.files.reduce((n, f) => n + f.packages.reduce((m, p) => m + p.variants.length, 0), 0) ??
      0;
    console.log(
      `${label}: aktif ${pointer.datasetVersion} (sejak ${pointer.activatedAt} oleh ${pointer.activatedBy}); ${snap?.files.length ?? 0} PJH, ${variants} varian.`,
    );
    return;
  }
  if (command === "history") {
    console.log(`${label}: versi:`, await listDatasetVersions(kv, SEASON));
    for (const e of await listAuditEvents(kv))
      console.log(
        `  ${e.at} ${e.action} ${e.datasetVersion} (sebelum: ${e.previousVersion ?? "-"}) oleh ${e.actor}`,
      );
    return;
  }
  if (command === "activate") {
    const version = args[1];
    if (!version || version.startsWith("--"))
      throw new Error("Guna: activate <datasetVersion> --yes");
    requireYes(label);
    const previous = await activateVersion(kv, SEASON, version, actor, new Date());
    console.log(`Aktif: ${version} (sebelum: ${previous ?? "-"})`);
    return;
  }
  throw new Error(`Arahan tidak dikenali: ${command}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
