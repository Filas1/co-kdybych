// Shape of src/data/market.json, produced by scripts/fetch-data.ts and read by the app.

export const SERIES_KEYS = ["usdCzk", "cpi", "sp500", "gold", "btc", "savingsRate"] as const;
export type SeriesKey = (typeof SERIES_KEYS)[number];

export interface SourceInfo {
  name: string;
  url: string;
  note: string;
  /** False when the series could not be downloaded (e.g. savings rates without an ARAD key). */
  available: boolean;
  /** First/last month with a value inside the dataset range, null when unavailable. */
  firstMonth: string | null;
  lastMonth: string | null;
}

export interface MarketData {
  /** ISO timestamp of the download. */
  generatedAt: string;
  /** First and last month of the dataset ("YYYY-MM"); values are as of the end of each month. */
  firstMonth: string;
  lastMonth: string;
  months: string[];
  /**
   * Aligned with `months`; null where a series has no data yet (e.g. Bitcoin before 2014-12).
   * usdCzk: CZK per USD; cpi: index (2015 = 100); sp500, gold, btc: USD prices;
   * savingsRate: % p.a.
   */
  series: Record<SeriesKey, (number | null)[]>;
  sources: Record<SeriesKey, SourceInfo>;
}
