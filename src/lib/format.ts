// Czech number/date formatting. Intl uses a non-breaking space (U+00A0) as the
// thousands separator and before "Kč" / "%", so values never wrap mid-number.

const czk = new Intl.NumberFormat("cs-CZ", {
  style: "currency",
  currency: "CZK",
  maximumFractionDigits: 0,
});

const czkSigned = new Intl.NumberFormat("cs-CZ", {
  style: "currency",
  currency: "CZK",
  maximumFractionDigits: 0,
  signDisplay: "exceptZero",
});

const compact = new Intl.NumberFormat("cs-CZ", { notation: "compact", maximumFractionDigits: 1 });

const percentByDigits = new Map<number, Intl.NumberFormat>();

const percentSigned = new Intl.NumberFormat("cs-CZ", {
  style: "percent",
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});

const monthYear = new Intl.DateTimeFormat("cs-CZ", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * Intl prints "-0" for tiny negative numbers like -0.0000001 (a float rounding leftover).
 * Anything that would display as zero is turned into a real zero first.
 */
function cleanZero(value: number, decimals: number): number {
  return Math.abs(value) < 0.5 * 10 ** -decimals ? 0 : value;
}

/** 1234567 → "1 234 567 Kč" */
export function formatCzk(value: number): string {
  return czk.format(cleanZero(value, 0));
}

/** 12345 → "+12 345 Kč", -500 → "-500 Kč" (for gains/losses) */
export function formatCzkSigned(value: number): string {
  return czkSigned.format(cleanZero(value, 0));
}

/** Short form for chart axes: 200000 → "200 tis.", 11625694 → "11,6 mil." */
export function formatCompact(value: number): string {
  return compact.format(cleanZero(value, 0));
}

/** 0.123 → "12,3 %" (input is a fraction, not a percentage); maxDigits 0 → "12 %" */
export function formatPercent(fraction: number, maxDigits = 1): string {
  let format = percentByDigits.get(maxDigits);
  if (!format) {
    format = new Intl.NumberFormat("cs-CZ", { style: "percent", maximumFractionDigits: maxDigits });
    percentByDigits.set(maxDigits, format);
  }
  return format.format(cleanZero(fraction, maxDigits + 2));
}

/** 0.123 → "+12,3 %" */
export function formatPercentSigned(fraction: number): string {
  return percentSigned.format(cleanZero(fraction, 3));
}

const monthName = new Intl.DateTimeFormat("cs-CZ", { month: "long", timeZone: "UTC" });

/** 1 → "leden", 12 → "prosinec" */
export function formatMonthName(monthNumber: number): string {
  return monthName.format(new Date(Date.UTC(2000, monthNumber - 1, 1)));
}

const dayMonthYear = new Intl.DateTimeFormat("cs-CZ", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * Genitive (2. pád) for phrases like "od prosince 2014" or "do září 2026". Czech Intl uses the
 * genitive month name when a day is present ("1. prosince 2014"), so we format a full date and
 * keep only the month and year parts.
 */
export function formatMonthGenitive(month: string): string {
  const [year, monthIndex] = month.split("-").map(Number);
  const parts = dayMonthYear.formatToParts(new Date(Date.UTC(year, monthIndex - 1, 1)));
  const name = parts.find((p) => p.type === "month")!.value;
  return `${name} ${year}`;
}

/** Last day of a "YYYY-MM" month, e.g. "2026-09" → "30. září 2026". */
export function formatMonthEnd(month: string): string {
  const [year, monthIndex] = month.split("-").map(Number);
  return dayMonthYear.format(new Date(Date.UTC(year, monthIndex, 0)));
}

/** "2015-01" → "leden 2015" */
export function formatMonth(month: string): string {
  const [year, monthIndex] = month.split("-").map(Number);
  return monthYear.format(new Date(Date.UTC(year, monthIndex - 1, 1)));
}
