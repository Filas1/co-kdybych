"use client";

import { useId, useState } from "react";
import { brand } from "@/brand.config";
import { ASSET_IDS, ASSETS, type AssetId } from "@/lib/assets";
import { formatMonthGenitive, formatMonthName } from "@/lib/format";
import {
  startMonthsInYear,
  startYears,
  withStartYear,
  type CalculatorInputs,
  type InputError,
  type InputField,
} from "@/lib/inputs";
import { assetFirstMonth, market } from "@/lib/market";

interface Props {
  inputs: CalculatorInputs;
  errors: InputError[];
  onChange: (patch: Partial<CalculatorInputs>) => void;
}

const QUICK_AMOUNTS = [500, 1000, 2000, 5000];

const fieldBase =
  "w-full rounded-xl border border-line bg-bg px-3 text-fg outline-none transition focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/40";

/** Keeps only digits, so "2 000 Kč" or "2.000" both become 2000. */
function parseAmount(text: string): number {
  const digits = text.replace(/\D/g, "").slice(0, 10);
  return digits ? Number(digits) : 0;
}

function ErrorText({ errors, field }: { errors: InputError[]; field: InputField }) {
  const messages = errors.filter((e) => e.field === field);
  if (messages.length === 0) return null;
  return (
    <p className="text-sm text-loss" role="alert">
      {messages.map((e) => e.message).join(" ")}
    </p>
  );
}

const legendClass = "mb-2 text-sm font-medium text-muted";

/** What and when: amount, optional one-off deposit, start month and assets. */
export function InputsForm({ inputs, errors, onChange }: Props) {
  const id = useId();
  const [showInitial, setShowInitial] = useState(inputs.initial > 0);

  const startYear = Number(inputs.start.slice(0, 4));
  const startMonth = Number(inputs.start.slice(5, 7));

  function toggleAsset(asset: AssetId) {
    // Keep the canonical order, so colors and cards don't shuffle around.
    const assets = inputs.assets.includes(asset)
      ? inputs.assets.filter((a) => a !== asset)
      : ASSET_IDS.filter((a) => a === asset || inputs.assets.includes(a));
    onChange({ assets });
  }

  return (
    <form
      className="space-y-5 rounded-3xl bg-surface p-4 sm:p-5 lg:sticky lg:top-6"
      onSubmit={(e) => e.preventDefault()}
      aria-label="Zadání"
    >
      {/* Monthly amount */}
      <div>
        <label htmlFor={`${id}-monthly`} className={`block ${legendClass}`}>
          Kolik měsíčně
        </label>
        <div className="relative">
          <input
            id={`${id}-monthly`}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            className={`${fieldBase} tabular h-14 pr-12 text-2xl font-bold`}
            value={inputs.monthly ? String(inputs.monthly) : ""}
            placeholder="0"
            onChange={(e) => onChange({ monthly: parseAmount(e.target.value) })}
          />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lg text-muted">Kč</span>
        </div>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {QUICK_AMOUNTS.map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => onChange({ monthly: amount })}
              aria-pressed={inputs.monthly === amount}
              aria-label={`${amount.toLocaleString("cs-CZ")} Kč měsíčně`}
              className="tabular min-h-10 rounded-full border border-line text-sm transition hover:border-muted aria-pressed:border-accent aria-pressed:bg-accent aria-pressed:font-bold aria-pressed:text-on-accent"
            >
              {amount.toLocaleString("cs-CZ")}
            </button>
          ))}
        </div>

        {showInitial ? (
          <div className="mt-4">
            <label htmlFor={`${id}-initial`} className={`block ${legendClass}`}>
              Jednorázově na začátku
            </label>
            <div className="relative">
              <input
                id={`${id}-initial`}
                type="text"
                inputMode="numeric"
                autoComplete="off"
                className={`${fieldBase} tabular h-12 pr-12 text-lg`}
                value={inputs.initial ? String(inputs.initial) : ""}
                placeholder="0"
                onChange={(e) => onChange({ initial: parseAmount(e.target.value) })}
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted">Kč</span>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowInitial(true)}
            className="mt-1 min-h-10 text-sm text-accent underline-offset-4 hover:underline"
          >
            + Přidat jednorázový vklad na začátku
          </button>
        )}
        <ErrorText errors={errors} field="amount" />
      </div>

      {/* Start month */}
      <fieldset>
        <legend className={legendClass}>Od kdy</legend>
        <div className="grid grid-cols-[1.4fr_1fr] gap-2">
          <select
            aria-label="Měsíc"
            className={`${fieldBase} h-12`}
            value={startMonth}
            onChange={(e) => onChange({ start: `${startYear}-${e.target.value.padStart(2, "0")}` })}
          >
            {startMonthsInYear(startYear, market).map((m) => (
              <option key={m} value={m}>
                {formatMonthName(m)}
              </option>
            ))}
          </select>
          <select
            aria-label="Rok"
            className={`${fieldBase} tabular h-12`}
            value={startYear}
            onChange={(e) => onChange({ start: withStartYear(inputs.start, Number(e.target.value), market) })}
          >
            {startYears(market).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-2 text-sm text-muted">Až do {formatMonthGenitive(market.lastMonth)}, kam sahají data.</p>
      </fieldset>

      {/* Assets */}
      <fieldset>
        <legend className={legendClass}>Do čeho</legend>
        <div className="flex flex-wrap gap-2">
          {ASSET_IDS.map((asset) => {
            const first = assetFirstMonth(asset);
            const tooEarly = first !== null && inputs.start < first;
            return (
              <button
                key={asset}
                type="button"
                onClick={() => toggleAsset(asset)}
                aria-pressed={inputs.assets.includes(asset)}
                className="flex min-h-10 items-center gap-2 rounded-full border border-line px-3 text-sm text-muted transition hover:border-muted aria-pressed:border-fg aria-pressed:text-fg"
              >
                <span className="size-2.5 rounded-full" style={{ background: brand.assetColors[asset] }} aria-hidden />
                {ASSETS[asset].label}
                {tooEarly && (
                  <span className="text-xs">
                    od {first.slice(5, 7)}/{first.slice(0, 4)}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <ErrorText errors={errors} field="assets" />
      </fieldset>
    </form>
  );
}
