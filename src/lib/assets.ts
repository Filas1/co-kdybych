// The five things a user can compare, with Czech names used in the UI and in generated sentences.

import type { SeriesKey } from "./market-data";

export const ASSET_IDS = ["sp500", "gold", "btc", "savings", "cash"] as const;
export type AssetId = (typeof ASSET_IDS)[number];

export interface AssetMeta {
  id: AssetId;
  /** Name as a heading, e.g. "Zlato". */
  label: string;
  /** Name in the middle of a sentence, e.g. "zlato". */
  inSentence: string;
  /** Grammatical gender, needed for Czech past tense ("vydělal" / "vydělala" / "vydělalo"). */
  gender: "m" | "f" | "n";
  /** USD price series in market data; null for savings and cash, which are computed differently. */
  priceSeries: Extract<SeriesKey, "sp500" | "gold" | "btc"> | null;
}

export const ASSETS: Record<AssetId, AssetMeta> = {
  sp500: { id: "sp500", label: "S&P 500", inSentence: "S&P 500", gender: "m", priceSeries: "sp500" },
  gold: { id: "gold", label: "Zlato", inSentence: "zlato", gender: "n", priceSeries: "gold" },
  btc: { id: "btc", label: "Bitcoin", inSentence: "Bitcoin", gender: "m", priceSeries: "btc" },
  savings: { id: "savings", label: "Spořicí účet", inSentence: "spořicí účet", gender: "m", priceSeries: null },
  cash: { id: "cash", label: "Hotovost", inSentence: "hotovost", gender: "f", priceSeries: null },
};

/** Picks the past-tense form matching the asset's gender: pastTense(ASSETS.gold, "vydělal") → "vydělalo". */
export function pastTense(asset: AssetMeta, masculine: string): string {
  if (asset.gender === "f") return `${masculine}a`;
  if (asset.gender === "n") return `${masculine}o`;
  return masculine;
}
