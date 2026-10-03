// Sediakan stor setempat E2E: katalog repo diterbitkan (seperti `pnpm db:seed`) dan seorang
// pentadbir. Stor ini terpencil (.data/e2e-store) dan dicipta semula setiap kali.
import { rm } from "node:fs/promises";
import { join } from "node:path";

import { createUser } from "../../src/lib/auth/users";
import { readRepoCatalog } from "../../src/lib/catalog/repo-files";
import { publishCatalog } from "../../src/lib/storage/catalog-repo";
import { FileKV } from "../../src/lib/storage/file-kv";
import { E2E_ADMIN, E2E_STORE } from "../../playwright.config";

export default async function globalSetup() {
  const repoRoot = join(__dirname, "../..");
  const root = join(repoRoot, E2E_STORE);
  await rm(root, { recursive: true, force: true });
  const kv = new FileKV(root);
  const repo = readRepoCatalog(repoRoot, "1448H");
  if (repo.errors.length) throw new Error(`Katalog repo tidak sah: ${repo.errors[0]}`);
  const now = new Date();
  await publishCatalog(kv, {
    seasonId: "1448H",
    files: repo.raw,
    coverage: repo.coverage,
    actor: "e2e-seed",
    now,
  });
  await createUser(kv, { ...E2E_ADMIN, role: "admin" }, "e2e-global-setup", now);
}
