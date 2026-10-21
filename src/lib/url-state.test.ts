import { describe, expect, it } from "vitest";
import { DEFAULT_INPUTS, type CalculatorInputs } from "./inputs";
import type { MarketData } from "./market-data";
import { parseInputs, serializeInputs } from "./url-state";

const data = { firstMonth: "1999-12", lastMonth: "2026-09" } as MarketData;
const parse = (query: string) => parseInputs(new URLSearchParams(query), data);

describe("serializeInputs", () => {
  it("writes short, readable params", () => {
    expect(serializeInputs(DEFAULT_INPUTS, false)).toBe(
      "mesicne=2000&od=2015-01&aktiva=sp500,zlato,bitcoin,sporak,hotovost",
    );
  });

  it("adds the optional params only when they matter", () => {
    const inputs: CalculatorInputs = { ...DEFAULT_INPUTS, initial: 50000, real: true, savingsRate: 2.5 };
    expect(serializeInputs(inputs, true)).toBe(
      "mesicne=2000&vklad=50000&od=2015-01&aktiva=sp500,zlato,bitcoin,sporak,hotovost&realne=1&sazba=2.5",
    );
    expect(serializeInputs({ ...inputs, assets: ["sp500"] }, true)).not.toContain("sazba");
  });

  it("round-trips through parseInputs", () => {
    const inputs: CalculatorInputs = {
      monthly: 1500,
      initial: 10000,
      start: "2010-06",
      assets: ["gold", "savings"],
      real: true,
      savingsRate: 3.25,
    };
    expect(parse(serializeInputs(inputs, true))).toEqual(inputs);
  });
});

describe("parseInputs", () => {
  it("uses defaults for an empty query", () => {
    expect(parse("")).toEqual(DEFAULT_INPUTS);
  });

  it("ignores broken values field by field", () => {
    expect(parse("mesicne=abc&od=2015-13&aktiva=nic&sazba=-1&realne=ano")).toEqual(DEFAULT_INPUTS);
    expect(parse("mesicne=99999999999")).toEqual(DEFAULT_INPUTS);
  });

  it("clamps the start month into the data range", () => {
    expect(parse("od=1990-01").start).toBe("1999-12");
    expect(parse("od=2030-01").start).toBe("2026-09");
  });

  it("accepts asset slugs in any order and case, de-duplicated, in canonical order", () => {
    expect(parse("aktiva=Bitcoin,sp500,bitcoin,gold").assets).toEqual(["sp500", "gold", "btc"]);
  });

  it("accepts a decimal comma in the savings rate", () => {
    expect(parse("sazba=2,75").savingsRate).toBe(2.75);
  });
});
