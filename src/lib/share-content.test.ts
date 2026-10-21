import { describe, expect, it } from "vitest";
import type { AssetId } from "./assets";
import type { AvailableAssetResult, SimulationResult } from "./calc";
import { DEFAULT_INPUTS } from "./inputs";
import { fitFontSize, heroFontSize, shareContent } from "./share-content";

const NBSP = " ";

function asset(id: AssetId, finalValue: number, depth = 0): AvailableAssetResult {
  return {
    id,
    available: true,
    values: [finalValue],
    invested: 282000,
    finalValue,
    profit: finalValue - 282000,
    profitPct: (finalValue - 282000) / 282000,
    xirr: null,
    maxDrawdown: { depth, peakIndex: 0, troughIndex: 0 },
  };
}

function result(assets: SimulationResult["assets"], real = false): SimulationResult {
  return { months: ["2015-01", "2026-09"], real, investedOverTime: [2000, 282000], totalInvested: 282000, assets, savingsRateSource: null };
}

describe("shareContent", () => {
  it("puts the winner's value in the big number and names the scenario", () => {
    const content = shareContent(result([asset("sp500", 676828, 0.16), asset("gold", 684114, 0.19)]), DEFAULT_INPUTS)!;
    expect(content.asset).toBe("gold");
    expect(content.hero).toBe(`684${NBSP}114${NBSP}Kč`);
    expect(content.scenario).toBe(`2${NBSP}000${NBSP}Kč měsíčně do zlata od ledna 2015`);
    expect(content.details).toBe(`Vloženo 282${NBSP}000${NBSP}Kč · +142,6${NBSP}%`);
    expect(content.hook).toMatch(/^Nejvíc vydělalo zlato/);
  });

  it("describes a one-off deposit and marks today's crowns", () => {
    const content = shareContent(result([asset("btc", 900000, 0.7)], true), { ...DEFAULT_INPUTS, monthly: 0, initial: 50000 })!;
    expect(content.scenario).toBe(`50${NBSP}000${NBSP}Kč jednorázově do Bitcoinu od ledna 2015`);
    expect(content.details.startsWith("V dnešních korunách. ")).toBe(true);
  });

  it("combines a one-off deposit with monthly investing", () => {
    const content = shareContent(result([asset("cash", 282000)]), { ...DEFAULT_INPUTS, initial: 10000 })!;
    expect(content.scenario).toBe(`10${NBSP}000${NBSP}Kč hned a 2${NBSP}000${NBSP}Kč měsíčně pod polštář od ledna 2015`);
  });

  it("returns null when nothing could be computed", () => {
    expect(shareContent(result([{ id: "btc", available: false, availableFrom: "2014-12" }]), DEFAULT_INPUTS)).toBeNull();
  });
});

describe("heroFontSize / fitFontSize", () => {
  it("guesses smaller sizes for longer numbers and caps short ones", () => {
    expect(heroFontSize("676 828 Kč", 888)).toBe(170);
    expect(heroFontSize("11 625 694 Kč", 888)).toBe(131);
    expect(heroFontSize("500 Kč", 888)).toBe(190);
  });

  it("corrects the guess from the measured width", () => {
    expect(fitFontSize(119, 652, 888)).toBe(162); // too small → grow
    expect(fitFontSize(150, 1000, 888)).toBe(133); // overflowing → shrink
    expect(fitFontSize(150, 400, 888)).toBe(190); // capped
  });
});
