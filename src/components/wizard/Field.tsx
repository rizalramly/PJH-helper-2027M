"use client";

import * as React from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { errorOf, fieldId, useWizard } from "./context";

/** Medan dengan label kelihatan, teks bantuan dan ralat di bawah medan (aria-describedby). */
export function Field({
  field,
  label,
  hint,
  children,
  className,
}: {
  field: string;
  label: React.ReactNode;
  hint?: React.ReactNode;
  className?: string;
  children: (a11y: {
    id: string;
    "aria-describedby"?: string;
    "aria-invalid"?: boolean;
  }) => React.ReactNode;
}) {
  const { errors } = useWizard();
  const id = fieldId(field);
  const error = errorOf(errors, field);
  const describedBy =
    [hint ? `${id}-bantuan` : null, error ? `${id}-ralat` : null].filter(Boolean).join(" ") ||
    undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {hint ? (
        <p id={`${id}-bantuan`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {children({
        id,
        "aria-describedby": describedBy,
        ...(error ? { "aria-invalid": true } : {}),
      })}
      {error ? (
        <p id={`${id}-ralat`} className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
