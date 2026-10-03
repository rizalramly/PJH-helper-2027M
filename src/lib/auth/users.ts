// Pengguna pentadbir dalam admin/users.json (stor JSON; kemas kini bersyarat ETag).
import { appendAudit } from "../storage/catalog-repo";
import type { JsonKV } from "../storage/kv";
import { hashPassword, type DEFAULT_COST } from "./password";
import type { Role } from "./session";

export const USERS_PATH = "admin/users.json";

export interface AdminUser {
  email: string;
  passwordHash: string;
  role: Role;
  disabledAt: string | null;
  createdAt: string;
  sessionVersion: number;
  lastLoginAt: string | null;
}

interface UsersFile {
  users: AdminUser[];
}

export const normalizeEmail = (e: string) => e.trim().toLowerCase();
export const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

export async function readUsers(kv: JsonKV) {
  const r = await kv.getJSON<UsersFile>(USERS_PATH);
  return { users: r?.value.users ?? [], etag: r?.etag ?? null };
}

export async function findUser(kv: JsonKV, email: string) {
  const { users } = await readUsers(kv);
  return users.find((u) => u.email === normalizeEmail(email)) ?? null;
}

async function writeUsers(kv: JsonKV, users: AdminUser[], etag: string | null) {
  await kv.putJSON(USERS_PATH, { users }, etag ? { ifMatch: etag } : { createOnly: true });
}

export async function createUser(
  kv: JsonKV,
  input: { email: string; password: string; role: Role },
  actor: string,
  now: Date,
  cost?: typeof DEFAULT_COST,
) {
  const email = normalizeEmail(input.email);
  if (!EMAIL_RE.test(email)) throw new Error("Emel tidak sah.");
  const { users, etag } = await readUsers(kv);
  if (users.some((u) => u.email === email)) throw new Error(`Pengguna ${email} sudah wujud.`);
  const user: AdminUser = {
    email,
    passwordHash: await hashPassword(input.password, cost),
    role: input.role,
    disabledAt: null,
    createdAt: now.toISOString(),
    sessionVersion: 1,
    lastLoginAt: null,
  };
  await writeUsers(kv, [...users, user], etag);
  await appendAudit(kv, {
    at: now.toISOString(),
    actor,
    action: "user_create",
    target: email,
    note: `peranan ${input.role}`,
  });
  return user;
}

/** Kemas kini pengguna (cth. lumpuhkan, tukar kata laluan, catat log masuk). */
export async function updateUser(
  kv: JsonKV,
  email: string,
  patch: (u: AdminUser) => AdminUser,
  audit: { actor: string; now: Date; note: string } | null,
) {
  const { users, etag } = await readUsers(kv);
  const i = users.findIndex((u) => u.email === normalizeEmail(email));
  if (i < 0) throw new Error(`Pengguna ${email} tidak wujud.`);
  const next = [...users];
  next[i] = patch(users[i]);
  await writeUsers(kv, next, etag);
  if (audit) {
    await appendAudit(kv, {
      at: audit.now.toISOString(),
      actor: audit.actor,
      action: "user_update",
      target: users[i].email,
      note: audit.note,
    });
  }
  return next[i];
}
