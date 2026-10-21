export interface CashFlow {
  /** Time of the flow in years from the first flow. */
  years: number;
  /** Negative = money in (deposit), positive = money out (final value). */
  amount: number;
}

const MS_PER_YEAR = 365 * 24 * 60 * 60 * 1000;

/** Years between two dates, using the same 365-day convention as Excel's XIRR. */
export function yearsBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / MS_PER_YEAR;
}

/**
 * XIRR: the yearly rate r at which all deposits, grown until the end, equal the final value:
 *   Σ amount_i · (1 + r)^(T − years_i) = 0
 * Unlike a simple average it respects timing: the first deposit worked for years, the last one
 * for a month.
 *
 * Written in "future value" form, the left side only falls as r grows when all deposits come
 * before the final payout (the regular-investing case), so there is exactly one root and
 * bisection always finds it. Returns null when the rate is undefined (all flows on one date,
 * no deposits or no payout) or lies outside (-99.99 %, 1 000 000 %).
 */
export function xirr(flows: CashFlow[]): number | null {
  if (!flows.some((f) => f.amount < 0) || !flows.some((f) => f.amount > 0)) return null;
  const end = Math.max(...flows.map((f) => f.years));
  const start = Math.min(...flows.map((f) => f.years));
  if (end - start <= 0) return null;

  const futureValue = (rate: number) =>
    flows.reduce((sum, f) => sum + f.amount * Math.pow(1 + rate, end - f.years), 0);

  let lo = -0.9999;
  let hi = 1;
  while (futureValue(hi) > 0) {
    hi *= 2;
    if (hi > 1e4) return null;
  }
  if (futureValue(lo) < 0) return null;

  for (let i = 0; i < 200 && hi - lo > 1e-12; i++) {
    const mid = (lo + hi) / 2;
    if (futureValue(mid) > 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}
