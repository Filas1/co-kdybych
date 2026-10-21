// Sanity checks on the real downloaded data. Exact numbers change with every data refresh,
// so these tests check rules that must always hold instead.

import { describe, expect, it } from "vitest";
import marketJson from "@/data/market.json";
import { ASSET_IDS } from "../assets";
import type { MarketData } from "../market-data";
import { lessonSentence } from "./lesson";
import { simulate } from "./simulate";
import type { AvailableAssetResult, SimulationInput } from "./types";

const data = marketJson as unknown as MarketData;

const defaults: SimulationInput = {
  monthlyAmount: 2000,
  initialDeposit: 0,
  startMonth: "2015-01",
  assets: [...ASSET_IDS],
  real: false,
  savingsRateFallback: 2,
};

const byId = (assets: ReturnType<typeof simulate>["assets"], id: string) =>
  assets.find((a) => a.id === id) as AvailableAssetResult;

describe("real market data", () => {
  it("default scenario: deposits add up, cash keeps its nominal value, all numbers are finite", () => {
    const result = simulate(data, defaults);
    expect(result.months[0]).toBe("2015-01");
    expect(result.months.at(-1)).toBe(data.lastMonth);
    expect(result.totalInvested).toBe(2000 * result.months.length);
    expect(byId(result.assets, "cash").finalValue).toBe(result.totalInvested);

    for (const asset of result.assets) {
      expect(asset.available).toBe(true);
      const a = asset as AvailableAssetResult;
      expect(a.values.every(Number.isFinite)).toBe(true);
      expect(Number.isFinite(a.xirr)).toBe(true);
      expect(a.maxDrawdown.depth).toBeGreaterThanOrEqual(0);
      expect(a.maxDrawdown.depth).toBeLessThan(1);
    }
    expect(lessonSentence(result)).toBeTruthy();
  });

  it("prices rose since 2015, so cash under the pillow lost value in today's crowns", () => {
    const result = simulate(data, { ...defaults, real: true });
    expect(byId(result.assets, "cash").profit).toBeLessThan(0);
    expect(result.totalInvested).toBeGreaterThan(2000 * result.months.length);
  });

  it("Bitcoin is not computed for a start before its first price", () => {
    const result = simulate(data, { ...defaults, startMonth: "2010-01" });
    expect(result.assets.find((a) => a.id === "btc")).toEqual({
      id: "btc",
      available: false,
      availableFrom: data.sources.btc.firstMonth,
    });
  });
});
