// Urus pengguna pentadbir. Tiada kata laluan lalai; kata laluan dibaca daripada prompt
// (tidak dipaparkan) atau ADMIN_PASSWORD (untuk automasi/E2E sahaja).
//   pnpm admin:create --email <emel> [--role admin|reviewer]
//   pnpm admin:users                           senarai pengguna (tanpa hash)
//   tsx scripts/admin-user.ts disable --email <emel> --yes
//   tsx scripts/admin-user.ts reset-password --email <emel>   (membatalkan semua sesi)
// Stor: BLOB_READ_WRITE_TOKEN (Vercel Blob) atau PJH_LOCAL_STORE (direktori setempat).
import { isAbsolute, join } from "node:path";
import { createInterface } from "node:readline";

import { hashPassword, passwordProblem } from "../src/lib/auth/password";
import { createUser, normalizeEmail, readUsers, updateUser } from "../src/lib/auth/users";
import { BlobKV } from "../src/lib/storage/blob-kv";
import { FileKV } from "../src/lib/storage/file-kv";
import type { JsonKV } from "../src/lib/storage/kv";

const args = process.argv.slice(2);
const command = args[0] ?? "list";
const opt = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const flag = (name: string) => args.includes(`--${name}`);
const actor = `skrip admin-user (${process.env.USER ?? "operator"})`;

function openStore(): { kv: JsonKV; label: string } {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (token) return { kv: new BlobKV(token), label: "Vercel Blob" };
  const dir = process.env.PJH_LOCAL_STORE;
  if (dir) {
    const root = isAbsolute(dir) ? dir : join(process.cwd(), dir);
    return { kv: new FileKV(root), label: `stor setempat ${root}` };
  }
  console.error("Tetapkan BLOB_READ_WRITE_TOKEN atau PJH_LOCAL_STORE.");
  process.exit(2);
}

async function promptHidden(question: string): Promise<string> {
  if (!process.stdin.isTTY) {
    console.error("Tiada terminal untuk prompt. Tetapkan ADMIN_PASSWORD untuk automasi.");
    process.exit(2);
  }
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  const out = rl as unknown as { _writeToOutput: (s: string) => void; output: NodeJS.WriteStream };
  let muted = false;
  out._writeToOutput = (s: string) => {
    if (!muted) out.output.write(s);
  };
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
    muted = true;
  });
}

async function readPassword(): Promise<string> {
  const fromEnv = process.env.ADMIN_PASSWORD;
  const pw = fromEnv ?? (await promptHidden("Kata laluan baharu: "));
  const problem = passwordProblem(pw);
  if (problem) {
    console.error(problem);
    process.exit(1);
  }
  if (!fromEnv && (await promptHidden("Ulang kata laluan: ")) !== pw) {
    console.error("Kata laluan tidak sama.");
    process.exit(1);
  }
  return pw;
}

async function main() {
  const { kv, label } = openStore();
  const email = opt("email") ?? process.env.ADMIN_BOOTSTRAP_EMAIL;
  if (command === "list") {
    const { users } = await readUsers(kv);
    console.log(`${label}: ${users.length} pengguna`);
    for (const u of users) {
      console.log(
        `  ${u.email}  ${u.role}  ${u.disabledAt ? `dilumpuhkan ${u.disabledAt}` : "aktif"}  log masuk terakhir: ${u.lastLoginAt ?? "-"}`,
      );
    }
    return;
  }
  if (!email) {
    console.error("Nyatakan --email (atau ADMIN_BOOTSTRAP_EMAIL).");
    process.exit(2);
  }
  if (command === "create") {
    const role = (opt("role") ?? "admin") as "admin" | "reviewer";
    if (role !== "admin" && role !== "reviewer") {
      console.error("--role mesti admin atau reviewer.");
      process.exit(2);
    }
    const u = await createUser(
      kv,
      { email, password: await readPassword(), role },
      actor,
      new Date(),
    );
    console.log(`Dicipta dalam ${label}: ${u.email} (${u.role}).`);
  } else if (command === "disable") {
    if (!flag("yes")) {
      console.error("Ulang dengan --yes untuk melumpuhkan pengguna.");
      process.exit(2);
    }
    const now = new Date();
    await updateUser(
      kv,
      email,
      (u) => ({ ...u, disabledAt: now.toISOString(), sessionVersion: u.sessionVersion + 1 }),
      { actor, now, note: "dilumpuhkan" },
    );
    console.log(`${normalizeEmail(email)} dilumpuhkan; semua sesi dibatalkan.`);
  } else if (command === "reset-password") {
    const hash = await hashPassword(await readPassword());
    const now = new Date();
    await updateUser(
      kv,
      email,
      (u) => ({ ...u, passwordHash: hash, disabledAt: null, sessionVersion: u.sessionVersion + 1 }),
      { actor, now, note: "kata laluan ditukar; sesi lama dibatalkan" },
    );
    console.log(`Kata laluan ${normalizeEmail(email)} ditukar.`);
  } else {
    console.error(`Arahan tidak dikenali: ${command}`);
    process.exit(2);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
