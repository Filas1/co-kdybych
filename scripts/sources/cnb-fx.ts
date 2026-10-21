// USD/CZK exchange rate from the Czech National Bank (daily fixing, one text file per currency).

import { fetchText } from "../lib/http.ts";
import { lastPerMonth, type DailyObservation, type SourceResult } from "../lib/series.ts";

const SOURCE = "ČNB kurz USD/CZK";

export function cnbFxUrl(from: Date, to: Date): string {
  const fmt = (d: Date) =>
    `${String(d.getUTCDate()).padStart(2, "0")}.${String(d.getUTCMonth() + 1).padStart(2, "0")}.${d.getUTCFullYear()}`;
  return (
    "https://www.cnb.cz/cs/financni-trhy/devizovy-trh/kurzy-devizoveho-trhu/kurzy-devizoveho-trhu/vybrane.txt" +
    `?mena=USD&od=${fmt(from)}&do=${fmt(to)}`
  );
}

/**
 * Parses ČNB "vybrane.txt":
 *   Měna: USD|Množství: 1
 *   Datum|Kurz
 *   02.01.2015|23,001
 * The header block can repeat if the quoted amount ("Množství") changes, so the rate is always
 * divided by the amount from the latest header to get CZK per 1 USD.
 */
export function parseCnbFx(text: string): DailyObservation[] {
  const observations: DailyObservation[] = [];
  let amount = 1;

  for (const line of text.split(/\r?\n/)) {
    const header = line.match(/Množství:\s*(\d+)/);
    if (header) {
      amount = Number(header[1]);
      continue;
    }
    const row = line.match(/^(\d{2})\.(\d{2})\.(\d{4})\|([\d,]+)$/);
    if (!row) continue;
    const [, dd, mm, yyyy, rate] = row;
    observations.push({
      date: `${yyyy}-${mm}-${dd}`,
      value: Number(rate.replace(",", ".")) / amount,
    });
  }
  return observations;
}

export async function fetchCnbFx(from: Date, to: Date): Promise<SourceResult> {
  const url = cnbFxUrl(from, to);
  const text = await fetchText(SOURCE, url);
  const daily = parseCnbFx(text);
  if (daily.length === 0) throw new Error(`[${SOURCE}] no rates parsed from ${url}`);
  return {
    series: lastPerMonth(daily),
    info: {
      name: "Česká národní banka – kurzy devizového trhu",
      url: "https://www.cnb.cz/cs/financni-trhy/devizovy-trh/kurzy-devizoveho-trhu/",
      note: "CZK za 1 USD, kurz posledního pracovního dne v měsíci.",
    },
  };
}
