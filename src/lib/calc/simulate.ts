import { ASSETS, type AssetId } from "../assets";
import type { MarketData } from "../market-data";
import { maxDrawdown } from "./drawdown";
import type { AssetResult, SimulationInput, SimulationResult } from "./types";
import { xirr, yearsBetween } from "./xirr";

/** Last day of a "YYYY-MM" month, as a UTC date (all flows happen at month end). */
export function monthEnd(month: string): Date {
  const [year, m] = month.split("-").map(Number);
  return new Date(Date.UTC(year, m, 0)); // day 0 of the next month = last day of this one
}

interface NominalPath {
  /** Portfolio value in nominal CZK at the end of each month. */
  values: number[];
  /** Value of one unit in nominal CZK (price, or an interest index) – used for drawdown. */
  unitValues: number[];
}

/**
 * Regular investing into a USD-priced asset. Each month the CZK deposit is converted with that
 * month's USD/CZK rate and buys units at that month's price; the holding is then valued with the
 * current price and rate.
 */
function pricedAssetPath(pricesUsd: number[], usdCzk: number[], deposits: number[]): NominalPath {
  let units = 0;
  const values: number[] = [];
  const unitValues: number[] = [];
  for (let i = 0; i < deposits.length; i++) {
    const priceCzk = pricesUsd[i] * usdCzk[i];
    units += deposits[i] / priceCzk;
    values.push(units * priceCzk);
    unitValues.push(priceCzk);
  }
  return { values, unitValues };
}

/**
 * Savings account with monthly compounding: the balance from the end of last month earns this
 * month's yearly rate / 12, then the new deposit is added.
 */
function savingsPath(ratesPctPa: number[], deposits: number[]): NominalPath {
  let balance = 0;
  let index = 1;
  const values: number[] = [];
  const unitValues: number[] = [];
  for (let i = 0; i < deposits.length; i++) {
    const growth = i === 0 ? 1 : 1 + ratesPctPa[i] / 100 / 12;
    balance = balance * growth + deposits[i];
    index *= growth;
    values.push(balance);
    unitValues.push(index);
  }
  return { values, unitValues };
}

/** Cash under the pillow: nothing happens to it, nominally. */
function cashPath(deposits: number[]): NominalPath {
  let total = 0;
  const values = deposits.map((d) => (total += d));
  return { values, unitValues: deposits.map(() => 1) };
}

function validate(data: MarketData, input: SimulationInput): number {
  const { monthlyAmount, initialDeposit, startMonth } = input;
  for (const [name, value] of [["monthlyAmount", monthlyAmount], ["initialDeposit", initialDeposit]] as const) {
    if (!Number.isFinite(value) || value < 0) throw new RangeError(`${name} must be a non-negative number`);
  }
  if (monthlyAmount + initialDeposit <= 0) throw new RangeError("Nothing to invest");
  const startIndex = data.months.indexOf(startMonth);
  if (startIndex === -1) {
    throw new RangeError(`startMonth ${startMonth} is outside the data (${data.firstMonth} – ${data.lastMonth})`);
  }
  return startIndex;
}

/**
 * Simulates regular monthly investing from `startMonth` to the last month in the data.
 *
 * In "today's crowns" mode (real = true), every amount at month t is multiplied by
 * CPI(last month) / CPI(t). Deposits and values are then all in the same purchasing power, so a
 * profit means you can really buy more than you put in.
 */
export function simulate(data: MarketData, input: SimulationInput): SimulationResult {
  const startIndex = validate(data, input);
  const months = data.months.slice(startIndex);
  const n = months.length;
  const slice = (key: keyof MarketData["series"]) => data.series[key].slice(startIndex);

  const deposits = months.map((_, i) => input.monthlyAmount + (i === 0 ? input.initialDeposit : 0));
  const cpi = slice("cpi") as number[];
  const usdCzk = slice("usdCzk") as number[];
  const factor = cpi.map((value) => (input.real ? cpi[n - 1] / value : 1));

  const realDeposits = deposits.map((d, i) => d * factor[i]);
  let cumulative = 0;
  const investedOverTime = realDeposits.map((d) => (cumulative += d));
  const totalInvested = investedOverTime[n - 1];

  const start = monthEnd(months[0]);
  const years = months.map((m) => yearsBetween(start, monthEnd(m)));

  let savingsRateSource: SimulationResult["savingsRateSource"] = null;

  function nominalPath(id: AssetId): NominalPath | { availableFrom: string | null } {
    const meta = ASSETS[id];
    if (meta.priceSeries) {
      const prices = slice(meta.priceSeries);
      if (prices[0] === null) return { availableFrom: data.sources[meta.priceSeries].firstMonth };
      return pricedAssetPath(prices as number[], usdCzk, deposits);
    }
    if (id === "savings") {
      if (data.sources.savingsRate.available) {
        const rates = slice("savingsRate");
        if (rates[0] === null) return { availableFrom: data.sources.savingsRate.firstMonth };
        savingsRateSource = "cnb";
        return savingsPath(rates as number[], deposits);
      }
      if (input.savingsRateFallback === undefined) return { availableFrom: null };
      savingsRateSource = "custom";
      return savingsPath(months.map(() => input.savingsRateFallback!), deposits);
    }
    return cashPath(deposits);
  }

  const assets: AssetResult[] = input.assets.map((id) => {
    const path = nominalPath(id);
    if (!("values" in path)) return { id, available: false, availableFrom: path.availableFrom };

    const values = path.values.map((v, i) => v * factor[i]);
    const finalValue = values[n - 1];
    const profit = finalValue - totalInvested;
    const flows = [
      ...realDeposits.map((amount, i) => ({ years: years[i], amount: -amount })),
      { years: years[n - 1], amount: finalValue },
    ];
    return {
      id,
      available: true,
      values,
      invested: totalInvested,
      finalValue,
      profit,
      profitPct: profit / totalInvested,
      xirr: xirr(flows),
      maxDrawdown: maxDrawdown(path.unitValues.map((u, i) => u * factor[i])),
    };
  });

  return { months, real: input.real, investedOverTime, totalInvested, assets, savingsRateSource };
}
