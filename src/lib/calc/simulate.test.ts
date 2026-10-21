// Small synthetic markets where every result can be checked with a calculator.

import { describe, expect, it } from "vitest";
import { SERIES_KEYS, type MarketData, type SeriesKey } from "../market-data";
import { monthEnd, simulate } from "./simulate";
import type { AvailableAssetResult, SimulationInput } from "./types";

type SeriesOverrides = Partial<Record<SeriesKey, (number | null)[]>>;

function market(months: string[], overrides: SeriesOverrides = {}): MarketData {
  const flat = (value: number) => months.map(() => value);
  const series = {
    usdCzk: flat(20),
    cpi: flat(100),
    sp500: flat(100),
    gold: flat(1000),
    btc: flat(10000),
    savingsRate: months.map(() => null),
    ...overrides,
  } as MarketData["series"];
  const sources = Object.fromEntries(
    SERIES_KEYS.map((key) => {
      const firstIndex = series[key].findIndex((v) => v !== null);
      return [
        key,
        {
          name: key,
          url: "",
          note: "",
          available: firstIndex !== -1,
          firstMonth: firstIndex === -1 ? null : months[firstIndex],
          lastMonth: firstIndex === -1 ? null : months.at(-1)!,
        },
      ];
    }),
  ) as MarketData["sources"];
  return { generatedAt: "", firstMonth: months[0], lastMonth: months.at(-1)!, months, series, sources };
}

const MONTHS_3 = ["2020-01", "2020-02", "2020-03"];

const baseInput: SimulationInput = {
  monthlyAmount: 1000,
  initialDeposit: 0,
  startMonth: "2020-01",
  assets: ["sp500"],
  real: false,
};

function asset(result: ReturnType<typeof simulate>, index = 0): AvailableAssetResult {
  const a = result.assets[index];
  if (!a.available) throw new Error(`asset ${a.id} unavailable`);
  return a;
}

describe("simulate – priced assets", () => {
  it("flat price and rate: value equals deposits, no profit, 0 % a year, no drawdown", () => {
    const result = simulate(market(MONTHS_3), baseInput);
    const sp = asset(result);
    expect(result.totalInvested).toBe(3000);
    expect(result.investedOverTime).toEqual([1000, 2000, 3000]);
    expect(sp.values).toEqual([1000, 2000, 3000]);
    expect(sp.profit).toBe(0);
    expect(sp.xirr).toBeCloseTo(0, 9);
    expect(sp.maxDrawdown.depth).toBe(0);
  });

  it("price doubles in the last month: 1.25 units × 200 USD × 20 = 5 000 Kč", () => {
    // Each 1 000 Kč buys 1000 / (100 · 20) = 0.5 units in the first two months and 0.25 in the last.
    const result = simulate(market(MONTHS_3, { sp500: [100, 100, 200] }), baseInput);
    const sp = asset(result);
    expect(sp.values).toEqual([1000, 2000, 5000]);
    expect(sp.finalValue).toBe(5000);
    expect(sp.profit).toBe(2000);
    expect(sp.profitPct).toBeCloseTo(2 / 3, 12);
  });

  it("converts each deposit at that month's USD/CZK rate", () => {
    // Month 1: 1000 / (100 · 20) = 0.5 units, month 2: 1000 / (100 · 25) = 0.4 units.
    // Value at the end: 0.9 · 100 · 25 = 2 250 Kč – the weaker crown made the old units worth more.
    const result = simulate(market(["2020-01", "2020-02"], { usdCzk: [20, 25] }), baseInput);
    expect(asset(result).finalValue).toBeCloseTo(2250, 9);
  });

  it("adds the one-off deposit in the first month", () => {
    const result = simulate(market(MONTHS_3, { sp500: [100, 100, 200] }), { ...baseInput, initialDeposit: 2000 });
    // Initial 3 000 Kč buys 1.5 units, then 0.5 and 0.25 → 2.25 units · 4 000 Kč = 9 000 Kč.
    expect(result.investedOverTime).toEqual([3000, 4000, 5000]);
    expect(asset(result).finalValue).toBe(9000);
  });

  it("measures the drawdown on the unit price, not on the growing balance", () => {
    const result = simulate(market(["2020-01", "2020-02", "2020-03", "2020-04"], { sp500: [100, 50, 60, 120] }), baseInput);
    const dd = asset(result).maxDrawdown;
    expect(dd.depth).toBeCloseTo(0.5, 12);
    expect([dd.peakIndex, dd.troughIndex]).toEqual([0, 1]);
  });

  it("marks an asset unavailable when it has no price in the start month", () => {
    const data = market(MONTHS_3, { btc: [null, 10000, 12000] });
    const result = simulate(data, { ...baseInput, assets: ["btc"] });
    expect(result.assets[0]).toEqual({ id: "btc", available: false, availableFrom: "2020-02" });
    // Starting a month later, Bitcoin is fine.
    expect(simulate(data, { ...baseInput, assets: ["btc"], startMonth: "2020-02" }).assets[0].available).toBe(true);
  });

  it("starts later and ends at the last month of data", () => {
    const result = simulate(market(MONTHS_3), { ...baseInput, startMonth: "2020-02" });
    expect(result.months).toEqual(["2020-02", "2020-03"]);
    expect(result.totalInvested).toBe(2000);
  });
});

