"use client";

import { CircleX } from "lucide-react";
import * as React from "react";

import type { FieldError } from "@/lib/wizard/state";

import { fieldId } from "./context";

/** Ringkasan ralat boleh difokus selepas cubaan meneruskan gagal; setiap item memaut ke medan. */
export const ErrorSummary = React.forwardRef<HTMLDivElement, { errors: FieldError[] }>(
  function ErrorSummary({ errors }, ref) {
    if (errors.length === 0) return null;
    return (
      <div
        ref={ref}
        role="alert"
        tabIndex={-1}
        aria-labelledby="ringkasan-ralat"
        className="rounded-md border border-status-fail/40 bg-status-fail-bg p-4 text-status-fail outline-none focus-visible:outline-2 focus-visible:outline-ring"
      >
        <h2 id="ringkasan-ralat" className="flex items-center gap-2 text-base font-semibold">
          <CircleX aria-hidden="true" className="size-5" />
          Sila betulkan {errors.length} perkara sebelum meneruskan
        </h2>
        <ul className="mt-2 list-disc pl-6">
          {errors.map((e) => (
            <li key={e.field + e.message}>
              <a
                href={`#${fieldId(e.field)}`}
                className="underline underline-offset-2"
                onClick={(ev) => {
                  const el = document.getElementById(fieldId(e.field));
                  if (el) {
                    ev.preventDefault();
                    el.focus();
                  }
                }}
              >
                {e.message}
              </a>
            </li>
          ))}
        </ul>
      </div>
    );
  },
);
