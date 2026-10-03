"use client";

import { createContext, useContext } from "react";

import type { FieldError, WizardState } from "@/lib/wizard/state";

export interface WizardContextValue {
  state: WizardState;
  update: (patch: Partial<WizardState> | ((s: WizardState) => Partial<WizardState>)) => void;
  /** Ralat yang sedang dipaparkan (selepas cubaan meneruskan atau selepas blur). */
  errors: FieldError[];
  touch: (field: string) => void;
  goTo: (step: number) => void;
}

export const WizardContext = createContext<WizardContextValue | null>(null);

export function useWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error("useWizard mesti digunakan dalam WizardShell");
  return ctx;
}

export const fieldId = (field: string) => `medan-${field.replace(/[^a-zA-Z0-9]+/g, "-")}`;
export const errorOf = (errors: FieldError[], field: string) =>
  errors.find((e) => e.field === field)?.message;
