"use client";

import { ArrowLeft, ArrowRight, RotateCcw, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  initialState,
  restoreState,
  STEPS,
  summarize,
  toAssessRequest,
  validateStep,
  WIZARD_STORAGE_KEY,
  type StepId,
  type WizardState,
} from "@/lib/wizard/state";
import { writeSavedRequest } from "@/lib/results/client";

import { WizardContext, type WizardContextValue } from "./context";
import { ErrorSummary } from "./ErrorSummary";
import { StepProgress } from "./StepProgress";
import { StepPreferences } from "./steps/StepPreferences";
import { StepReview } from "./steps/StepReview";
import { StepRooms } from "./steps/StepRooms";
import { StepStart } from "./steps/StepStart";
import { StepTrip } from "./steps/StepTrip";

const STEP_INTRO: Record<StepId, string> = {
  1: "Mulakan dengan bajet dan siapa yang akan pergi.",
  2: "Tetapkan susunan bilik di Makkah, Madinah dan Aziziyah.",
  3: "Tempoh, Aziziyah, Tarwiyah dan PMN.",
  4: "Apa yang paling penting kepada anda?",
  5: "Semak sebelum kami menilai pakej.",
};

const clampStep = (n: number): StepId =>
  Math.min(Math.max(Math.trunc(n) || 1, 1), STEPS.length) as StepId;

/** Langkah tertinggi yang boleh dibuka: semua langkah sebelumnya mesti sah. */
function maxReachable(s: WizardState): StepId {
  for (const step of [1, 2, 3, 4] as StepId[]) if (validateStep(s, step).length > 0) return step;
  return 5;
}

export function WizardShell() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const requested = clampStep(Number(params.get("langkah") ?? "1"));

  const [state, setState] = React.useState<WizardState>(() => initialState());
  const [loaded, setLoaded] = React.useState(false);
  const [attempted, setAttempted] = React.useState<Set<number>>(() => new Set());
  const [touched, setTouched] = React.useState<Set<string>>(() => new Set());
  const [confirmReset, setConfirmReset] = React.useState(false);
  const [focusSummary, setFocusSummary] = React.useState(0);
  const headingRef = React.useRef<HTMLHeadingElement>(null);
  const summaryRef = React.useRef<HTMLDivElement>(null);
  const prevStep = React.useRef<number | null>(null);

  // Pulihkan draf dari peranti selepas mount (localStorage boleh disekat; abaikan dengan selamat).
  React.useEffect(() => {
    try {
      const restored = restoreState(window.localStorage.getItem(WIZARD_STORAGE_KEY));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- penyegerakan sekali dengan storan peranti
      if (restored) setState(restored);
    } catch {
      /* storan tidak tersedia */
    }
    setLoaded(true);
  }, []);

  React.useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storan penuh atau disekat */
    }
  }, [state, loaded]);

  const reachable = maxReachable(state);
  const step = loaded ? (Math.min(requested, reachable) as StepId) : requested;

  // URL menunjuk langkah yang belum boleh dibuka (cth. pautan lama) → ganti dengan langkah sah.
  React.useEffect(() => {
    if (loaded && step !== requested)
      router.replace(`${pathname}?langkah=${step}`, { scroll: false });
  }, [loaded, step, requested, pathname, router]);

  // Fokus tajuk langkah apabila langkah bertukar (bukan semasa muat pertama).
  React.useEffect(() => {
    if (prevStep.current !== null && prevStep.current !== step) headingRef.current?.focus();
    prevStep.current = step;
  }, [step]);

  React.useEffect(() => {
    if (focusSummary > 0) summaryRef.current?.focus();
  }, [focusSummary]);

  const goTo = React.useCallback(
    (n: number) => {
      setConfirmReset(false);
      router.push(`${pathname}?langkah=${clampStep(n)}`);
    },
    [pathname, router],
  );

  const stepErrors = validateStep(state, step);
  const visibleErrors = attempted.has(step)
    ? stepErrors
    : stepErrors.filter((e) => touched.has(e.field));

  const ctx: WizardContextValue = {
    state,
    update: (patch) =>
      setState((s) => ({ ...s, ...(typeof patch === "function" ? patch(s) : patch) })),
    errors: visibleErrors,
    touch: (field) => setTouched((t) => (t.has(field) ? t : new Set(t).add(field))),
    goTo,
  };

  const fail = (failedStep: number) => {
    setAttempted((a) => new Set(a).add(failedStep));
    if (failedStep !== step) goTo(failedStep);
    setFocusSummary((n) => n + 1);
  };

  const next = () => {
    if (stepErrors.length > 0) return fail(step);
    goTo(step + 1);
  };

  const submit = () => {
    const first = maxReachable(state);
    if (first < 5) return fail(first);
    writeSavedRequest({ request: toAssessRequest(state), summary: summarize(state) });
    router.push("/hasil");
  };

  const reset = () => {
    const fresh = initialState(state.seasonId);
    setState(fresh);
    setAttempted(new Set());
    setTouched(new Set());
    setConfirmReset(false);
    goTo(1);
  };

  const meta = STEPS[step - 1];
  return (
    <WizardContext.Provider value={ctx}>
      <div className="flex flex-col gap-6">
        <StepProgress current={step} maxReached={reachable} onSelect={goTo} />
        <header className="flex flex-col gap-1">
          <h1
            ref={headingRef}
            tabIndex={-1}
            className="text-2xl font-semibold outline-none sm:text-3xl"
          >
            {meta.title}
          </h1>
          <p className="text-muted-foreground">{STEP_INTRO[step]}</p>
        </header>

        {attempted.has(step) ? <ErrorSummary ref={summaryRef} errors={stepErrors} /> : null}

        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (step === 5) submit();
            else next();
          }}
          className="flex flex-col gap-6"
        >
          {step === 1 ? <StepStart /> : null}
          {step === 2 ? <StepRooms /> : null}
          {step === 3 ? <StepTrip /> : null}
          {step === 4 ? <StepPreferences /> : null}
          {step === 5 ? <StepReview /> : null}

          <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
            {step > 1 ? (
              <Button type="button" variant="outline" onClick={() => goTo(step - 1)}>
                <ArrowLeft aria-hidden="true" />
                Kembali
              </Button>
            ) : (
              <span />
            )}
            <div className="flex flex-wrap gap-2">
              {step === 4 ? (
                <Button type="button" variant="ghost" onClick={() => goTo(5)}>
                  Langkau
                </Button>
              ) : null}
              {step === 5 ? (
                <Button type="submit" size="lg">
                  <Search aria-hidden="true" />
                  Nilai pakej
                </Button>
              ) : (
                <Button type="submit">
                  Seterusnya
                  <ArrowRight aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>
        </form>

        <div className="flex flex-col items-start gap-2 border-t pt-4 text-sm">
          <p className="text-muted-foreground">Pilihan anda disimpan pada peranti ini sahaja.</p>
          {confirmReset ? (
            <div
              role="group"
              aria-label="Sahkan mula semula"
              className="flex flex-wrap items-center gap-2"
            >
              <span>Padam semua pilihan dan mula semula?</span>
              <Button type="button" variant="destructive" size="sm" onClick={reset}>
                Ya, mula semula
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setConfirmReset(false)}
              >
                Batal
              </Button>
            </div>
          ) : (
            <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmReset(true)}>
              <RotateCcw aria-hidden="true" />
              Mula semula
            </Button>
          )}
        </div>
      </div>
    </WizardContext.Provider>
  );
}
