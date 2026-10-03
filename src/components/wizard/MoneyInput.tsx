"use client";

import * as React from "react";

import { parseRMToSen } from "@/lib/engine/money";
import { cn } from "@/lib/utils";

/** Input RM untuk telefon: papan kekunci nombor, format "100,000" semasa blur. Tiada slider. */
export function MoneyInput({
  value,
  onChange,
  onBlur,
  className,
  ...a11y
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  className?: string;
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}) {
  const format = () => {
    const sen = parseRMToSen(value);
    if (sen === null) return;
    const ringgit = sen / 100n;
    const cents = sen % 100n;
    onChange(
      `${new Intl.NumberFormat("en-MY").format(ringgit)}${cents ? `.${cents.toString().padStart(2, "0")}` : ""}`,
    );
  };
  return (
    <div
      className={cn(
        "flex min-h-11 items-stretch overflow-hidden rounded-md border border-input bg-card focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="flex items-center bg-muted px-3 font-medium text-muted-foreground"
      >
        RM
      </span>
      <input
        {...a11y}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          format();
          onBlur?.();
        }}
        className="min-w-0 flex-1 bg-transparent px-3 py-2 text-lg money outline-none"
      />
    </div>
  );
}
