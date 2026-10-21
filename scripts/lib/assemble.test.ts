import { describe, expect, it } from "vitest";
import { SERIES_KEYS, type SeriesKey } from "../../src/lib/market-data.ts";
import { assembleMarketData, formatMarketJson } from "./assemble.ts";
import { monthRange } from "./months.ts";
import type { MonthlySeries, SourceInfo } from "./series.ts";

function series(from: string, to: string, value = 10): MonthlySeries {
  return new Map(monthRange(from, to).map((m) => [m, { value }]));
}

const info = Object.fromEntries(
  SERIES_KEYS.map((key) => [key, { name: key, url: "https://example.com", note: "" }]),
) as Record<SeriesKey, SourceInfo>;

function input(overrides: Partial<Record<SeriesKey, MonthlySeries | null>> = {}) {
  return {
    series: {
      usdCzk: series("2014-01", "2026-10"),
      cpi: series("2014-01", "2026-09"),
      sp500: series("2015-01", "2026-10"),
      gold: series("2010-01", "2026-09"),
      btc: series("2015-06", "2026-10"),
      savingsRate: null,
      ...overrides,
    },
    info,
    lastCompleteMonth: "2026-09",
    generatedAt: "2026-10-21T00:00:00.000Z",
  };
}

describe("assembleMarketData", () => {
  it("starts where FX, CPI and S&P all exist and ends at the earliest last month", () => {
    const { data } = assembleMarketData(input({ gold: series("2010-01", "2026-08") }));
    expect(data.firstMonth).toBe("2015-01");
    expect(data.lastMonth).toBe("2026-08");
    expect(data.months[0]).toBe("2015-01");
    expect(data.months.at(-1)).toBe("2026-08");
    expect(data.series.usdCzk).toHaveLength(data.months.length);
  });

  it("drops the running month", () => {
    const { data } = assembleMarketData(input({ gold: series("2010-01", "2026-10") }));
    expect(data.lastMonth).toBe("2026-09");
  });

  it("pads late-starting assets with null and records where they start", () => {
    const { data } = assembleMarketData(input());
    const btc = data.series.btc;
    expect(btc.slice(0, 5)).toEqual([null, null, null, null, null]);
    expect(btc[5]).toBe(10);
    expect(data.sources.btc.firstMonth).toBe("2015-06");
  });

  it("marks skipped sources as unavailable", () => {
    const { data } = assembleMarketData(input());
    expect(data.sources.savingsRate.available).toBe(false);
    expect(data.series.savingsRate.every((v) => v === null)).toBe(true);
  });

  it("never fills gaps inside a series", () => {
    const gappy = series("2014-01", "2026-09");
    gappy.delete("2020-03");
    expect(() => assembleMarketData(input({ cpi: gappy }))).toThrow(/missing months.*2020-03/);
  });

  it("reports suspicious jumps as warnings", () => {
    const fx = series("2014-01", "2026-09");
    fx.set("2020-03", { value: 20 });
    const { warnings } = assembleMarketData(input({ usdCzk: fx }));
    expect(warnings).toHaveLength(2); // up in 2020-03 and back down in 2020-04
  });
});

describe("formatMarketJson", () => {
  it("keeps value arrays on one line and stays valid JSON", () => {
    const { data } = assembleMarketData(input());
    const json = formatMarketJson(data);
    expect(json).toContain('"months": ["2015-01", "2015-02"');
    expect(JSON.parse(json)).toEqual(data);
  });
});
