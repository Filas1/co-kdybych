"use client";

import { useId, useState } from "react";
import { LIMITS, type InputError } from "@/lib/inputs";

interface Props {
  rate: number;
  errors: InputError[];
  onChange: (rate: number) => void;
}

/**
 * The savings rate estimate, shown only while ČNB savings rates are missing from the data.
 * Text input (not type="number") so a Czech decimal comma like "2,5" works on every phone.
 */
export function SavingsRateField({ rate, errors, onChange }: Props) {
  const id = useId();
  const [text, setText] = useState(Number.isFinite(rate) ? String(rate).replace(".", ",") : "");
  const error = errors.find((e) => e.field === "savingsRate");

  return (
    <div className="space-y-2 rounded-2xl border border-dashed border-line p-3">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm text-muted">
          Sazba (odhad)
        </label>
        <div className="relative w-32">
          <input
            id={id}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            aria-invalid={Boolean(error)}
            className="tabular h-10 w-full rounded-lg border border-line bg-bg pl-3 pr-16 text-fg outline-none focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/40"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              const trimmed = e.target.value.trim();
              onChange(trimmed === "" ? Number.NaN : Number(trimmed.replace(",", ".")));
            }}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">% ročně</span>
        </div>
      </div>
      <p className="text-xs text-muted">
        Skutečné sazby spořáků z ČNB zatím nemám, tak počítám se stálou sazbou. Uprav si ji (0–{LIMITS.savingsRateMax} %).
      </p>
      {error && (
        <p className="text-sm text-loss" role="alert">
          {error.message}
        </p>
      )}
    </div>
  );
}
