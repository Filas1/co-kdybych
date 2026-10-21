// The bundled market data (~20 kB). Imported at build time, so the app never fetches anything.

import marketJson from "@/data/market.json";
import type { AssetId } from "./assets";
import type { MarketData } from "./market-data";

export const market = marketJson as unknown as MarketData;

/**
 * First month an asset can start in, or null when it is always available
 * (cash, or savings computed with the user's own rate).
 */
export function assetFirstMonth(id: AssetId, data: MarketData = market): string | null {
  switch (id) {
    case "sp500":
    case "gold":
    case "btc":
      return data.sources[id].firstMonth;
    case "savings":
      return data.sources.savingsRate.available ? data.sources.savingsRate.firstMonth : null;
    case "cash":
      return null;
  }
}

/** True while savings use the user's estimated rate instead of ČNB data. */
export const savingsRateIsEstimate = !market.sources.savingsRate.available;
