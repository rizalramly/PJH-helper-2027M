"use client";

import { CircleCheck, CircleX } from "lucide-react";
import * as React from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/wizard/NativeSelect";
import { cn } from "@/lib/utils";

const useFieldId = (prefix: string) => `${prefix}-${React.useId().replace(/[^a-zA-Z0-9]/g, "")}`;

export function TextField({
  label,
  hint,
  className,
  multiline = false,
  ...props
}: { label: string; hint?: string; multiline?: boolean } & React.ComponentProps<"input"> &
  React.ComponentProps<"textarea">) {
  const id = useFieldId("f");
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Label htmlFor={id} className="text-sm">
        {label}
      </Label>
      {multiline ? (
        <Textarea id={id} aria-describedby={hint ? `${id}-h` : undefined} {...props} />
      ) : (
        <Input id={id} aria-describedby={hint ? `${id}-h` : undefined} {...props} />
      )}
      {hint ? (
        <p id={`${id}-h`} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function SelectField({
  label,
  options,
  className,
  ...props
}: {
  label: string;
  options: { value: string; label: string }[];
} & React.ComponentProps<"select">) {
  const id = useFieldId("s");
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Label htmlFor={id} className="text-sm">
        {label}
      </Label>
      <NativeSelect id={id} {...props}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}

export function CheckField({
  label,
  checked,
  onChange,
  name,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  name?: string;
}) {
  const id = useFieldId("c");
  return (
    <div className="flex min-h-11 items-center gap-2">
      <input
        id={id}
        name={name}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-5 cursor-pointer accent-primary"
      />
      <label htmlFor={id} className="cursor-pointer text-sm font-medium">
        {label}
      </label>
    </div>
  );
}

/** Mesej hasil tindakan (aria-live) — ikon + teks + warna. */
export function Feedback({
  state,
}: {
  state:
    | { kind: "idle" }
    | { kind: "ok"; message: string }
    | { kind: "error"; message: string; details?: string[] };
}) {
  return (
    <div aria-live="polite" className="min-h-0">
      {state.kind === "ok" ? (
        <p className="flex items-center gap-2 rounded-md bg-status-ok-bg p-2 text-sm text-status-ok">
          <CircleCheck aria-hidden="true" className="size-4 shrink-0" />
          {state.message}
        </p>
      ) : null}
      {state.kind === "error" ? (
        <div role="alert" className="rounded-md bg-status-fail-bg p-2 text-sm text-status-fail">
          <p className="flex items-center gap-2 font-medium">
            <CircleX aria-hidden="true" className="size-4 shrink-0" />
            {state.message}
          </p>
          {state.details?.length ? (
            <ul className="mt-1 list-disc pl-6">
              {state.details.slice(0, 30).map((d, i) => (
                <li key={i} className="[overflow-wrap:anywhere]">
                  {d}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export type FeedbackState = Parameters<typeof Feedback>[0]["state"];
