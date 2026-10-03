"use client";

import { Info } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { GLOSSARY, type GlossaryKey } from "@/lib/wizard/glossary";

/** Butang istilah yang membuka penjelasan ringkas (klik/ketik, bukan hover sahaja). */
export function GlossaryTerm({ term }: { term: GlossaryKey }) {
  const g = GLOSSARY[term];
  return (
    <Popover>
      <PopoverTrigger
        className="inline-flex min-h-11 cursor-pointer items-center gap-1 rounded-sm px-1 font-medium text-primary underline decoration-dotted underline-offset-4 focus-visible:outline-2 focus-visible:outline-ring"
        aria-label={`Apakah ${g.term}?`}
      >
        <Info aria-hidden="true" className="size-4" />
        Apakah {g.term}?
      </PopoverTrigger>
      <PopoverContent>
        <p className="font-heading font-semibold">{g.term}</p>
        <p className="mt-1 text-sm leading-relaxed">{g.text}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          Penjelasan umum. Rujuk PJH untuk butiran pakej anda.
        </p>
      </PopoverContent>
    </Popover>
  );
}
