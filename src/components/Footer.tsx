import { brand } from "@/brand.config";
import { formatMonthGenitive } from "@/lib/format";
import { market } from "@/lib/market";
import { SERIES_KEYS } from "@/lib/market-data";

const downloadedOn = new Intl.DateTimeFormat("cs-CZ", { dateStyle: "long", timeZone: "Europe/Prague" });

export function Footer() {
  const sources = SERIES_KEYS.map((key) => market.sources[key]).filter((s) => s.available);

  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto max-w-5xl space-y-4 px-4 py-8 text-sm text-muted">
        <p className="text-fg">{brand.disclaimer}</p>
        <p>
          Měsíční data do {formatMonthGenitive(market.lastMonth)}, stažená{" "}
          {downloadedOn.format(new Date(market.generatedAt))}. Ceny v USD přepočtené kurzem ČNB daného měsíce.
        </p>
        <div>
          <p className="mb-1">Zdroje dat:</p>
          <ul className="space-y-1">
            {sources.map((source) => (
              <li key={source.name}>
                <a href={source.url} className="underline underline-offset-4 hover:text-fg" target="_blank" rel="noreferrer">
                  {source.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
