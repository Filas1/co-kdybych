// Parser tests on small samples copied from the real source formats.

import { describe, expect, it } from "vitest";
import { dividendCheck, parseAlphaVantageMonthly } from "./alphavantage-spy.ts";
import { parseAradData } from "./cnb-arad-savings.ts";
import { parseCnbFx } from "./cnb-fx.ts";
import { combineCpi, parseCpiArchive, parseCpiCurrent } from "./czso-cpi.ts";
import { parseFredCsv } from "./fred-btc.ts";
import { findPinkSheetUrl, parsePinkSheetGold } from "./worldbank-gold.ts";
import type { MonthlySeries } from "../lib/series.ts";

const toObject = (series: MonthlySeries) =>
  Object.fromEntries([...series].map(([month, point]) => [month, point.value]));

describe("ČNB exchange rates", () => {
  it("parses rates with a decimal comma and divides by the quoted amount", () => {
    const text = [
      "Měna: USD|Množství: 1",
      "Datum|Kurz",
      "02.01.2015|23,001",
      "30.01.2015|24,585",
      "Měna: USD|Množství: 100",
      "Datum|Kurz",
      "02.02.2015|2450,000",
    ].join("\r\n");
    expect(parseCnbFx(text)).toEqual([
      { date: "2015-01-02", value: 23.001 },
      { date: "2015-01-30", value: 24.585 },
      { date: "2015-02-02", value: 24.5 },
    ]);
  });
});

describe("ČSÚ CPI", () => {
  const currentCsv = [
    '"Ukazatel","IndicatorType","Typ indexu","TYPUDAJE4A","Klasifikace COICOP 2018-Oddíl","CZCOICOP2.CZCOP1","Klasifikace COICOP 2018-Skupina a třída","CZCOICOP2.CZCOP23","Skupiny domácností","EKAKTIOCDS","Území","UZ02P","Měsíce","CASMKMQRM12","Hodnota","MJ_TEXT","MJ_SYMBOL"',
    '"ISC","6134","Bazický index (2015 = 100)","IZ2015","Úhrn","0","","","Domácnosti celkem","0","Česko","CZ","leden 2015","2015-01","99.5","procento","%"',
    '"ISC","6134","Bazický index (2015 = 100)","IZ2015","Úhrn","0","","","Domácnosti celkem","0","Česko","CZ","leden - únor 2015","2015-02K","99.6","procento","%"',
    '"ISC","6134","Bazický index (2015 = 100)","IZ2015","Úhrn","0","","","Domácnosti celkem","0","Česko","CZ","únor 2015","2015-02","99.7","procento","%"',
    '"ISC","6134","Bazický index (2015 = 100)","IZ2015","Bydlení, voda, energie","04","","","Domácnosti celkem","0","Česko","CZ","únor 2015","2015-02","98.0","procento","%"',
    '"ISC","6134","Bazický index (2025 = 100)","IZ2025","Úhrn","0","","","Domácnosti celkem","0","Česko","CZ","únor 2015","2015-02","64.2","procento","%"',
  ].join("\n");

  const archiveCsv = [
    '"idhod","hodnota","stapro_kod","ucel_tep","ucel_cis","ucel_kod","casz_kod","mesic","rok","obdobiod","obdobido","bazobdobiod","bazobdobido","ucel_txt","casz_txt"',
    '"1","70.4","6134","","","","Z","12","2014","2014-12-01","2014-12-31","2015-01-01","2015-12-31","","průměr bazického roku"',
    '"2","99.5","6134","","","","Z","1","2015","2015-01-01","2015-01-31","2015-01-01","2015-12-31","","průměr bazického roku"',
    '"3","100.1","6134","","","","B","1","2015","2015-01-01","2015-01-31","2014-12-01","2014-12-31","","předchozí období"',
    '"4","99.0","6134","ECOICOP","6000","04","Z","1","2015","2015-01-01","2015-01-31","2015-01-01","2015-12-31","Bydlení","průměr bazického roku"',
  ].join("\n");

  it("keeps only the all-items monthly base index from the current dataset", () => {
    expect(toObject(parseCpiCurrent(currentCsv))).toEqual({ "2015-01": 99.5, "2015-02": 99.7 });
  });

  it("keeps only the all-items base-year index from the archive", () => {
    expect(toObject(parseCpiArchive(archiveCsv))).toEqual({ "2014-12": 70.4, "2015-01": 99.5 });
  });

  it("takes the archive only before the current dataset starts", () => {
    const { series, overlapMonths, maxDiff } = combineCpi(parseCpiCurrent(currentCsv), parseCpiArchive(archiveCsv));
    expect(toObject(series)).toEqual({ "2014-12": 70.4, "2015-01": 99.5, "2015-02": 99.7 });
    expect(overlapMonths).toBe(1);
    expect(maxDiff).toBe(0);
  });

  it("refuses to combine datasets that disagree", () => {
    const current: MonthlySeries = new Map([["2015-01", { value: 99.5 }]]);
    const archive: MonthlySeries = new Map([["2015-01", { value: 101.0 }]]);
    expect(() => combineCpi(current, archive)).toThrow(/disagree/);
  });
});

