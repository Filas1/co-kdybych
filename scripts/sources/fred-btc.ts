// Bitcoin price in USD (Coinbase) via FRED, the St. Louis Fed's public data service.

import { parseCsvLine, splitLines } from "../lib/csv.ts";
import { fetchText } from "../lib/http.ts";
import { lastPerMonth, type DailyObservation, type SourceResult } from "../lib/series.ts";

const SOURCE = "FRED Bitcoin";
const SERIES_ID = "CBBTCUSD";
export const FRED_BTC_URL = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${SERIES_ID}`;

/** FRED CSV: "observation_date,CBBTCUSD". Missing days are "." or empty and are skipped. */
export function parseFredCsv(text: string): DailyObservation[] {
  const [header, ...rows] = splitLines(text);
  if (!header.startsWith("observation_date,")) {
    throw new Error(`[${SOURCE}] unexpected CSV header "${header}"`);
  }
  const observations: DailyObservation[] = [];
  for (const row of rows) {
    const [date, raw] = parseCsvLine(row);
    if (raw === undefined || raw === "" || raw === ".") continue;
    observations.push({ date, value: Number(raw) });
  }
  return observations;
}

export async function fetchFredBtc(): Promise<SourceResult> {
  const daily = parseFredCsv(await fetchText(SOURCE, FRED_BTC_URL));
  return {
    series: lastPerMonth(daily),
    info: {
      name: "FRED (Federal Reserve Bank of St. Louis) – Coinbase Bitcoin, CBBTCUSD",
      url: `https://fred.stlouisfed.org/series/${SERIES_ID}`,
      note: "USD, poslední denní hodnota v měsíci. Data od prosince 2014.",
    },
  };
}
