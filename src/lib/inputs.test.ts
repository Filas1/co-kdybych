import { describe, expect, it } from "vitest";
import type { MarketData } from "./market-data";
import {
  DEFAULT_INPUTS,
  clampStart,
  startMonthsInYear,
  startYears,
  toSimulationInput,
  validateInputs,
  withStartYear,
} from "./inputs";

const data = { firstMonth: "1999-12", lastMonth: "2026-09" } as MarketData;

describe("validateInputs", () => {
  it("accepts the defaults", () => {
    expect(validateInputs(DEFAULT_INPUTS)).toEqual([]);
  });

  it("needs some money to invest", () => {
    expect(validateInputs({ ...DEFAULT_INPUTS, monthly: 0 })[0].field).toBe("amount");
    expect(validateInputs({ ...DEFAULT_INPUTS, monthly: 0, initial: 50000 })).toEqual([]);
  });

  it("needs at least one asset", () => {
    expect(validateInputs({ ...DEFAULT_INPUTS, assets: [] })).toEqual([
      { field: "assets", message: "Vyber aspoň jedno aktivum." },
    ]);
  });

  it("rejects absurd amounts and rates", () => {
    expect(validateInputs({ ...DEFAULT_INPUTS, monthly: 2_000_000 })[0].field).toBe("amount");
    expect(validateInputs({ ...DEFAULT_INPUTS, savingsRate: -1 })[0].field).toBe("savingsRate");
    expect(validateInputs({ ...DEFAULT_INPUTS, savingsRate: Number.NaN })[0].field).toBe("savingsRate");
  });
});

describe("start month helpers", () => {
  it("clamps the start into the data range", () => {
    expect(clampStart("1990-01", data)).toBe("1999-12");
    expect(clampStart("2030-01", data)).toBe("2026-09");
    expect(clampStart("2015-01", data)).toBe("2015-01");
  });

  it("offers only months that have data", () => {
    expect(startYears(data)).toHaveLength(28);
    expect(startMonthsInYear(1999, data)).toEqual([12]);
    expect(startMonthsInYear(2026, data)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(startMonthsInYear(2015, data)).toHaveLength(12);
  });

  it("keeps the month when switching years, unless it falls outside the data", () => {
    expect(withStartYear("2015-03", 2020, data)).toBe("2020-03");
    expect(withStartYear("2015-11", 2026, data)).toBe("2026-09");
    expect(withStartYear("2015-03", 1999, data)).toBe("1999-12");
  });

  it("maps form inputs to the simulation", () => {
    expect(toSimulationInput({ ...DEFAULT_INPUTS, start: "1980-01" }, data)).toMatchObject({
      monthlyAmount: 2000,
      startMonth: "1999-12",
      savingsRateFallback: 2,
    });
  });
});
