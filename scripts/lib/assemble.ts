import { SERIES_KEYS, type MarketData, type SeriesKey } from "../../src/lib/market-data.ts";
import { monthRange, type Month } from "./months.ts";
import type { MonthlySeries, SourceInfo } from "./series.ts";

export interface AssembleInput {
  /** null = source intentionally skipped (e.g. no ARAD key). */
  series: Record<SeriesKey, MonthlySeries | null>;
  info: Record<SeriesKey, SourceInfo>;
  /** Months after this one are still running and are dropped. */
  lastCompleteMonth: Month;
  generatedAt: string;
}

/** Series that define where the dataset starts: without FX and CPI nothing can be computed. */
const START_KEYS: SeriesKey[] = ["usdCzk", "cpi", "sp500"];

/** Max plausible month-over-month change; bigger jumps are reported for a manual look. */
const JUMP_LIMITS: Record<SeriesKey, { relative?: number; absolute?: number }> = {
  usdCzk: { relative: 0.15 },
  cpi: { relative: 0.05 },
  sp500: { relative: 0.35 },
  gold: { relative: 0.25 },
  btc: { relative: 0.75 },
  savingsRate: { absolute: 2 },
};

const round = (value: number) => Math.round(value * 1e4) / 1e4;

function sortedMonths(series: MonthlySeries): Month[] {
  return [...series.keys()].sort();
}

/**
 * Aligns all series on one monthly axis.
 * - start = latest first month of FX, CPI and S&P 500 (the minimum needed for a useful comparison)
 * - end = earliest last month across all available series, so every asset has a value at the end
 * - an asset may start later (Bitcoin) and has null before that
 * - a missing month inside a series is an error: we never fill gaps
 */
export function assembleMarketData(input: AssembleInput): { data: MarketData; warnings: string[] } {
  const warnings: string[] = [];
  const trimmed = {} as Record<SeriesKey, MonthlySeries | null>;

  for (const key of SERIES_KEYS) {
    const source = input.series[key];
    trimmed[key] = source
      ? new Map([...source].filter(([month]) => month <= input.lastCompleteMonth))
      : null;
    if (trimmed[key]?.size === 0) throw new Error(`[${input.info[key].name}] no complete months`);
  }

  for (const key of START_KEYS) {
    if (!trimmed[key]) throw new Error(`Series "${key}" is required`);
  }

  const firstMonth = START_KEYS.map((key) => sortedMonths(trimmed[key]!)[0]).sort().at(-1)!;
  const available = SERIES_KEYS.filter((key) => trimmed[key]);
  const lastMonth = available.map((key) => sortedMonths(trimmed[key]!).at(-1)!).sort()[0];
  if (lastMonth < firstMonth) throw new Error(`Empty dataset: last month ${lastMonth} < first month ${firstMonth}`);

  const months = monthRange(firstMonth, lastMonth);
  const series = {} as MarketData["series"];
  const sources = {} as MarketData["sources"];

  for (const key of SERIES_KEYS) {
    const source = trimmed[key];
    const info = input.info[key];
    if (!source) {
      series[key] = months.map(() => null);
      sources[key] = { ...info, available: false, firstMonth: null, lastMonth: null };
      continue;
    }

    const seriesStart = sortedMonths(source)[0];
    const missing: Month[] = [];
    series[key] = months.map((month) => {
      const point = source.get(month);
      if (!point) {
        if (month >= seriesStart) missing.push(month);
        return null;
      }
      return round(point.value);
    });
    if (missing.length > 0) {
      throw new Error(`[${info.name}] missing months inside the series: ${missing.slice(0, 12).join(", ")}`);
    }

    const values = series[key];
    const firstIndex = values.findIndex((v) => v !== null);
    if (firstIndex === -1) {
      // The series ends before the dataset starts, e.g. a discontinued source.
      throw new Error(`[${info.name}] has no data between ${firstMonth} and ${lastMonth}`);
    }
    for (let i = firstIndex + 1; i < values.length; i++) {
      const prev = values[i - 1]!;
      const curr = values[i]!;
      const limit = JUMP_LIMITS[key];
      const relative = Math.abs(curr / prev - 1);
      const absolute = Math.abs(curr - prev);
      if ((limit.relative && relative > limit.relative) || (limit.absolute && absolute > limit.absolute)) {
        warnings.push(`${key}: ${months[i - 1]} → ${months[i]} changed from ${prev} to ${curr}`);
      }
    }

    sources[key] = { ...info, available: true, firstMonth: months[firstIndex], lastMonth };
  }

  for (const key of ["usdCzk", "cpi"] as const) {
    if (series[key][0] === null) throw new Error(`Series "${key}" must cover the first month ${firstMonth}`);
  }

  return {
    data: { generatedAt: input.generatedAt, firstMonth, lastMonth, months, series, sources },
    warnings,
  };
}

/** Pretty JSON, but arrays of plain values stay on one line so the file is short and diffs are readable. */
export function formatMarketJson(data: MarketData): string {
  return (
    JSON.stringify(data, null, 2).replace(/\[\s+([^[\]{}]*?)\s+\]/g, (_, inner: string) =>
      `[${inner.split(/,\s+/).join(", ")}]`,
    ) + "\n"
  );
}
