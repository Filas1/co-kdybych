// What the user can set in the form, its defaults and limits, and how it maps to the simulation.

import { ASSET_IDS, type AssetId } from "./assets";
import type { SimulationInput } from "./calc";
import { formatCzk } from "./format";
import type { MarketData } from "./market-data";

export interface CalculatorInputs {
  /** CZK per month. */
  monthly: number;
  /** Optional one-off CZK deposit in the first month. */
  initial: number;
  /** "YYYY-MM" */
  start: string;
  assets: AssetId[];
  /** true = today's crowns (inflation-adjusted). */
  real: boolean;
  /** % p.a., used only while the data contain no ČNB savings rates. An estimate, shown as such. */
  savingsRate: number;
}

export const DEFAULT_INPUTS: CalculatorInputs = {
  monthly: 2000,
  initial: 0,
  start: "2015-01",
  assets: [...ASSET_IDS],
  real: false,
  savingsRate: 2,
};

export const LIMITS = {
  monthlyMax: 1_000_000,
  initialMax: 100_000_000,
  savingsRateMax: 20,
} as const;

export type InputField = "amount" | "assets" | "savingsRate";

export interface InputError {
  field: InputField;
  message: string;
}

/** Czech, friendly error messages; an empty list means the inputs can be simulated. */
export function validateInputs(inputs: CalculatorInputs): InputError[] {
  const errors: InputError[] = [];
  if (inputs.monthly <= 0 && inputs.initial <= 0) {
    errors.push({ field: "amount", message: "Zadej měsíční částku nebo jednorázový vklad." });
  }
  if (inputs.monthly > LIMITS.monthlyMax) {
    errors.push({ field: "amount", message: `Měsíčně můžeš zadat nejvýš ${formatCzk(LIMITS.monthlyMax)}.` });
  }
  if (inputs.initial > LIMITS.initialMax) {
    errors.push({ field: "amount", message: `Jednorázový vklad může být nejvýš ${formatCzk(LIMITS.initialMax)}.` });
  }
  if (inputs.assets.length === 0) {
    errors.push({ field: "assets", message: "Vyber aspoň jedno aktivum." });
  }
  if (!(inputs.savingsRate >= 0 && inputs.savingsRate <= LIMITS.savingsRateMax)) {
    errors.push({ field: "savingsRate", message: `Sazba musí být mezi 0 a ${LIMITS.savingsRateMax} %.` });
  }
  return errors;
}

/** Keeps the start month inside the data range (e.g. after the data were refreshed). */
export function clampStart(start: string, data: MarketData): string {
  if (start < data.firstMonth) return data.firstMonth;
  if (start > data.lastMonth) return data.lastMonth;
  return start;
}

/** Years offered in the start picker. */
export function startYears(data: MarketData): number[] {
  const first = Number(data.firstMonth.slice(0, 4));
  const last = Number(data.lastMonth.slice(0, 4));
  return Array.from({ length: last - first + 1 }, (_, i) => first + i);
}

/** Month numbers (1–12) available in a given year of the data. */
export function startMonthsInYear(year: number, data: MarketData): number[] {
  return Array.from({ length: 12 }, (_, i) => i + 1).filter((m) => {
    const key = `${year}-${String(m).padStart(2, "0")}`;
    return key >= data.firstMonth && key <= data.lastMonth;
  });
}

/** Changes the year and moves the month into range if the new year is shorter (first/last year). */
export function withStartYear(start: string, year: number, data: MarketData): string {
  return clampStart(`${year}-${start.slice(5, 7)}`, data);
}

export function toSimulationInput(inputs: CalculatorInputs, data: MarketData): SimulationInput {
  return {
    monthlyAmount: inputs.monthly,
    initialDeposit: inputs.initial,
    startMonth: clampStart(inputs.start, data),
    assets: inputs.assets,
    real: inputs.real,
    savingsRateFallback: inputs.savingsRate,
  };
}
