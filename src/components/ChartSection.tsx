"use client";

import { useState } from "react";
import { ASSETS, pastTense } from "@/lib/assets";
import type { SimulationResult } from "@/lib/calc";
import { chartRows, chartSeries, dominantAsset } from "@/lib/chart-data";
import { formatCzk, formatMonth } from "@/lib/format";
import { SeriesSwatch, ValueChart } from "./ValueChart";

/**
 * Chart with a legend and, when one asset (usually Bitcoin) is so far ahead that it would flatten
 * every other line, a switch to hide it from the chart only. The cards below always show it.
 */
export function ChartSection({ result }: { result: SimulationResult }) {
  const [hideDominant, setHideDominant] = useState(false);
  const dominant = dominantAsset(result);
  const hidden = dominant && hideDominant ? [dominant] : [];
  const series = chartSeries(result, hidden);
  const rows = chartRows(result, series);

  const first = result.months[0];
  const last = result.months.at(-1)!;
  const summary = series
    .map((s) => `${s.label} ${formatCzk(rows.at(-1)?.[s.key] ?? 0)}`)
    .join(", ");

  return (
    <figure className="space-y-3 rounded-3xl bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-medium">Vývoj v čase</h3>
        {result.real && <span className="text-xs text-muted">v dnešních korunách</span>}
      </div>

      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        {series.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <SeriesSwatch color={s.color} dashed={s.dashed} />
            {s.label}
          </li>
        ))}
      </ul>

      <ValueChart rows={rows} series={series} height={260} />

      <figcaption className="sr-only">
        Graf hodnoty od {formatMonth(first)} do {formatMonth(last)}. Na konci: {summary}.
      </figcaption>

      {dominant && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3 text-sm">
          <p className="text-muted">
            {hideDominant
              ? `${ASSETS[dominant].label} je teď mimo graf, čísla najdeš v kartě níž.`
              : `${ASSETS[dominant].label} ${pastTense(ASSETS[dominant], "vyrostl")} tolik, že ostatní čáry skoro splynou.`}
          </p>
          <button
            type="button"
            onClick={() => setHideDominant((v) => !v)}
            aria-pressed={hideDominant}
            className="min-h-11 rounded-full border border-line px-4 font-medium transition hover:border-muted aria-pressed:border-accent aria-pressed:text-accent"
          >
            {hideDominant ? `Ukázat ${ASSETS[dominant].inSentence}` : `Skrýt ${ASSETS[dominant].inSentence}`}
          </button>
        </div>
      )}
    </figure>
  );
}
