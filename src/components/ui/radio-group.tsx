"use client";

import * as React from "react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

function RadioGroup({
  className,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return (
    <RadioGroupPrimitive.Root
      data-slot="radio-group"
      className={cn("grid gap-2", className)}
      {...props}
    />
  );
}

/** Pilihan berbentuk kad: seluruh kad boleh diklik (sasaran sentuh ≥ 44 px). */
function RadioCard({
  className,
  label,
  description,
  ...props
}: React.ComponentProps<typeof RadioGroupPrimitive.Item> & {
  label: React.ReactNode;
  description?: React.ReactNode;
}) {
  return (
    <RadioGroupPrimitive.Item
      data-slot="radio-card"
      className={cn(
        "group flex min-h-11 w-full cursor-pointer items-start gap-3 rounded-md border border-input bg-card p-3 text-left transition-colors duration-150 hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary data-[state=checked]:bg-secondary",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-input group-data-[state=checked]:border-primary"
      >
        <RadioGroupPrimitive.Indicator className="size-2.5 rounded-full bg-primary" />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="font-medium">{label}</span>
        {description ? <span className="text-sm text-muted-foreground">{description}</span> : null}
      </span>
    </RadioGroupPrimitive.Item>
  );
}

export { RadioGroup, RadioCard };
