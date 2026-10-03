import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";

import { StatusBadge } from "@/components/results/StatusBadge";
import { SetupForm } from "@/components/admin/SetupForm";
import { DEFAULT_SEASON_ID } from "@/lib/catalog/seasons";
import { sessionSecret } from "@/lib/auth/session";
import { setupTokenConfigured } from "@/lib/auth/setup";
import { readUsers } from "@/lib/auth/users";
import { getActivePointer } from "@/lib/storage/catalog-repo";
import { publicStore } from "@/lib/storage/env";

export const metadata: Metadata = {
  title: "Persediaan pentadbir | Perancang Pakej Haji PJH",
  robots: { index: false, follow: false },
};

interface Check {
  label: string;
  ok: boolean;
  text: string;
}

export default async function SetupPage() {
  await connection();
  const store = publicStore();
  const hasUsers = store ? (await readUsers(store.kv)).users.length > 0 : false;
  const enabled = setupTokenConfigured() && !!sessionSecret() && !!store && !hasUsers;

  // Diagnostik hanya sebelum pentadbir pertama wujud: ya/tidak sahaja, tiada nilai rahsia.
  let checks: Check[] = [];
  if (!hasUsers) {
    const pointer = store ? await getActivePointer(store.kv, DEFAULT_SEASON_ID) : null;
    checks = [
      {
        label: "Stor data (Vercel Blob)",
        ok: !!store,
        text: store ? "Dikonfigurasi" : "BLOB_READ_WRITE_TOKEN tidak ditetapkan",
      },
      {
        label: "Rahsia sesi",
        ok: !!sessionSecret(),
        text: sessionSecret() ? "Dikonfigurasi" : "AUTH_SECRET tiada atau kurang 32 aksara",
      },
      {
        label: "Token persediaan",
        ok: setupTokenConfigured(),
        text: setupTokenConfigured()
          ? "Dikonfigurasi"
          : "ADMIN_SETUP_TOKEN tiada atau kurang 32 aksara",
      },
      {
        label: `Katalog ${DEFAULT_SEASON_ID}`,
        ok: !!pointer,
        text: pointer
          ? "Diterbitkan dalam stor"
          : "Katalog asas repo dipaparkan; terbitkan katalog awal selepas log masuk",
      },
    ];
  }

  return (
    <main id="kandungan" className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Persediaan pentadbir pertama</h1>
        <p className="text-muted-foreground">
          Sekali sahaja, apabila belum ada pentadbir dalam stor persekitaran ini.
        </p>
      </header>
      {checks.length ? (
        <section aria-labelledby="status-konfigurasi" className="flex flex-col gap-2">
          <h2 id="status-konfigurasi" className="text-lg font-semibold">
            Status konfigurasi
          </h2>
          <ul className="flex flex-col gap-2">
            {checks.map((c) => (
              <li key={c.label} className="flex flex-col gap-1 rounded-md border p-3">
                <span className="font-medium">{c.label}</span>
                <span>
                  <StatusBadge status={c.ok ? "MEMENUHI" : "PERLU_PENGESAHAN"}>
                    {c.text}
                  </StatusBadge>
                </span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">
            Selepas menukar pemboleh ubah persekitaran di Vercel, buat <em>Redeploy</em>.
          </p>
        </section>
      ) : null}
      {enabled ? (
        <SetupForm />
      ) : (
        <p className="rounded-md bg-muted p-3 text-sm">
          {hasUsers
            ? "Persediaan telah selesai. "
            : "Persediaan belum boleh dijalankan sehingga semua konfigurasi di atas lengkap. "}
          <Link href="/admin/log-masuk" className="text-primary underline">
            Log masuk pentadbir
          </Link>
        </p>
      )}
    </main>
  );
}
