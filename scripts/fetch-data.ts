// Downloads all market data, validates it and writes src/data/market.json.
// Run with `npm run data` (Node 22.18+ runs TypeScript directly, no build step needed).
// The app never calls these APIs itself; it only reads the generated JSON.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { SERIES_KEYS, type MarketData, type SeriesKey } from "../src/lib/market-data.ts";
import { assembleMarketData, formatMarketJson } from "./lib/assemble.ts";
import { lastCompleteMonth, type Month } from "./lib/months.ts";
import { assertValidSeries, type MonthlySeries, type SourceInfo } from "./lib/series.ts";
import { fetchAlphaVantageSpy, type SpyMonth } from "./sources/alphavantage-spy.ts";
import { fetchCnbAradSavings } from "./sources/cnb-arad-savings.ts";
import { fetchCnbFx } from "./sources/cnb-fx.ts";
import { fetchCzsoCpi } from "./sources/czso-cpi.ts";
import { fetchFredBtc } from "./sources/fred-btc.ts";
import { fetchWorldBankGold } from "./sources/worldbank-gold.ts";

const OUTPUT = resolve(import.meta.dirname, "../src/data/market.json");
const FX_FROM = new Date(Date.UTC(1999, 0, 1)); // SPY history on Alpha Vantage starts around 1999
const CHECK_MONTHS: Month[] = ["2015-01", "2018-12", "2020-03", "2021-12", "2022-12"];

const SAVINGS_FALLBACK_INFO: SourceInfo = {
  name: "ČNB ARAD – úrokové sazby měnových finančních institucí",
  url: "https://www.cnb.cz/arad/",
  note: "Nestaženo (chybí CNB_ARAD_API_KEY). Aplikace použije nastavitelnou sazbu.",
};

function loadEnv(): void {
  try {
    process.loadEnvFile(resolve(import.meta.dirname, "../.env.local"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

async function main(): Promise<void> {
  loadEnv();
  const avKey = process.env.ALPHAVANTAGE_API_KEY?.trim();
  const aradKey = process.env.CNB_ARAD_API_KEY?.trim();
  if (!avKey) throw new Error("ALPHAVANTAGE_API_KEY is missing in .env.local (see .env.example)");

  console.log("Stahuju data…");
  const now = new Date();

  // allSettled: run everything and report ALL failing sources at once, not just the first one.
  const [fx, cpi, spy, gold, btc, savings] = await Promise.allSettled([
    fetchCnbFx(FX_FROM, now),
    fetchCzsoCpi(),
    fetchAlphaVantageSpy(avKey),
    fetchWorldBankGold(),
    fetchFredBtc(),
    aradKey ? fetchCnbAradSavings(aradKey) : Promise.resolve(null),
  ]);

  const failures = [fx, cpi, spy, gold, btc, savings]
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r) => (r.reason as Error).message);
  if (failures.length > 0) {
    console.error("\n❌ Některé zdroje selhaly, nic jsem neuložil:");
    for (const message of failures) console.error(`  - ${message}`);
    process.exit(1);
  }

  const ok = <T>(r: PromiseSettledResult<T>) => (r as PromiseFulfilledResult<T>).value;
  const results = {
    usdCzk: ok(fx),
    cpi: ok(cpi),
    sp500: ok(spy),
    gold: ok(gold),
    btc: ok(btc),
    savingsRate: ok(savings),
  };

  const series = {} as Record<SeriesKey, MonthlySeries | null>;
  const info = {} as Record<SeriesKey, SourceInfo>;
  for (const key of SERIES_KEYS) {
    const result = results[key];
    series[key] = result?.series ?? null;
    info[key] = result?.info ?? SAVINGS_FALLBACK_INFO;
    if (result) assertValidSeries(result.info.name, result.series);
  }

  const { data, warnings } = assembleMarketData({
    series,
    info,
    lastCompleteMonth: lastCompleteMonth(now),
    generatedAt: now.toISOString(),
  });

  await mkdir(dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, formatMarketJson(data));

  printReport(data, series, ok(spy).raw, {
    cpiOverlap: ok(cpi),
    dividendCheckPp: ok(spy).dividendCheckPp,
    goldFile: ok(gold).fileUrl,
    warnings,
  });
}

// ---------- report ----------

const num = (value: number | undefined, digits: number) =>
  value === undefined
    ? "–"
    : value.toLocaleString("cs-CZ", { minimumFractionDigits: digits, maximumFractionDigits: digits });

const czDate = (iso?: string) => (iso ? `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}` : "");

function printReport(
  data: MarketData,
  series: Record<SeriesKey, MonthlySeries | null>,
  spyRaw: Map<Month, SpyMonth>,
  extra: { cpiOverlap: { overlapMonths: number; maxDiff: number }; dividendCheckPp: number; goldFile: string; warnings: string[] },
): void {
  console.log(`\n✅ Uloženo: src/data/market.json`);
  console.log(`   Období: ${data.firstMonth} až ${data.lastMonth} (${data.months.length} měsíců)\n`);

  console.log("Zdroje:");
  for (const key of SERIES_KEYS) {
    const s = data.sources[key];
    const range = s.available ? `${s.firstMonth} až ${s.lastMonth}` : "NESTAŽENO";
    console.log(`  ${key.padEnd(12)} ${range.padEnd(20)} ${s.name}`);
  }

  console.log("\nKontroly:");
  console.log(
    `  Inflace: archiv a nová řada ČSÚ se překrývají ${extra.cpiOverlap.overlapMonths} měsíců, max. rozdíl ${num(extra.cpiOverlap.maxDiff, 2)} bodu.`,
  );
  console.log(
    `  S&P 500: index z dividend vs. upravená cena SPY se liší o ${num(extra.dividendCheckPp, 3)} p. b. ročně.`,
  );
  console.log(`  Zlato: soubor ${extra.goldFile}`);
  if (extra.warnings.length > 0) {
    console.log("\n⚠️  Velké měsíční skoky (zkontroluj, jestli dávají smysl):");
    for (const w of extra.warnings) console.log(`  - ${w}`);
  }
  if (!data.sources.savingsRate.available) {
    console.log("\n⚠️  Spořicí účet: chybí CNB_ARAD_API_KEY, sazby se nestáhly. Aplikace použije nastavitelnou sazbu.");
  }

  const months = [data.firstMonth, ...CHECK_MONTHS, data.lastMonth].filter(
    (m, i, all) => m >= data.firstMonth && m <= data.lastMonth && all.indexOf(m) === i,
  );

  console.log("\nKontrolní hodnoty (ověř proti zdrojům):");
  const rows = months.map((month) => {
    const fx = series.usdCzk!.get(month);
    const spy = spyRaw.get(month);
    const btc = series.btc!.get(month);
    return {
      "měsíc": month,
      "USD/CZK": fx ? `${num(fx.value, 3)} (${czDate(fx.date)})` : "–",
      "SPY close": spy ? `${num(spy.close, 2)} (${czDate(spy.date)})` : "–",
      "SPY upr.": num(spy?.adjustedClose, 2),
      "zlato (průměr)": num(series.gold!.get(month)?.value, 2),
      "BTC": btc ? `${num(btc.value, 2)} (${czDate(btc.date)})` : "–",
      "CPI": num(series.cpi!.get(month)?.value, 1),
      "spořák % p.a.": num(series.savingsRate?.get(month)?.value, 2),
    };
  });
  console.table(rows);
}

main().catch((error: Error) => {
  console.error(`\n❌ ${error.message}`);
  process.exit(1);
});
