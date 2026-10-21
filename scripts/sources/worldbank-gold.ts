// Gold price in USD per troy ounce from the World Bank "Pink Sheet" (Commodity Markets).
//
// The World Bank publishes a new xlsx every month under a new URL, so we first look up the current
// link on the Commodity Markets page. Values are MONTHLY AVERAGES, not month-end closes.

import { readSheet } from "read-excel-file/node";
import { fetchBuffer, fetchText } from "../lib/http.ts";
import { toMonth } from "../lib/months.ts";
import type { MonthlySeries, SourceResult } from "../lib/series.ts";

const SOURCE = "Světová banka zlato";
export const WORLD_BANK_PAGE = "https://www.worldbank.org/en/research/commodity-markets";
const SHEET = "Monthly Prices";

export function findPinkSheetUrl(html: string): string {
  const match = html.match(/https?:\/\/[^"'\s>]*CMO-Historical-Data-Monthly\.xlsx/i);
  if (!match) throw new Error(`[${SOURCE}] link to CMO-Historical-Data-Monthly.xlsx not found on ${WORLD_BANK_PAGE}`);
  return match[0];
}

type Cell = string | number | boolean | Date | null;

/**
 * Sheet layout: a few title rows, then a header row with commodity names ("Gold" among them),
 * a units row ("($/troy oz)"), then one row per month with the date in column A as "2026M09".
 */
export function parsePinkSheetGold(rows: Cell[][]): MonthlySeries {
  const headerRow = rows.findIndex((row) => row.some((c) => typeof c === "string" && c.trim().toLowerCase() === "gold"));
  if (headerRow === -1) throw new Error(`[${SOURCE}] "Gold" column not found in sheet "${SHEET}"`);
  const col = rows[headerRow].findIndex((c) => typeof c === "string" && c.trim().toLowerCase() === "gold");

  const unit = rows[headerRow + 1]?.[col];
  if (typeof unit !== "string" || !unit.includes("troy oz")) {
    throw new Error(`[${SOURCE}] unexpected unit for gold: ${JSON.stringify(unit)}`);
  }

  const series: MonthlySeries = new Map();
  for (const row of rows.slice(headerRow + 2)) {
    const label = row[0];
    const match = typeof label === "string" ? label.trim().match(/^(\d{4})M(\d{2})$/) : null;
    if (!match) continue;
    const value = row[col];
    if (typeof value !== "number") continue; // not yet published
    series.set(toMonth(Number(match[1]), Number(match[2])), { value });
  }
  return series;
}

export async function fetchWorldBankGold(): Promise<SourceResult & { fileUrl: string }> {
  const fileUrl = findPinkSheetUrl(await fetchText(SOURCE, WORLD_BANK_PAGE));
  const buffer = await fetchBuffer(SOURCE, fileUrl);
  let rows: Cell[][];
  try {
    rows = (await readSheet(buffer, SHEET)) as Cell[][];
  } catch (error) {
    throw new Error(`[${SOURCE}] cannot read sheet "${SHEET}": ${(error as Error).message}`);
  }
  return {
    series: parsePinkSheetGold(rows),
    fileUrl,
    info: {
      name: "Světová banka – Commodity Markets (Pink Sheet)",
      url: WORLD_BANK_PAGE,
      note: "USD za trojskou unci, měsíční průměr (ne závěrečná cena měsíce).",
    },
  };
}
