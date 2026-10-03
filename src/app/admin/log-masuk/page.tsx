import type { Metadata } from "next";

import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = {
  title: "Log masuk pentadbir | Perancang Pakej Haji PJH",
  robots: { index: false, follow: false },
};

export default async function LoginPage(props: PageProps<"/admin/log-masuk">) {
  const sp = await props.searchParams;
  const raw = typeof sp.next === "string" ? sp.next : "/admin";
  // Hanya laluan dalaman /admin (elak ubah hala terbuka).
  const next = /^\/admin(\/[\w\-/?=&%.]*)?$/.test(raw) && !raw.startsWith("//") ? raw : "/admin";
  return (
    <main id="kandungan" className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Log masuk pentadbir</h1>
        <p className="text-muted-foreground">Untuk penyemak dan pentadbir katalog sahaja.</p>
      </header>
      <LoginForm next={next} />
    </main>
  );
}
