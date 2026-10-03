"use client";

import { ChevronDown } from "lucide-react";
import * as React from "react";

import { cn } from "@/lib/utils";

/** <select> asli (mesra telefon dan pembaca skrin) dengan gaya token. */
export function NativeSelect({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className={cn("relative", className)}>
      <select
        {...props}
        className="min-h-11 w-full cursor-pointer appearance-none rounded-md border border-input bg-card py-2 pr-10 pl-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-invalid:border-destructive"
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-muted-foreground"
      />
    </div>
  );
}

export const OCCUPANCY_LABEL: Record<number, string> = {
  1: "Seorang (bilik ber-1)",
  2: "Berdua (bilik ber-2)",
  3: "Bertiga (bilik ber-3)",
  4: "Berempat (bilik ber-4)",
  5: "Berlima (bilik ber-5)",
  6: "Berenam (bilik ber-6)",
};
