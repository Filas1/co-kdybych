// Average interest rate on savings accounts from the ČNB ARAD database (needs a free API key).
//
// Indicator SMIRNOOBVKMIRS405CZK1 = MFI interest rate statistics, new business, households
// (individuals), "úsporné vklady na požádání (včetně spořicích účtů)", CZK, monthly, % p.a.
// We use this one and not "jednodenní vklady": that broader category also contains current
// accounts paying ~0 %, which would understate what a savings account earned.

import { parseCsvLine, splitLines } from "../lib/csv.ts";
import { fetchText } from "../lib/http.ts";
import type { MonthlySeries, SourceResult } from "../lib/series.ts";

const SOURCE = "ČNB ARAD spořicí účty";
export const SAVINGS_INDICATOR = "SMIRNOOBVKMIRS405CZK1";

export function aradUrl(apiKey: string): string {
  const params = new URLSearchParams({
    indicator_id_list: SAVINGS_INDICATOR,
    decimal_separator: "point",
    period_sort: "asc",
    api_key: apiKey,
  });
  return `https://www.cnb.cz/aradb/api/v1/data?${params}`;
}

/**
 * ARAD /data output (windows-1250, semicolons, CRLF):
 *   indicator_id;snapshot_id;period;value
 *   SMIRNOOBVKMIRS405CZK1;;20260831;1.86
 * `period` is the last day of the month.
 */
export function parseAradData(text: string, indicator = SAVINGS_INDICATOR): MonthlySeries {
  const [headerLine, ...rows] = splitLines(text);
  const header = parseCsvLine(headerLine, ";").map((h) => h.trim());
  const periodCol = header.indexOf("period");
  const valueCol = header.indexOf("value");
  const indicatorCol = header.indexOf("indicator_id");
  if (periodCol === -1 || valueCol === -1 || indicatorCol === -1) {
    throw new Error(`[${SOURCE}] unexpected header "${headerLine}"`);
  }

  const series: MonthlySeries = new Map();
  for (const row of rows) {
    const f = parseCsvLine(row, ";");
    if (f[indicatorCol] !== indicator) continue;
    const period = f[periodCol];
    if (!/^\d{8}$/.test(period)) throw new Error(`[${SOURCE}] unexpected period "${period}"`);
    const value = Number(f[valueCol].replace(",", "."));
    if (!Number.isFinite(value)) throw new Error(`[${SOURCE}] invalid value "${f[valueCol]}" for ${period}`);
    series.set(`${period.slice(0, 4)}-${period.slice(4, 6)}`, { value });
  }
  return series;
}

export async function fetchCnbAradSavings(apiKey: string): Promise<SourceResult> {
  // ARAD answers with a JSON error body and HTTP 400 for a bad key; fetchText turns that into an error.
  const text = await fetchText(SOURCE, aradUrl(apiKey), "windows-1250");
  const series = parseAradData(text);
  if (series.size === 0) throw new Error(`[${SOURCE}] no rows for ${SAVINGS_INDICATOR}`);
  return {
    series,
    info: {
      name: "Česká národní banka – ARAD, úrokové sazby MFI",
      url: "https://www.cnb.cz/arad/",
      note: `Ukazatel ${SAVINGS_INDICATOR}: průměrná sazba nových úsporných vkladů na požádání (včetně spořicích účtů), obyvatelstvo, CZK, % p.a.`,
    },
  };
}
