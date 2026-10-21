// Czech consumer price index (CPI) from the Czech Statistical Office (ČSÚ).
//
// Two official datasets are combined:
// - CEN0101E (new open-data platform): monthly index, base 2015 = 100, from 2015-01 to today.
// - 010022 (archive of the old public database): same index and base, 1995-01 to 2025-12, no longer updated.
// The new one wins wherever both exist; the archive only supplies months before 2015.
// The overlap (2015–2025) is used to check that both really are the same series.

import { parseCsvLine, splitLines } from "../lib/csv.ts";
import { fetchText } from "../lib/http.ts";
import { toMonth, type Month } from "../lib/months.ts";
import type { MonthlySeries, SourceResult } from "../lib/series.ts";

const SOURCE = "ČSÚ inflace (CPI)";

export const CPI_CURRENT_URL = "https://data.csu.gov.cz/opendata/sady/CEN0101E/distribuce/csv";
export const CPI_ARCHIVE_URL =
  "https://csu.gov.cz/docs/107508/cfcf22e1-06b0-92a6-cf41-fb554acc545a/010022-25data011326.csv?version=1.0";

/** Max allowed difference (index points) between the two datasets in overlapping months. */
const OVERLAP_TOLERANCE = 0.1;

function columnIndex(header: string[], name: string): number {
  const index = header.indexOf(name);
  if (index === -1) throw new Error(`[${SOURCE}] column "${name}" not found in CSV header`);
  return index;
}

/**
 * CEN0101E has many index types, categories and periods in one long table. We keep only:
 * base index 2015 = 100 (IZ2015), all items ("Úhrn", division 0, no sub-group),
 * all households, whole Czechia, plain months ("2015-01", not cumulative "2015-02K").
 */
export function parseCpiCurrent(text: string): MonthlySeries {
  const lines = splitLines(text);
  const header = parseCsvLine(lines[0]);
  const col = {
    indexType: columnIndex(header, "TYPUDAJE4A"),
    division: columnIndex(header, "CZCOICOP2.CZCOP1"),
    group: columnIndex(header, "CZCOICOP2.CZCOP23"),
    households: columnIndex(header, "EKAKTIOCDS"),
    region: columnIndex(header, "UZ02P"),
    period: columnIndex(header, "CASMKMQRM12"),
    value: columnIndex(header, "Hodnota"),
  };

  const series: MonthlySeries = new Map();
  for (const line of lines.slice(1)) {
    if (!line.includes('"IZ2015"')) continue; // cheap pre-filter; the file has ~260k rows
    const f = parseCsvLine(line);
    if (
      f[col.indexType] === "IZ2015" &&
      f[col.division] === "0" &&
      f[col.group] === "" &&
      f[col.households] === "0" &&
      f[col.region] === "CZ" &&
      /^\d{4}-\d{2}$/.test(f[col.period])
    ) {
      series.set(f[col.period], { value: Number(f[col.value]) });
    }
  }
  return series;
}

/**
 * Archive 010022: rows with casz_kod "Z" are indices against the average of the base year (2015),
 * an empty ucel_kod means the all-items total.
 */
export function parseCpiArchive(text: string): MonthlySeries {
  const lines = splitLines(text);
  const header = parseCsvLine(lines[0]);
  const col = {
    value: columnIndex(header, "hodnota"),
    category: columnIndex(header, "ucel_kod"),
    comparison: columnIndex(header, "casz_kod"),
    month: columnIndex(header, "mesic"),
    year: columnIndex(header, "rok"),
    baseFrom: columnIndex(header, "bazobdobiod"),
  };

  const series: MonthlySeries = new Map();
  for (const line of lines.slice(1)) {
    const f = parseCsvLine(line);
    if (f[col.category] !== "" || f[col.comparison] !== "Z") continue;
    if (f[col.baseFrom] !== "2015-01-01") {
      throw new Error(`[${SOURCE}] archive row with unexpected base period ${f[col.baseFrom]}`);
    }
    series.set(toMonth(Number(f[col.year]), Number(f[col.month])), { value: Number(f[col.value]) });
  }
  return series;
}

/**
 * Combines both datasets. Fails if they disagree in any overlapping month by more than rounding,
 * or if the archive does not reach the start of the current dataset.
 */
export function combineCpi(
  current: MonthlySeries,
  archive: MonthlySeries,
): { series: MonthlySeries; overlapMonths: number; maxDiff: number } {
  const firstCurrent = [...current.keys()].sort()[0];
  let overlapMonths = 0;
  let maxDiff = 0;

  for (const [month, { value }] of current) {
    const old = archive.get(month);
    if (!old) continue;
    overlapMonths++;
    maxDiff = Math.max(maxDiff, Math.abs(old.value - value));
  }
  if (overlapMonths === 0) throw new Error(`[${SOURCE}] datasets do not overlap, cannot verify them`);
  if (maxDiff > OVERLAP_TOLERANCE + 1e-9) {
    throw new Error(`[${SOURCE}] datasets disagree by up to ${maxDiff.toFixed(2)} points in the overlap`);
  }

  const series: MonthlySeries = new Map();
  for (const [month, point] of archive) {
    if (month < firstCurrent) series.set(month, point);
  }
  for (const [month, point] of current) series.set(month, point);

  const sortedMonths: Month[] = [...series.keys()].sort();
  return {
    series: new Map(sortedMonths.map((m) => [m, series.get(m)!])),
    overlapMonths,
    maxDiff,
  };
}

export async function fetchCzsoCpi(): Promise<SourceResult & { overlapMonths: number; maxDiff: number }> {
  const [currentText, archiveText] = await Promise.all([
    fetchText(SOURCE, CPI_CURRENT_URL),
    fetchText(SOURCE, CPI_ARCHIVE_URL),
  ]);
  const current = parseCpiCurrent(currentText);
  const archive = parseCpiArchive(archiveText);
  if (current.size === 0) throw new Error(`[${SOURCE}] no rows matched in CEN0101E`);
  if (archive.size === 0) throw new Error(`[${SOURCE}] no rows matched in archive 010022`);

  const { series, overlapMonths, maxDiff } = combineCpi(current, archive);
  return {
    series,
    overlapMonths,
    maxDiff,
    info: {
      name: "Český statistický úřad – indexy spotřebitelských cen",
      url: "https://csu.gov.cz/produkty/isc_cr",
      note: "Bazický index (průměr 2015 = 100), úhrn, domácnosti celkem. Sady CEN0101E a archiv 010022.",
    },
  };
}
