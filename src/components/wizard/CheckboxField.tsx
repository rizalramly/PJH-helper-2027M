"use client";

import * as React from "react";

import { Checkbox } from "@/components/ui/checkbox";

export function CheckboxField({
  id,
  checked,
  onChange,
  label,
  description,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: React.ReactNode;
  description?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-11 items-start gap-3 py-1">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(v) => onChange(v === true)}
        aria-describedby={description ? `${id}-desc` : undefined}
      />
      <div className="flex flex-col">
        <label htmlFor={id} className="cursor-pointer leading-6 font-medium">
          {label}
        </label>
        {description ? (
          <span id={`${id}-desc`} className="text-sm text-muted-foreground">
            {description}
          </span>
        ) : null}
      </div>
    </div>
  );
}
