"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

import { adminFetch } from "./api";

export function LogoutButton() {
  const router = useRouter();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        await adminFetch("/api/admin/session", { method: "DELETE" });
        router.replace("/admin/log-masuk");
        router.refresh();
      }}
    >
      <LogOut aria-hidden="true" />
      Log keluar
    </Button>
  );
}
