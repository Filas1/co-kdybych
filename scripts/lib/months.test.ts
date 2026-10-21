import { describe, expect, it } from "vitest";
import { addMonths, isMonth, lastCompleteMonth, monthRange } from "./months.ts";
import { lastPerMonth } from "./series.ts";
import { parseCsvLine } from "./csv.ts";

describe("months", () => {
  it("adds months across year boundaries", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2015-01", -1)).toBe("2014-12");
    expect(addMonths("2015-01", 24)).toBe("2017-01");
  });

  it("builds inclusive ranges", () => {
    expect(monthRange("2024-11", "2025-02")).toEqual(["2024-11", "2024-12", "2025-01", "2025-02"]);
    expect(monthRange("2025-01", "2025-01")).toEqual(["2025-01"]);
  });

  it("treats the running month as incomplete", () => {
    expect(lastCompleteMonth(new Date("2026-10-21T12:00:00Z"))).toBe("2026-09");
    expect(lastCompleteMonth(new Date("2026-01-01T00:00:00Z"))).toBe("2025-12");
  });

  it("validates month keys", () => {
    expect(isMonth("2015-01")).toBe(true);
    expect(isMonth("2015-13")).toBe(false);
    expect(isMonth("2015-1")).toBe(false);
  });
});

describe("lastPerMonth", () => {
  it("keeps the last available day of each month, regardless of input order", () => {
    const series = lastPerMonth([
      { date: "2015-01-30", value: 3 },
      { date: "2015-01-02", value: 1 },
      { date: "2015-02-27", value: 5 },
      { date: "2015-01-29", value: 2 },
    ]);
    expect([...series]).toEqual([
      ["2015-01", { value: 3, date: "2015-01-30" }],
      ["2015-02", { value: 5, date: "2015-02-27" }],
    ]);
  });
});

describe("parseCsvLine", () => {
  it("handles quoted fields with delimiters and escaped quotes", () => {
    expect(parseCsvLine('"a","Bydlení, voda","say ""hi""",')).toEqual(["a", "Bydlení, voda", 'say "hi"', ""]);
    expect(parseCsvLine("x;;20260831;1.86", ";")).toEqual(["x", "", "20260831", "1.86"]);
  });
});
