import type { AssetId } from "../assets";

export interface SimulationInput {
  /** CZK invested at the end of every month, including the first and the last one. */
  monthlyAmount: number;
  /** Optional one-off CZK deposit added in the first month. */
  initialDeposit: number;
  /** First month of investing ("YYYY-MM"). The end is always the last month in the data. */
  startMonth: string;
  assets: AssetId[];
  /** true = everything expressed in today's crowns (prices of the last month), false = nominal CZK. */
  real: boolean;
  /**
   * Savings rate in % p.a. used only when the data contain no savings rates (no ARAD download).
   * Without it the savings account is reported as unavailable.
   */
  savingsRateFallback?: number;
}

export interface Drawdown {
  /** Biggest fall from a previous peak, as a fraction (0.5 = 50 % below the peak). */
  depth: number;
  /** Indices into SimulationResult.months. Equal when there was no fall at all. */
  peakIndex: number;
  troughIndex: number;
}

export interface AvailableAssetResult {
  id: AssetId;
  available: true;
  /** Portfolio value at the end of each month (CZK, nominal or in today's crowns). */
  values: number[];
  /** Total deposited (same units as values). */
  invested: number;
  finalValue: number;
  profit: number;
  /** profit / invested, as a fraction. */
  profitPct: number;
  /** Money-weighted annual return (XIRR) as a fraction; null when undefined (e.g. a single month). */
  xirr: number | null;
  /** Measured on the value of one unit (price in CZK), so new deposits do not hide the fall. */
  maxDrawdown: Drawdown;
}

export interface UnavailableAssetResult {
  id: AssetId;
  available: false;
  /** First month this asset has data for; null when there are no data at all. */
  availableFrom: string | null;
}

export type AssetResult = AvailableAssetResult | UnavailableAssetResult;

export interface SimulationResult {
  /** From the start month to the last month of data, inclusive. */
  months: string[];
  real: boolean;
  /** Cumulative deposits at the end of each month (same units as asset values). */
  investedOverTime: number[];
  totalInvested: number;
  assets: AssetResult[];
  /** Where the savings rate came from: ČNB data, the user's own rate, or not computed. */
  savingsRateSource: "cnb" | "custom" | null;
}
