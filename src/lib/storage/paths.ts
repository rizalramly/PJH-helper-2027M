// Pengawal laluan stor. Laluan Blob dibina menjadi URL; segmen "..", "." atau aksara seperti
// ?, #, %, \ boleh mengubah objek sebenar yang dibaca (path traversal). Semua stor menolaknya.
const SAFE = /^[a-z0-9][a-z0-9/_.@-]*$/i;

function check(path: string, allowTrailingSlash: boolean) {
  const segments = path.split("/");
  if (allowTrailingSlash && segments.at(-1) === "") segments.pop();
  const bad =
    path.length > 512 ||
    !SAFE.test(path) ||
    segments.some((s) => s === "" || s === "." || s === "..");
  if (bad) throw new Error(`Laluan stor tidak sah: ${JSON.stringify(path.slice(0, 80))}`);
}

export const assertSafePath = (path: string) => check(path, false);
export const assertSafePrefix = (prefix: string) => check(prefix, true);
