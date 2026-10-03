"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Ringkasan" },
  { href: "/admin/pjh", label: "PJH & draf" },
  { href: "/admin/import", label: "Import" },
  { href: "/admin/terbit", label: "Terbit & sejarah" },
  { href: "/admin/sumber", label: "Dokumen sumber" },
  { href: "/admin/musim", label: "Musim" },
  { href: "/admin/audit", label: "Log audit" },
];

export function AdminNav({ role }: { role: "admin" | "reviewer" }) {
  const path = usePathname();
  return (
    <nav aria-label="Pentadbir">
      <ul className="flex flex-wrap gap-1">
        {LINKS.map((l) => {
          const active = l.href === "/admin" ? path === "/admin" : path.startsWith(l.href);
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center rounded-md px-3 text-sm",
                  active ? "bg-secondary font-semibold text-foreground" : "hover:bg-accent",
                )}
              >
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
      {role === "reviewer" ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Peranan penyemak: boleh menyunting, mengimport dan meluluskan semakan draf. Penerbitan,
          rollback, kelulusan PJH dan musim memerlukan pentadbir.
        </p>
      ) : null}
    </nav>
  );
}
