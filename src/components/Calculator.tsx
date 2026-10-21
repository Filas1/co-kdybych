"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { lessonSentence, simulate } from "@/lib/calc";
import { toSimulationInput, validateInputs, type CalculatorInputs } from "@/lib/inputs";
import { market, savingsRateIsEstimate } from "@/lib/market";
import { parseInputs, serializeInputs } from "@/lib/url-state";
import { InputsForm } from "./InputsForm";
import { Results } from "./Results";

/**
 * Holds the form state and recomputes on every change. The whole simulation takes well under a
 * millisecond (a few hundred months × five assets), so there is no "Calculate" button.
 *
 * The URL is the shareable copy of the inputs: read once when the page opens, then kept in sync
 * with history.replaceState (no new history entry per keystroke, so Back leaves the page).
 */
export function Calculator() {
  const searchParams = useSearchParams();
  const [inputs, setInputs] = useState<CalculatorInputs>(() => parseInputs(searchParams, market));
  const initialInputs = useRef(inputs);

  const errors = useMemo(() => validateInputs(inputs), [inputs]);
  const result = useMemo(
    () => (errors.length > 0 ? null : simulate(market, toSimulationInput(inputs, market))),
    [inputs, errors],
  );
  const lesson = useMemo(() => (result ? lessonSentence(result) : null), [result]);
  const query = useMemo(() => serializeInputs(inputs, savingsRateIsEstimate), [inputs]);

  useEffect(() => {
    // Keep a clean URL until the user changes something; never write an invalid state.
    if (inputs === initialInputs.current || errors.length > 0) return;
    window.history.replaceState(null, "", `${window.location.pathname}?${query}`);
  }, [inputs, errors, query]);

  const update = (patch: Partial<CalculatorInputs>) => setInputs((prev) => ({ ...prev, ...patch }));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start">
      <InputsForm inputs={inputs} errors={errors} onChange={update} />
      <Results inputs={inputs} errors={errors} result={result} lesson={lesson} query={query} onChange={update} />
    </div>
  );
}

/** Shown in the static HTML until the calculator (which needs the URL) renders in the browser. */
export function CalculatorSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]" aria-busy="true" aria-label="Načítám kalkulačku">
      <div className="h-[460px] rounded-3xl bg-surface motion-safe:animate-pulse" />
      <div className="space-y-4">
        <div className="h-12 rounded-xl bg-surface motion-safe:animate-pulse" />
        <div className="h-28 rounded-3xl bg-surface motion-safe:animate-pulse" />
        <div className="h-80 rounded-3xl bg-surface motion-safe:animate-pulse" />
      </div>
    </div>
  );
}
