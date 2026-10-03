import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Bahagian yang boleh dibuka (details/summary, papan kekunci asli). Dalam laporan (`expanded`)
 * kandungan dipaparkan terus supaya turut dicetak.
 */
export function Disclosure({
  title,
  expanded = false,
  children,
  className,
}: {
  title: React.ReactNode;
  expanded?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  if (expanded) {
    return (
      <section className={cn("flex break-inside-avoid flex-col gap-1", className)}>
        <h4 className="font-semibold">{title}</h4>
        {children}
      </section>
    );
  }
  return (
    <details className={cn("group rounded-md border bg-background/60 px-3", className)}>
      <summary className="flex min-h-11 cursor-pointer items-center gap-2 py-2 font-medium marker:text-muted-foreground">
        {title}
      </summary>
      <div className="pb-3">{children}</div>
    </details>
  );
}
