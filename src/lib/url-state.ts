// Calculator inputs <-> URL search params, so a result can be shared as a link.
// Params are short and readable Czech: ?mesicne=2000&od=2015-01&aktiva=sp500,zlato,bitcoin
// Parsing is forgiving: anything missing or broken falls back to its default instead of failing.

import { ASSET_IDS, type AssetId } from "./assets";
import { DEFAULT_INPUTS, LIMITS, clampStart, type CalculatorInputs } from "./inputs";
import type { MarketData } from "./market-data";

const SLUGS: Record<AssetId, string> = {
  sp500: "sp500",
  gold: "zlato",
  btc: "bitcoin",
  savings: "sporak",
  cash: "hotovost",
};

const FROM_SLUG = new Map<string, AssetId>(
  ASSET_IDS.flatMap((id) => [
    [SLUGS[id], id],
    [id, id], // also accept the English ids
  ]),
);

interface ParamsLike {
  get(name: string): string | null;
}

function parseWholeNumber(raw: string | null, max: number): number | null {
  if (raw === null || !/^\d{1,12}$/.test(raw.trim())) return null;
  const value = Number(raw.trim());
  return value <= max ? value : null;
}

function parseRate(raw: string | null): number | null {
  if (raw === null) return null;
  const value = Number(raw.trim().replace(",", "."));
  return raw.trim() !== "" && Number.isFinite(value) && value >= 0 && value <= LIMITS.savingsRateMax ? value : null;
}

function parseAssets(raw: string | null): AssetId[] | null {
  if (raw === null) return null;
  const ids = new Set(
    raw
      .split(",")
      .map((s) => FROM_SLUG.get(s.trim().toLowerCase()))
      .filter((id): id is AssetId => id !== undefined),
  );
  // Canonical order, so colors and cards don't depend on how the link was written.
  const assets = ASSET_IDS.filter((id) => ids.has(id));
  return assets.length > 0 ? assets : null;
}

export function parseInputs(params: ParamsLike, data: MarketData): CalculatorInputs {
  const start = params.get("od");
  return {
    monthly: parseWholeNumber(params.get("mesicne"), LIMITS.monthlyMax) ?? DEFAULT_INPUTS.monthly,
    initial: parseWholeNumber(params.get("vklad"), LIMITS.initialMax) ?? DEFAULT_INPUTS.initial,
    start: clampStart(start && /^\d{4}-(0[1-9]|1[0-2])$/.test(start) ? start : DEFAULT_INPUTS.start, data),
    assets: parseAssets(params.get("aktiva")) ?? DEFAULT_INPUTS.assets,
    real: params.get("realne") === "1",
    savingsRate: parseRate(params.get("sazba")) ?? DEFAULT_INPUTS.savingsRate,
  };
}

/**
 * Every input that affects the result is written explicitly (not only the non-defaults), so a
 * shared link keeps showing the same result even if the defaults change later.
 * `includeSavingsRate`: only while the rate is a user estimate (no ČNB data) and savings are shown.
 */
export function serializeInputs(inputs: CalculatorInputs, includeSavingsRate: boolean): string {
  const params = new URLSearchParams();
  params.set("mesicne", String(inputs.monthly));
  if (inputs.initial > 0) params.set("vklad", String(inputs.initial));
  params.set("od", inputs.start);
  params.set("aktiva", inputs.assets.map((id) => SLUGS[id]).join(","));
  if (inputs.real) params.set("realne", "1");
  if (includeSavingsRate && inputs.assets.includes("savings")) params.set("sazba", String(inputs.savingsRate));
  // Commas in the asset list are safe in a query string; keep them readable.
  return params.toString().replaceAll("%2C", ",");
}
