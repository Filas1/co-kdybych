import { describe, expect, it } from "vitest";
import {
  formatCzk,
  formatCzkSigned,
  formatMonth,
  formatPercent,
  formatPercentSigned,
} from "./format";

// Intl puts a non-breaking space between digit groups and before units.
const NBSP = " ";

describe("formatCzk", () => {
  it("groups thousands and rounds to whole crowns", () => {
    expect(formatCzk(1234567)).toBe(`1${NBSP}234${NBSP}567${NBSP}Kč`);
    expect(formatCzk(999.6)).toBe(`1${NBSP}000${NBSP}Kč`);
    expect(formatCzk(0)).toBe(`0${NBSP}Kč`);
  });

  it("adds a sign only when asked", () => {
    expect(formatCzkSigned(12345)).toBe(`+12${NBSP}345${NBSP}Kč`);
    expect(formatCzkSigned(-500)).toBe(`-500${NBSP}Kč`);
    expect(formatCzkSigned(0)).toBe(`0${NBSP}Kč`);
  });
});

describe("formatPercent", () => {
  it("takes a fraction and uses a decimal comma", () => {
    expect(formatPercent(0.1234)).toBe(`12,3${NBSP}%`);
    expect(formatPercent(1)).toBe(`100${NBSP}%`);
  });

  it("can round to whole percent", () => {
    expect(formatPercent(0.8349, 0)).toBe(`83${NBSP}%`);
  });

  it("never prints a negative zero for float leftovers", () => {
    expect(formatPercent(-1e-12)).toBe(`0${NBSP}%`);
    expect(formatPercent(-0.0004, 0)).toBe(`0${NBSP}%`);
    expect(formatPercentSigned(-1e-12)).toBe(`0${NBSP}%`);
    expect(formatCzk(-0.3)).toBe(`0${NBSP}Kč`);
    expect(formatCzkSigned(-0.3)).toBe(`0${NBSP}Kč`);
  });

  it("shows a plus sign for gains in the signed variant", () => {
    expect(formatPercentSigned(0.5)).toBe(`+50${NBSP}%`);
    expect(formatPercentSigned(-0.25)).toBe(`-25${NBSP}%`);
  });
});

describe("formatMonth", () => {
  it("prints the Czech month name", () => {
    expect(formatMonth("2015-01")).toBe("leden 2015");
    expect(formatMonth("2026-09")).toBe("září 2026");
  });
});
