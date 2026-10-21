// Turns a simulation result into rows and series for the line chart. Pure, so it is unit-tested
// and shared by the on-page chart and the share image.

import { brand } from "@/brand.config";
import { ASSETS, type AssetId } from "./assets";
import type { AvailableAssetResult, SimulationResult } from "./calc";

export type SeriesKey = AssetId | "invested";

export interface ChartSeries {
  key: SeriesKey;
  label: string;
  color: string;
  dashed: boolean;
}

export type ChartRow = { month: string } & Partial<Record<SeriesKey, number>>;

/** An asset whose peak is this many times above every other line squashes them into the floor. */
export const DOMINANCE_RATIO = 3;

const peak = (values: number[]) => values.reduce((max, v) => (v > max ? v : max), 0);

function availableAssets(result: SimulationResult): AvailableAssetResult[] {
  return result.assets.filter((a): a is AvailableAssetResult => a.available);
}

/**
 * The asset that would flatten all other lines (its peak ≥ DOMINANCE_RATIO × the next highest
 * peak, including the "invested" line), or null. In practice this is Bitcoin.
 */
export function dominantAsset(result: SimulationResult): AssetId | null {
  const peaks = availableAssets(result)
    .map((a) => ({ id: a.id, peak: peak(a.values) }))
    .sort((a, b) => b.peak - a.peak);
  if (peaks.length < 2) return null;
  const nextHighest = Math.max(peaks[1].peak, peak(result.investedOverTime));
  return peaks[0].peak >= DOMINANCE_RATIO * nextHighest ? peaks[0].id : null;
}

/**
 * Series to draw, ordered by final value (highest first, as in the legend), with the dashed
 * "invested" line last. Hidden assets are left out.
 */
export function chartSeries(result: SimulationResult, hidden: AssetId[] = []): ChartSeries[] {
  const assets = availableAssets(result)
    .filter((a) => !hidden.includes(a.id))
    .sort((a, b) => b.finalValue - a.finalValue)
    .map((a) => ({ key: a.id, label: ASSETS[a.id].label, color: brand.assetColors[a.id], dashed: false }));
  return [...assets, { key: "invested", label: "Vloženo", color: brand.investedColor, dashed: true }];
}

/** One row per month with whole-crown values for each series. */
export function chartRows(result: SimulationResult, series: ChartSeries[]): ChartRow[] {
  const byKey = new Map<SeriesKey, number[]>([["invested", result.investedOverTime]]);
  for (const asset of availableAssets(result)) byKey.set(asset.id, asset.values);

  return result.months.map((month, i) => {
    const row: ChartRow = { month };
    for (const s of series) {
      const values = byKey.get(s.key);
      if (values) row[s.key] = Math.round(values[i]);
    }
    return row;
  });
}

/**
 * X-axis ticks: Januaries, thinned so there are at most `maxTicks`. Periods without a January
 * (shorter than a year) just show the first and last month.
 */
export function timeTicks(months: string[], maxTicks = 6): string[] {
  const januaries = months.filter((m) => m.endsWith("-01"));
  if (januaries.length === 0) return months.length > 1 ? [months[0], months.at(-1)!] : [...months];
  const step = Math.ceil(januaries.length / maxTicks);
  return januaries.filter((_, i) => i % step === 0);
}

/** "2015-01" → "2015"; other months → "3/2026". */
export function formatTick(month: string): string {
  return month.endsWith("-01") ? month.slice(0, 4) : `${Number(month.slice(5, 7))}/${month.slice(0, 4)}`;
}
