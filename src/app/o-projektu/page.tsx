import type { Metadata } from "next";
import Link from "next/link";
import { brand } from "@/brand.config";
import { Footer } from "@/components/Footer";
import { formatMonthGenitive } from "@/lib/format";
import { market } from "@/lib/market";
import { SERIES_KEYS, type SeriesKey } from "@/lib/market-data";

export const metadata: Metadata = {
  title: `O projektu, zdroje a soukromí – ${brand.name}`,
  description: "Jak kalkulačka počítá, odkud bere data, za jakých podmínek je používá a jak zachází se soukromím.",
  alternates: { canonical: "/o-projektu" },
};

/** Terms under which each source's data may be shown here, and how it asks to be credited. */
const SOURCE_TERMS: Record<SeriesKey, string> = {
  usdCzk: "Kurzy ČNB jsou veřejně dostupné. Uvádíme zdroj: Česká národní banka.",
  cpi: "Otevřená data ČSÚ (sady CEN0101E a 010022) lze volně používat s uvedením zdroje: Český statistický úřad.",
  sp500:
    "Měsíční upravené ceny ETF SPY přes rozhraní Alpha Vantage. Použití na veřejném webu řešíme s poskytovatelem.",
  gold: "Světová banka, Commodity Markets („Pink Sheet“), licence CC BY 4.0.",
  btc: "FRED, Federal Reserve Bank of St. Louis; řada CBBTCUSD od Coinbase. Použití vyžaduje citaci zdroje.",
  savingsRate: "Zdroj: ČNB ARAD. Pravidla ARAD dovolují data sdílet a vizualizovat s uvedením zdroje.",
};

const h2 = "text-2xl font-bold tracking-tight text-fg";
const link = "text-fg underline underline-offset-4 hover:text-accent";

export default function AboutPage() {
  const sources = SERIES_KEYS.filter((key) => market.sources[key].available);

  return (
    <>
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-12 px-4 pt-8 text-muted sm:pt-12">
        <header className="space-y-3">
          <Link href="/" className="text-sm text-accent underline-offset-4 hover:underline">
            ← Zpět na kalkulačku
          </Link>
          <h1 className="text-4xl font-bold tracking-tight text-fg sm:text-5xl">O projektu</h1>
          <p className="text-lg text-balance">
            {brand.name} je nekomerční projekt. Ukazuje, kolik by dnes měly peníze, které by někdo pravidelně posílal do
            akcií, zlata, Bitcoinu, na spořák nebo nechal pod polštářem. Nemá reklamy ani provize a nic neprodává.
          </p>
        </header>

        <section className="space-y-3" aria-labelledby="calc">
          <h2 id="calc" className={h2}>
            Jak se počítá
          </h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>Vklad proběhne vždy na konci měsíce za tehdejší cenu a kurz ČNB.</li>
            <li>Spořák se úročí každý měsíc průměrnou sazbou daného měsíce, hotovost je jen součet vkladů.</li>
            <li>„Dnešní koruny“ přepočítají každý vklad i hodnotu indexem spotřebitelských cen na ceny posledního měsíce.</li>
            <li>Roční zhodnocení je XIRR. Největší propad se počítá z ceny jednoho podílu, ne ze zůstatku.</li>
            <li>Bez poplatků a daní. Data končí {formatMonthGenitive(market.lastMonth)}.</li>
          </ul>
          <p>
            Podrobnou metodiku a zdrojový kód najdeš na{" "}
            <a href={brand.repoUrl} className={link} target="_blank" rel="noreferrer">
              GitHubu
            </a>
            .
          </p>
        </section>

        <section className="space-y-3" aria-labelledby="sources">
          <h2 id="sources" className={h2}>
            Zdroje dat a podmínky
          </h2>
          <ul className="space-y-4">
            {sources.map((key) => {
              const source = market.sources[key];
              return (
                <li key={key}>
                  <a href={source.url} className={`font-medium ${link}`} target="_blank" rel="noreferrer">
                    {source.name}
                  </a>
                  <p className="mt-1">{source.note}</p>
                  <p className="mt-1">{SOURCE_TERMS[key]}</p>
                </li>
              );
            })}
          </ul>
          <p>Data jsou přepočtená a zjednodušená na měsíční hodnoty. Poskytovatelé za tyto úpravy neodpovídají.</p>
        </section>

        <section className="space-y-3" aria-labelledby="trademarks">
          <h2 id="trademarks" className={h2}>
            Ochranné známky
          </h2>
          <p>
            S&P 500® je ochranná známka S&P Dow Jones Indices LLC. SPDR® a SPY jsou ochranné známky společnosti State
            Street. Tento web s nimi ani s poskytovateli dat není nijak spojen a nepodporují ho.
          </p>
        </section>

        <section className="space-y-3" aria-labelledby="privacy">
          <h2 id="privacy" className={h2}>
            Soukromí
          </h2>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-fg">Žádné cookies, analytika ani sledování.</strong> Web nic neukládá do tvého
              prohlížeče a nepoužívá měřicí ani reklamní nástroje.
            </li>
            <li>
              <strong className="text-fg">Výpočet běží jen u tebe.</strong> Zadané částky se počítají v prohlížeči a
              nikam se neposílají. Obrázek na story vzniká taky v prohlížeči.
            </li>
            <li>
              <strong className="text-fg">Hosting.</strong> Web běží na Vercelu (Vercel Inc., USA). Jako každý server
              ukládá technické záznamy o požadavcích, tedy IP adresu, čas a otevřenou adresu včetně parametrů v odkazu.
              Slouží k provozu a zabezpečení webu (oprávněný zájem, čl. 6 odst. 1 písm. f GDPR). Podrobnosti najdeš v{" "}
              <a href="https://vercel.com/legal/privacy-policy" className={link} target="_blank" rel="noreferrer">
                zásadách ochrany soukromí Vercelu
              </a>
              .
            </li>
            <li>
              <strong className="text-fg">Tvoje práva.</strong> Máš právo na přístup k údajům, jejich opravu nebo
              výmaz, omezení zpracování a vznesení námitky. Stížnost můžeš podat u{" "}
              <a href="https://uoou.gov.cz" className={link} target="_blank" rel="noreferrer">
                Úřadu pro ochranu osobních údajů
              </a>
              .
            </li>
          </ul>
          <p>
            Provozovatel: soukromá osoba, nekomerční projekt. Kontakt:{" "}
            <a href={`mailto:${brand.contactEmail}`} className={link}>
              {brand.contactEmail}
            </a>
          </p>
        </section>

        <section className="space-y-3" aria-labelledby="disclaimer">
          <h2 id="disclaimer" className={h2}>
            Upozornění
          </h2>
          <p className="text-fg">{brand.disclaimer}</p>
        </section>
      </main>
      <Footer />
    </>
  );
}
