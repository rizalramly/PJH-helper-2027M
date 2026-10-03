import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { authenticate, type SessionUser } from "./guard";
import { SESSION_COOKIE } from "./session";

/** Untuk halaman /admin: pengguna semasa, atau ubah hala ke log masuk. */
export async function requirePageUser(next: string): Promise<SessionUser> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value ?? null;
  const user = await authenticate(token);
  if (!user) redirect(`/admin/log-masuk?next=${encodeURIComponent(next)}`);
  return user;
}

export async function currentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value ?? null;
  return authenticate(token);
}
