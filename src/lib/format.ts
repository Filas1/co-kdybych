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

const percent = new Intl.NumberFormat("cs-CZ", {
  style: "percent",
  maximumFractionDigits: 1,
});

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

/** 1234567 → "1 234 567 Kč" */
export function formatCzk(value: number): string {
  return czk.format(value);
}

/** 12345 → "+12 345 Kč", -500 → "-500 Kč" (for gains/losses) */
export function formatCzkSigned(value: number): string {
  return czkSigned.format(value);
}

/** 0.123 → "12,3 %" (input is a fraction, not a percentage) */
export function formatPercent(fraction: number): string {
  return percent.format(fraction);
}

/** 0.123 → "+12,3 %" */
export function formatPercentSigned(fraction: number): string {
  return percentSigned.format(fraction);
}

/** "2015-01" → "leden 2015" */
export function formatMonth(month: string): string {
  const [year, monthIndex] = month.split("-").map(Number);
  return monthYear.format(new Date(Date.UTC(year, monthIndex - 1, 1)));
}
