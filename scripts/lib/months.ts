// Month keys are "YYYY-MM" strings: sortable as plain strings and readable in JSON.

export type Month = string;

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isMonth(value: string): value is Month {
  return MONTH_RE.test(value);
}

export function toMonth(year: number, month: number): Month {
  return `${year}-${String(month).padStart(2, "0")}`;
}

/** Month containing the given UTC date. */
export function monthOf(date: Date): Month {
  return toMonth(date.getUTCFullYear(), date.getUTCMonth() + 1);
}

export function addMonths(month: Month, delta: number): Month {
  const [y, m] = month.split("-").map(Number);
  const index = y * 12 + (m - 1) + delta;
  return toMonth(Math.floor(index / 12), (index % 12) + 1);
}

/** Inclusive list of months from `from` to `to`. */
export function monthRange(from: Month, to: Month): Month[] {
  const out: Month[] = [];
  for (let m = from; m <= to; m = addMonths(m, 1)) out.push(m);
  return out;
}

/** Last month that is fully over (the current month is still running). */
export function lastCompleteMonth(now: Date = new Date()): Month {
  return addMonths(monthOf(now), -1);
}
