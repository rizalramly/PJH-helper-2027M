import type { Metadata } from "next";

import { AdminNav } from "@/components/admin/AdminNav";
import { LogoutButton } from "@/components/admin/LogoutButton";
import { currentUser } from "@/lib/auth/page";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Pentadbir | Perancang Pakej Haji PJH",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await currentUser();
  if (!user) redirect("/admin/log-masuk");
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-4 py-4 sm:py-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
        <p className="text-sm">
          <span className="font-semibold">Panel pentadbir</span>
          <span className="text-muted-foreground">
            {" "}
            · {user.email} ({user.role === "admin" ? "pentadbir" : "penyemak"})
          </span>
        </p>
        <LogoutButton />
      </div>
      <AdminNav role={user.role} />
      <main id="kandungan" className="flex flex-1 flex-col gap-6">
        {children}
      </main>
    </div>
  );
}
