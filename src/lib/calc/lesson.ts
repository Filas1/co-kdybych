// One short takeaway sentence, generated from fixed rules (no AI). The first matching rule wins.
// Phrasing never depends on the reader's gender: sentences talk about the asset ("spadl"),
// not about the reader ("byl/byla").

import { ASSETS, pastTense } from "../assets";
import { formatCzk, formatPercent } from "../format";
import type { AvailableAssetResult, SimulationResult } from "./types";

/** A drawdown at least this deep is worth warning about. */
export const BIG_DRAWDOWN = 0.3;
/** Cash must lose at least this share in real terms for the inflation message. */
const NOTABLE_CASH_LOSS = 0.01;

export function lessonSentence(result: SimulationResult): string | null {
  const available = result.assets.filter((a): a is AvailableAssetResult => a.available);
  if (available.length === 0) return null;

  // Highest final value wins; on a tie the first selected asset stays.
  const winner = available.reduce((best, a) => (a.finalValue > best.finalValue ? a : best));
  const meta = ASSETS[winner.id];
  const cash = available.find((a) => a.id === "cash");

  // 1. The winner made money, but the ride was rough.
  if (winner.profit > 0 && winner.maxDrawdown.depth >= BIG_DRAWDOWN) {
    return (
      `Nejvíc ${pastTense(meta, "vydělal")} ${meta.inSentence}, ale cestou ${pastTense(meta, "spadl")} ` +
      `až o ${formatPercent(winner.maxDrawdown.depth, 0)} pod svůj vrchol.`
    );
  }

  // 2. Inflation quietly ate the cash (only visible in today's crowns).
  if (result.real && cash && cash.profitPct <= -NOTABLE_CASH_LOSS) {
    const loss = `Pod polštářem ti inflace sežrala ${formatCzk(-cash.profit)}.`;
    if (winner.id !== "cash" && winner.profit > 0) {
      return `${loss} ${meta.label} ti za stejnou dobu ${pastTense(meta, "vydělal")} ${formatCzk(winner.profit)}.`;
    }
    return loss;
  }

  // 3. A market asset won without a deep fall.
  if (winner.profit > 0 && meta.priceSeries) {
    return `Nejvíc ${pastTense(meta, "vydělal")} ${meta.inSentence}: z ${formatCzk(winner.invested)} máš ${formatCzk(winner.finalValue)}.`;
  }

  // 4. The safe option won – happens on short or unlucky periods.
  if (winner.profit > 0) {
    return `Tentokrát ${pastTense(meta, "vyhrál")} ${meta.inSentence}. Na krátkém úseku umí trh i prodělat.`;
  }

  // 5. Nothing made money.
  return "Tohle období se nepovedlo ničemu. Na krátké trati umí trh i prodělat.";
}
