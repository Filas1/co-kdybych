// S&P 500 with reinvested dividends, approximated by the SPY ETF's dividend-adjusted price.
//
// Yahoo Finance and Stooq block scripts, the official S&P site returns 403. Alpha Vantage offers
// monthly adjusted prices with a free API key. SPY tracks the S&P 500; its adjusted close includes
// reinvested dividends, so it behaves like the total-return index minus the fund's 0.0945 % yearly fee.

import { fetchText, redact } from "../lib/http.ts";
import type { Month } from "../lib/months.ts";
import type { MonthlySeries, SourceResult } from "../lib/series.ts";

const SOURCE = "Alpha Vantage SPY";
const SYMBOL = "SPY";

export function alphaVantageUrl(apiKey: string): string {
  return `https://www.alphavantage.co/query?function=TIME_SERIES_MONTHLY_ADJUSTED&symbol=${SYMBOL}&apikey=${encodeURIComponent(apiKey)}`;
}

export interface SpyMonth {
  date: string; // last trading day in the month (or latest day for the running month)
  close: number;
  adjustedClose: number;
  dividend: number;
}

/** Parses the JSON response. Alpha Vantage reports errors and rate limits as 200 with a message field. */
export function parseAlphaVantageMonthly(json: unknown): Map<Month, SpyMonth> {
  const body = json as Record<string, unknown>;
  for (const key of ["Error Message", "Information", "Note"]) {
    if (typeof body[key] === "string") throw new Error(`[${SOURCE}] ${redact(body[key] as string)}`);
  }
  const table = body["Monthly Adjusted Time Series"] as Record<string, Record<string, string>> | undefined;
  if (!table) throw new Error(`[${SOURCE}] "Monthly Adjusted Time Series" missing in response`);

  const result = new Map<Month, SpyMonth>();
  for (const date of Object.keys(table).sort()) {
    const row = table[date];
    result.set(date.slice(0, 7), {
      date,
      close: Number(row["4. close"]),
      adjustedClose: Number(row["5. adjusted close"]),
      dividend: Number(row["7. dividend amount"]),
    });
  }
  return result;
}

/**
 * Cross-check: rebuild a total-return index from the raw close and dividends (reinvested at the
 * month-end close) and compare its growth with the adjusted close. Returns the difference in
 * annualized return, in percentage points. A small number means the adjusted price really
 * contains the dividends.
 */
export function dividendCheck(months: Map<Month, SpyMonth>): number {
  const rows = [...months.values()];
  if (rows.length < 13) return 0;
  let shares = 1;
  for (const row of rows.slice(1)) {
    if (row.dividend > 0) shares *= 1 + row.dividend / row.close;
  }
  const first = rows[0];
  const last = rows[rows.length - 1];
  const years = (rows.length - 1) / 12;
  const rebuilt = (shares * last.close) / first.close;
  const adjusted = last.adjustedClose / first.adjustedClose;
  return (Math.pow(rebuilt, 1 / years) - Math.pow(adjusted, 1 / years)) * 100;
}

export async function fetchAlphaVantageSpy(
  apiKey: string,
): Promise<SourceResult & { raw: Map<Month, SpyMonth>; dividendCheckPp: number }> {
  const text = await fetchText(SOURCE, alphaVantageUrl(apiKey));
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`[${SOURCE}] response is not JSON: ${text.slice(0, 200)}`);
  }
  const raw = parseAlphaVantageMonthly(json);
  const series: MonthlySeries = new Map(
    [...raw].map(([month, row]) => [month, { value: row.adjustedClose, date: row.date }]),
  );
  return {
    series,
    raw,
    dividendCheckPp: dividendCheck(raw),
    info: {
      name: "Alpha Vantage – SPDR S&P 500 ETF (SPY), měsíční upravené ceny",
      url: "https://www.alphavantage.co/documentation/#monthlyadj",
      note: "USD, cena upravená o dividendy (reinvestice). Odpovídá S&P 500 Total Return minus poplatek fondu 0,0945 % ročně.",
    },
  };
}