describe("simulate – savings and cash", () => {
  it("compounds monthly: 12 % p.a. = 1 % a month → 1000, 2010, 3030.10", () => {
    const data = market(MONTHS_3, { savingsRate: [12, 12, 12] });
    const result = simulate(data, { ...baseInput, assets: ["savings"] });
    const savings = asset(result);
    expect(savings.values[0]).toBe(1000);
    expect(savings.values[1]).toBeCloseTo(2010, 9);
    expect(savings.values[2]).toBeCloseTo(3030.1, 9);
    expect(result.savingsRateSource).toBe("cnb");
    expect(savings.maxDrawdown.depth).toBe(0);
  });

  it("uses each month's own rate", () => {
    const data = market(MONTHS_3, { savingsRate: [99, 12, 24] }); // the first month's rate is never used
    const savings = asset(simulate(data, { ...baseInput, assets: ["savings"] }));
    // 1000 → 1000·1.01 + 1000 = 2010 → 2010·1.02 + 1000 = 3050.2
    expect(savings.finalValue).toBeCloseTo(3050.2, 9);
  });

  it("falls back to the user's rate only when the data have no savings rates", () => {
    const data = market(MONTHS_3); // savingsRate all null → source unavailable
    const withoutRate = simulate(data, { ...baseInput, assets: ["savings"] });
    expect(withoutRate.assets[0]).toEqual({ id: "savings", available: false, availableFrom: null });

    const withRate = simulate(data, { ...baseInput, assets: ["savings"], savingsRateFallback: 12 });
    expect(asset(withRate).finalValue).toBeCloseTo(3030.1, 9);
    expect(withRate.savingsRateSource).toBe("custom");
  });

  it("cash is just the sum of deposits", () => {
    const cash = asset(simulate(market(MONTHS_3), { ...baseInput, assets: ["cash"] }));
    expect(cash.values).toEqual([1000, 2000, 3000]);
    expect(cash.profit).toBe(0);
  });
});

describe("simulate – today's crowns (inflation-adjusted)", () => {
  it("cash loses purchasing power: prices up 10 % → the first 1 000 Kč is worth 1 100 of today's", () => {
    const data = market(["2020-01", "2020-02"], { cpi: [100, 110] });
    const result = simulate(data, { ...baseInput, assets: ["cash"], real: true });
    const cash = asset(result);
    // Deposits in today's crowns: 1000 · 110/100 + 1000 = 2 100; the cash is still 2 000.
    expect(result.totalInvested).toBeCloseTo(2100, 9);
    expect(cash.finalValue).toBeCloseTo(2000, 9);
    expect(cash.profit).toBeCloseTo(-100, 9);
    expect(cash.values[0]).toBeCloseTo(1100, 9); // the first month, restated in today's prices
    expect(cash.maxDrawdown.depth).toBeCloseTo(1 - 100 / 110, 12);
  });

  it("an asset that exactly follows inflation has zero real profit", () => {
    const months = ["2020-01", "2020-02", "2020-03"];
    const data = market(months, { cpi: [100, 105, 120], sp500: [100, 105, 120] });
    const sp = asset(simulate(data, { ...baseInput, real: true }));
    expect(sp.profit).toBeCloseTo(0, 9);
    expect(sp.xirr).toBeCloseTo(0, 6);
    expect(sp.maxDrawdown.depth).toBeCloseTo(0, 12);
  });

  it("the final value is the same in both modes – only deposits are restated", () => {
    const data = market(MONTHS_3, { cpi: [100, 110, 121], sp500: [100, 120, 150] });
    const nominal = asset(simulate(data, baseInput));
    const real = asset(simulate(data, { ...baseInput, real: true }));
    expect(real.finalValue).toBeCloseTo(nominal.finalValue, 9);
    expect(real.invested).toBeGreaterThan(nominal.invested);
  });
});

describe("simulate – XIRR on real dates", () => {
  it("one deposit that grows 10 % in a year → about 10 % a year", () => {
    // 31 Jan 2021 → 31 Jan 2022 is exactly 365 days.
    const months = [...Array.from({ length: 12 }, (_, i) => `2021-${String(i + 1).padStart(2, "0")}`), "2022-01"];
    const prices = months.map((_, i) => (i === 12 ? 110 : 100));
    const data = market(months, { sp500: prices });
    // Deposit only at the start (monthly 0); the money then sits there for 365 days.
    const sp = asset(simulate(data, { ...baseInput, monthlyAmount: 0, initialDeposit: 1000, startMonth: "2021-01" }));
    expect(sp.finalValue).toBeCloseTo(1100, 9);
    expect(sp.xirr).toBeCloseTo(0.1, 6);
  });

  it("month ends are the last calendar day", () => {
    expect(monthEnd("2024-02").toISOString().slice(0, 10)).toBe("2024-02-29");
    expect(monthEnd("2015-12").toISOString().slice(0, 10)).toBe("2015-12-31");
  });
});

describe("simulate – input validation", () => {
  const data = market(MONTHS_3);

  it("rejects a start month outside the data", () => {
    expect(() => simulate(data, { ...baseInput, startMonth: "2019-12" })).toThrow(RangeError);
  });

  it("rejects negative amounts and an empty investment", () => {
    expect(() => simulate(data, { ...baseInput, monthlyAmount: -1 })).toThrow(RangeError);
    expect(() => simulate(data, { ...baseInput, monthlyAmount: 0 })).toThrow(/Nothing to invest/);
  });
});
