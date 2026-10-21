import { describe, expect, it } from "vitest";
import type { AssetId } from "./assets";
import type { AvailableAssetResult, SimulationResult } from "./calc";
import { chartRows, chartSeries, dominantAsset, formatTick, timeTicks } from "./chart-data";

function asset(id: AssetId, values: number[]): AvailableAssetResult {
  const finalValue = values.at(-1)!;
  return {
    id,
    available: true,
    values,
    invested: 300,
    finalValue,
    profit: finalValue - 300,
    profitPct: 0,
    xirr: null,
    maxDrawdown: { depth: 0, peakIndex: 0, troughIndex: 0 },
  };
}

function result(assets: SimulationResult["assets"]): SimulationResult {
  return {
    months: ["2020-01", "2020-02", "2020-03"],
    real: false,
    investedOverTime: [100, 200, 300],
    totalInvested: 300,
    assets,
    savingsRateSource: null,
  };
}

describe("dominantAsset", () => {
  it("flags an asset whose peak is 3× above everything else", () => {
    const r = result([asset("sp500", [100, 220, 350]), asset("btc", [100, 2000, 1500])]);
    expect(dominantAsset(r)).toBe("btc"); // peak 2000 vs. next 350
  });

  it("does not flag assets that are merely ahead", () => {
    const r = result([asset("sp500", [100, 220, 350]), asset("btc", [100, 500, 900])]);
    expect(dominantAsset(r)).toBeNull(); // 900 < 3 · 350
  });

  it("compares against the invested line too", () => {
    const r = result([asset("cash", [100, 200, 300]), asset("btc", [100, 400, 800])]);
    expect(dominantAsset(r)).toBeNull(); // 800 < 3 · 300
  });

  it("needs at least two assets", () => {
    expect(dominantAsset(result([asset("btc", [100, 5000, 9000])]))).toBeNull();
  });
});

describe("chartSeries / chartRows", () => {
  const r = result([
    asset("gold", [100, 210, 320]),
    asset("sp500", [100, 220, 350]),
    { id: "btc", available: false, availableFrom: "2014-12" },
  ]);

  it("orders assets by final value, skips unavailable ones and ends with the dashed invested line", () => {
    expect(chartSeries(r).map((s) => [s.key, s.dashed])).toEqual([
      ["sp500", false],
      ["gold", false],
      ["invested", true],
    ]);
  });

  it("leaves hidden assets out", () => {
    expect(chartSeries(r, ["sp500"]).map((s) => s.key)).toEqual(["gold", "invested"]);
  });

  it("builds one row per month with rounded values", () => {
    const rows = chartRows(r, chartSeries(r));
    expect(rows).toHaveLength(3);
    expect(rows[1]).toEqual({ month: "2020-02", sp500: 220, gold: 210, invested: 200 });
  });
});

describe("time axis", () => {
  const months = (from: number, to: number) =>
    Array.from({ length: (to - from + 1) * 12 }, (_, i) => `${from + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`);

  it("uses Januaries, thinned to the maximum count", () => {
    expect(timeTicks(months(2015, 2018))).toEqual(["2015-01", "2016-01", "2017-01", "2018-01"]);
    expect(timeTicks(months(2000, 2026), 6)).toEqual(["2000-01", "2005-01", "2010-01", "2015-01", "2020-01", "2025-01"]);
  });

  it("falls back to first and last month for short periods", () => {
    expect(timeTicks(["2026-03", "2026-04", "2026-05"])).toEqual(["2026-03", "2026-05"]);
  });

  it("labels Januaries with the year only", () => {
    expect(formatTick("2015-01")).toBe("2015");
    expect(formatTick("2026-03")).toBe("3/2026");
  });
});
