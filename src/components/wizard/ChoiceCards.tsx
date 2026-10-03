"use client";

import * as React from "react";

import { RadioCard, RadioGroup } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

export interface Choice<T extends string> {
  value: T;
  label: React.ReactNode;
  description?: React.ReactNode;
}

/** Kumpulan pilihan dengan fieldset/legend; anak panah papan kekunci bergerak antara pilihan. */
export function ChoiceCards<T extends string>({
  legend,
  hint,
  value,
  onChange,
  choices,
  columns = 1,
  name,
  extra,
}: {
  legend: React.ReactNode;
  hint?: React.ReactNode;
  value: T;
  onChange: (v: T) => void;
  choices: Choice<T>[];
  columns?: 1 | 2 | 3;
  name: string;
  extra?: React.ReactNode;
}) {
  const hintId = hint ? `${name}-bantuan` : undefined;
  return (
    <fieldset className="flex flex-col gap-2" aria-describedby={hintId}>
      <legend className="mb-1 text-base font-semibold">{legend}</legend>
      {hint ? (
        <p id={hintId} className="-mt-1 text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {extra}
      <RadioGroup
        name={name}
        value={value}
        onValueChange={(v) => onChange(v as T)}
        className={cn(columns === 2 && "sm:grid-cols-2", columns === 3 && "sm:grid-cols-3")}
      >
        {choices.map((c) => (
          <RadioCard key={c.value} value={c.value} label={c.label} description={c.description} />
        ))}
      </RadioGroup>
    </fieldset>
  );
}