describe("FRED", () => {
  it("skips missing values", () => {
    const csv = "observation_date,CBBTCUSD\n2014-12-01,370.00\n2014-12-02,.\n2014-12-03,\n2014-12-31,318.24\n";
    expect(parseFredCsv(csv)).toEqual([
      { date: "2014-12-01", value: 370 },
      { date: "2014-12-31", value: 318.24 },
    ]);
  });
});

describe("World Bank Pink Sheet", () => {
  it("finds the current xlsx link on the page", () => {
    const html = '<a href="https://thedocs.worldbank.org/en/doc/abc-0050012026/related/CMO-Historical-Data-Monthly.xlsx">Monthly prices</a>';
    expect(findPinkSheetUrl(html)).toBe(
      "https://thedocs.worldbank.org/en/doc/abc-0050012026/related/CMO-Historical-Data-Monthly.xlsx",
    );
  });

  it("reads the gold column by its header and skips unpublished months", () => {
    const rows = [
      ["World Bank Commodity Price Data (The Pink Sheet)", null, null],
      [null, "Crude oil, average", "Gold"],
      [null, "($/bbl)", "($/troy oz)"],
      ["2026M08", 70.1, 4411],
      ["2026M09", 68.5, 4319],
      ["2026M10", null, "…"],
    ];
    expect(toObject(parsePinkSheetGold(rows))).toEqual({ "2026-08": 4411, "2026-09": 4319 });
  });
});

describe("Alpha Vantage", () => {
  const response = {
    "Meta Data": { "2. Symbol": "SPY" },
    "Monthly Adjusted Time Series": {
      "2015-02-27": { "4. close": "210.66", "5. adjusted close": "175.00", "7. dividend amount": "0.0000" },
      "2015-01-30": { "4. close": "199.45", "5. adjusted close": "164.20", "7. dividend amount": "0.0000" },
    },
  };

  it("parses months in ascending order", () => {
    const parsed = parseAlphaVantageMonthly(response);
    expect([...parsed.keys()]).toEqual(["2015-01", "2015-02"]);
    expect(parsed.get("2015-01")).toEqual({ date: "2015-01-30", close: 199.45, adjustedClose: 164.2, dividend: 0 });
  });

  it("turns API messages (bad key, rate limit) into errors", () => {
    expect(() => parseAlphaVantageMonthly({ Information: "rate limit reached" })).toThrow(/rate limit/);
    expect(() => parseAlphaVantageMonthly({ "Error Message": "Invalid API call" })).toThrow(/Invalid/);
  });

  it("dividend check is zero when adjusted prices equal reinvested dividends", () => {
    // Price flat at 100, one 2 % dividend: reinvesting gives 1.02x, so the adjusted series must grow 1.02x too.
    const months = new Map(
      Array.from({ length: 13 }, (_, i) => {
        const month = `2020-${String(i + 1).padStart(2, "0")}`;
        return [month, { date: `${month}-28`, close: 100, adjustedClose: i >= 6 ? 102 : 100, dividend: i === 6 ? 2 : 0 }];
      }),
    );
    expect(dividendCheck(months)).toBeCloseTo(0, 10);
  });
});

describe("ČNB ARAD", () => {
  it("parses semicolon CSV with YYYYMMDD periods", () => {
    const text = "indicator_id;snapshot_id;period;value\r\nSMIRNOOBVKMIRS405CZK1;;20260731;1.85\r\nSMIRNOOBVKMIRS405CZK1;;20260831;1.86\r\n";
    expect(toObject(parseAradData(text))).toEqual({ "2026-07": 1.85, "2026-08": 1.86 });
  });
});
