"use client";

import { useMemo, useState } from "react";
import { lessonSentence, simulate } from "@/lib/calc";
import { DEFAULT_INPUTS, toSimulationInput, validateInputs, type CalculatorInputs } from "@/lib/inputs";
import { market } from "@/lib/market";
import { InputsForm } from "./InputsForm";
import { Results } from "./Results";

/**
 * Holds the form state and recomputes on every change. The whole simulation takes well under a
 * millisecond (a few hundred months × five assets), so there is no "Calculate" button.
 */
export function Calculator() {
  const [inputs, setInputs] = useState<CalculatorInputs>(DEFAULT_INPUTS);

  const errors = useMemo(() => validateInputs(inputs), [inputs]);
  const result = useMemo(
    () => (errors.length > 0 ? null : simulate(market, toSimulationInput(inputs, market))),
    [inputs, errors],
  );
  const lesson = useMemo(() => (result ? lessonSentence(result) : null), [result]);

  const update = (patch: Partial<CalculatorInputs>) => setInputs((prev) => ({ ...prev, ...patch }));

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start">
      <InputsForm inputs={inputs} errors={errors} onChange={update} />
      <Results inputs={inputs} errors={errors} result={result} lesson={lesson} onChange={update} />
    </div>
  );
}
