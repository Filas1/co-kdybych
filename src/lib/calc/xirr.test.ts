import { describe, expect, it } from "vitest";
import { maxDrawdown } from "./drawdown";
import { xirr, yearsBetween } from "./xirr";

describe("xirr", () => {
  it("one deposit, +10 % after a year → 10 %", () => {
    expect(xirr([{ years: 0, amount: -100 }, { years: 1, amount: 110 }])).toBeCloseTo(0.1, 9);
  });

  it("one deposit, 121 after two years → 10 % a year (compounding)", () => {
    expect(xirr([{ years: 0, amount: -100 }, { years: 2, amount: 121 }])).toBeCloseTo(0.1, 9);
  });

  it("two deposits: 100·1.1² + 100·1.1 = 231 → 10 %", () => {
    const flows = [
      { years: 0, amount: -100 },
      { years: 1, amount: -100 },
      { years: 2, amount: 231 },
    ];
    expect(xirr(flows)).toBeCloseTo(0.1, 9);
  });

  it("getting back exactly what you put in → 0 %", () => {
    expect(xirr([{ years: 0, amount: -50 }, { years: 0.5, amount: -50 }, { years: 1, amount: 100 }])).toBeCloseTo(0, 9);
  });

  it("losing half in a year → -50 %", () => {
    expect(xirr([{ years: 0, amount: -100 }, { years: 1, amount: 50 }])).toBeCloseTo(-0.5, 9);
  });

  it("handles very high returns (Bitcoin-like)", () => {
    expect(xirr([{ years: 0, amount: -100 }, { years: 1, amount: 1100 }])).toBeCloseTo(10, 6);
  });

  it("is undefined for a single date or without deposits", () => {
    expect(xirr([{ years: 0, amount: -100 }, { years: 0, amount: 100 }])).toBeNull();
    expect(xirr([{ years: 1, amount: 100 }])).toBeNull();
  });

  it("counts years like Excel (365 days)", () => {
    expect(yearsBetween(new Date("2015-01-31"), new Date("2016-01-31"))).toBe(1);
  });
});

describe("maxDrawdown", () => {
  it("finds the deepest fall from a previous peak", () => {
    expect(maxDrawdown([100, 120, 60, 90, 130])).toEqual({ depth: 0.5, peakIndex: 1, troughIndex: 2 });
  });

  it("ignores rises before the peak and compares against the highest point so far", () => {
    expect(maxDrawdown([100, 80, 150, 90, 200, 180])).toEqual({ depth: 0.4, peakIndex: 2, troughIndex: 3 });
  });

  it("is zero when the value never falls", () => {
    expect(maxDrawdown([1, 1, 2, 3])).toEqual({ depth: 0, peakIndex: 0, troughIndex: 0 });
  });

  it("measures a steady decline from the start", () => {
    expect(maxDrawdown([100, 90, 75]).depth).toBeCloseTo(0.25, 12);
  });
});
