import type { Drawdown } from "./types";

/**
 * Max drawdown: the biggest drop from a running peak to a later low, as a fraction of the peak.
 * [100, 120, 60, 90, 130] → 50 % (from 120 down to 60).
 */
export function maxDrawdown(values: number[]): Drawdown {
  let result: Drawdown = { depth: 0, peakIndex: 0, troughIndex: 0 };
  let peakIndex = 0;

  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[peakIndex]) {
      peakIndex = i;
      continue;
    }
    const depth = 1 - values[i] / values[peakIndex];
    if (depth > result.depth) result = { depth, peakIndex, troughIndex: i };
  }
  return result;
}
