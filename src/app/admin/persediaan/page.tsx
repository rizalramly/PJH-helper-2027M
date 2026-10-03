import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { SetupForm } from "@/components/admin/SetupForm";
import { setupTokenConfigured } from "@/lib/auth/setup";
import { readUsers } from "@/lib/auth/users";
import { getStore } from "@/lib/storage/env";

export const metadata: Metadata = {
  title: "Persediaan pentadbir | Perancang Pakej Haji PJH",
  robots: { index: false, follow: false },
};

export default async function SetupPage() {
  await connection();
  const store = getStore();
  const hasUsers = store ? (await readUsers(store.kv)).users.length > 0 : false;
  const enabled = setupTokenConfigured() && !!store && !hasUsers;
  return (
    <main id="kandungan" className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Persediaan pentadbir pertama</h1>
        <p className="text-muted-foreground">
          Sekali sahaja, apabila belum ada pentadbir dalam stor persekitaran ini.
        </p>
      </header>
      {enabled ? (
        <SetupForm />
      ) : (
        <p className="rounded-md bg-muted p-3 text-sm">
          {hasUsers
            ? "Persediaan telah selesai. "
            : "Persediaan tidak diaktifkan (ADMIN_SETUP_TOKEN atau stor data belum dikonfigurasi). "}
          <Link href="/admin/log-masuk" className="text-primary underline">
            Log masuk pentadbir
          </Link>
        </p>
      )}
    </main>
  );
}
