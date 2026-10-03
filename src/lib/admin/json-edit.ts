// Paparan JSON draf mengikut peranan. Penyemak tidak boleh mengubah kelulusan PJH (server
// menolaknya), jadi medan itu disembunyikan daripada editor dan dipulihkan semasa simpan.
import type { PjhCatalogFileInput } from "../catalog/schema";

type Role = "admin" | "reviewer";

/** Teks JSON untuk editor; tanpa `pjh.approval` bagi penyemak. */
export function jsonForRole(file: PjhCatalogFileInput, role: Role): string {
  if (role === "admin") return JSON.stringify(file, null, 2);
  const pjh: Partial<PjhCatalogFileInput["pjh"]> = { ...file.pjh };
  delete pjh.approval;
  return JSON.stringify({ ...file, pjh }, null, 2);
}

/** Objek yang dihantar untuk `replace_file`; kelulusan asal sentiasa dikekalkan bagi penyemak. */
export function fileFromEditor(
  parsed: Record<string, unknown>,
  original: PjhCatalogFileInput,
  role: Role,
): Record<string, unknown> {
  if (role === "admin") return parsed;
  const pjh = parsed.pjh;
  if (!pjh || typeof pjh !== "object" || Array.isArray(pjh)) return parsed;
  return { ...parsed, pjh: { ...pjh, approval: original.pjh.approval } };
}
