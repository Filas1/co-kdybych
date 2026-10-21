import { isMonth, type Month } from "./months.ts";

export interface MonthlyPoint {
  value: number;
  /** Actual observation date (YYYY-MM-DD) when a month-end value was picked from daily data. */
  date?: string;
}

/** One value per month, keyed by "YYYY-MM". */
export type MonthlySeries = Map<Month, MonthlyPoint>;

export interface SourceInfo {
  name: string;
  url: string;
  note: string;
}

export interface SourceResult {
  series: MonthlySeries;
  info: SourceInfo;
}

export interface DailyObservation {
  date: string; // YYYY-MM-DD
  value: number;
}

/**
 * Reduces daily observations to month-end values: for each month keep the last available day
 * (e.g. the last trading day). Input order does not matter.
 */
export function lastPerMonth(observations: DailyObservation[]): MonthlySeries {
  const sorted = [...observations].sort((a, b) => a.date.localeCompare(b.date));
  const series: MonthlySeries = new Map();
  for (const { date, value } of sorted) {
    series.set(date.slice(0, 7), { value, date });
  }
  return series;
}

/** Throws if any key is not a month or any value is not a positive finite number. */
export function assertValidSeries(source: string, series: MonthlySeries): void {
  if (series.size === 0) throw new Error(`[${source}] no data parsed`);
  for (const [month, { value }] of series) {
    if (!isMonth(month)) throw new Error(`[${source}] invalid month key "${month}"`);
    if (!Number.isFinite(value) || value <= 0) {
      throw new Error(`[${source}] invalid value ${value} for ${month}`);
    }
  }
}
