"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/wizard/NativeSelect";
import type { PjhOption } from "@/lib/catalog/browse";

/** Pilih PJH; berfungsi tanpa JavaScript (GET), dan terus memaparkan pakej apabila dipilih. */
export function PjhPicker({ options, value }: { options: PjhOption[]; value: string | null }) {
  const router = useRouter();
  return (
    <form action="/pakej" method="get" className="flex flex-col gap-2 sm:flex-row sm:items-end">
      <div className="flex flex-1 flex-col gap-1">
        <label htmlFor="pilih-pjh" className="font-medium">
          PJH
        </label>
        <NativeSelect
          id="pilih-pjh"
          name="pjh"
          defaultValue={value ?? ""}
          onChange={(e) => {
            if (e.target.value) router.push(`/pakej?pjh=${encodeURIComponent(e.target.value)}`);
          }}
        >
          <option value="" disabled>
            Pilih PJH…
          </option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name} ({o.packages} pakej)
            </option>
          ))}
        </NativeSelect>
      </div>
      <Button type="submit" className="min-h-11">
        <Search aria-hidden="true" />
        Papar pakej
      </Button>
    </form>
  );
}
