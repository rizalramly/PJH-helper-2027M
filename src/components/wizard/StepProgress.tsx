import { Check } from "lucide-react";

import { STEPS } from "@/lib/wizard/state";
import { cn } from "@/lib/utils";

/** "Langkah N daripada 5" + senarai langkah dengan aria-current. */
export function StepProgress({
  current,
  onSelect,
  maxReached,
}: {
  current: number;
  onSelect: (step: number) => void;
  maxReached: number;
}) {
  return (
    <nav aria-label="Kemajuan penilaian" className="flex flex-col gap-2">
      <p className="text-sm font-medium text-muted-foreground">
        Langkah {current} daripada {STEPS.length}
      </p>
      <div
        role="progressbar"
        aria-label="Kemajuan"
        aria-valuemin={1}
        aria-valuemax={STEPS.length}
        aria-valuenow={current}
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-200"
          style={{ width: `${(current / STEPS.length) * 100}%` }}
        />
      </div>
      <ol className="hidden gap-1 sm:flex">
        {STEPS.map((s) => {
          const done = s.id < current;
          const reachable = s.id <= maxReached;
          return (
            <li key={s.id} className="flex-1">
              <button
                type="button"
                disabled={!reachable}
                onClick={() => onSelect(s.id)}
                aria-current={s.id === current ? "step" : undefined}
                className={cn(
                  "flex min-h-11 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-60",
                  s.id === current
                    ? "bg-secondary font-semibold text-foreground"
                    : "text-muted-foreground hover:bg-accent",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs",
                    s.id === current
                      ? "border-primary bg-primary text-primary-foreground"
                      : done
                        ? "border-primary text-primary"
                        : "border-input",
                  )}
                >
                  {done ? <Check className="size-3.5" /> : s.id}
                </span>
                {s.short}
                {done ? <span className="sr-only"> (selesai)</span> : null}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
