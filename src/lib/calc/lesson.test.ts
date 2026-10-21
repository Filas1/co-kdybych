import { describe, expect, it } from "vitest";
import type { AssetId } from "../assets";
import { lessonSentence } from "./lesson";
import type { AvailableAssetResult, SimulationResult } from "./types";

const NBSP = " ";

function asset(id: AssetId, invested: number, finalValue: number, drawdown = 0): AvailableAssetResult {
  const profit = finalValue - invested;
  return {
    id,
    available: true,
    values: [finalValue],
    invested,
    finalValue,
    profit,
    profitPct: profit / invested,
    xirr: null,
    maxDrawdown: { depth: drawdown, peakIndex: 0, troughIndex: 0 },
  };
}

function result(assets: SimulationResult["assets"], real = false): SimulationResult {
  return { months: ["2020-01"], real, investedOverTime: [100000], totalInvested: 100000, assets, savingsRateSource: null };
}

describe("lessonSentence", () => {
  it("warns about the drawdown of a winner that fell a lot (gender-aware verbs)", () => {
    expect(lessonSentence(result([asset("sp500", 100000, 250000, 0.2), asset("btc", 100000, 900000, 0.834)]))).toBe(
      `Nejvíc vydělal Bitcoin, ale cestou spadl až o 83${NBSP}% pod svůj vrchol.`,
    );
    expect(lessonSentence(result([asset("gold", 100000, 200000, 0.45)]))).toBe(
      `Nejvíc vydělalo zlato, ale cestou spadlo až o 45${NBSP}% pod svůj vrchol.`,
    );
  });

  it("shows what inflation did to cash in today's crowns", () => {
    const sentence = lessonSentence(
      result([asset("sp500", 100000, 180000, 0.25), asset("cash", 100000, 75000)], true),
    );
    expect(sentence).toBe(
      `Pod polštářem ti inflace sežrala 25${NBSP}000${NBSP}Kč. S&P 500 ti za stejnou dobu vydělal 80${NBSP}000${NBSP}Kč.`,
    );
  });

  it("does not talk about inflation in nominal mode", () => {
    const sentence = lessonSentence(result([asset("sp500", 100000, 180000, 0.25), asset("cash", 100000, 100000)]));
    expect(sentence).toBe(`Nejvíc vydělal S&P 500: z 100${NBSP}000${NBSP}Kč máš 180${NBSP}000${NBSP}Kč.`);
  });

  it("only cash selected, real mode → just the inflation sentence", () => {
    expect(lessonSentence(result([asset("cash", 100000, 90000)], true))).toBe(
      `Pod polštářem ti inflace sežrala 10${NBSP}000${NBSP}Kč.`,
    );
  });

  it("the savings account wins on a bad period", () => {
    const sentence = lessonSentence(result([asset("sp500", 100000, 95000, 0.2), asset("savings", 100000, 102000)]));
    expect(sentence).toBe("Tentokrát vyhrál spořicí účet. Na krátkém úseku umí trh i prodělat.");
  });

  it("nothing made money", () => {
    const sentence = lessonSentence(result([asset("sp500", 100000, 95000, 0.2), asset("cash", 100000, 100000)]));
    expect(sentence).toBe("Tohle období se nepovedlo ničemu. Na krátké trati umí trh i prodělat.");
  });

  it("returns null when no selected asset has data", () => {
    expect(lessonSentence(result([{ id: "btc", available: false, availableFrom: "2014-12" }]))).toBeNull();
  });
});
