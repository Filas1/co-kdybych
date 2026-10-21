"use client";

import dynamic from "next/dynamic";
import { brand } from "@/brand.config";
import { ASSETS } from "@/lib/assets";
import type { AssetResult, AvailableAssetResult, SimulationResult } from "@/lib/calc";
import {
  formatCzk,
  formatCzkSigned,
  formatMonth,
  formatMonthEnd,
  formatMonthGenitive,
  formatPercent,
  formatPercentSigned,
} from "@/lib/format";
import type { CalculatorInputs, InputError } from "@/lib/inputs";
import { savingsRateIsEstimate } from "@/lib/market";
import { ModeToggle } from "./ModeToggle";
import { SavingsRateField } from "./SavingsRateField";
import { ShareBar } from "./ShareBar";

// The chart library is the biggest piece of JavaScript on the page. Loading it separately lets the
// numbers show up first; the placeholder keeps the same height so nothing jumps when it arrives.
const ChartSection = dynamic(() => import("./ChartSection").then((m) => m.ChartSection), {
  ssr: false,
  loading: () => <div className="h-[392px] rounded-3xl bg-surface motion-safe:animate-pulse" aria-hidden />,
});

interface Props {
  inputs: CalculatorInputs;
  errors: InputError[];
  result: SimulationResult | null;
  lesson: string | null;
  /** Serialized inputs, used for the shareable link. */
  query: string;
  onChange: (patch: Partial<CalculatorInputs>) => void;
}

export function Results({ inputs, errors, result, lesson, query, onChange }: Props) {
  const savingsRate = savingsRateIsEstimate && inputs.assets.includes("savings") && (
    <SavingsRateField rate={inputs.savingsRate} errors={errors} onChange={(savingsRate) => onChange({ savingsRate })} />
  );

  if (!result) {
    return (
      <section className="space-y-4" aria-live="polite">
        <ModeToggle real={inputs.real} onChange={(real) => onChange({ real })} />
        {savingsRate}
        <p className="rounded-3xl border border-dashed border-line p-6 text-muted">Oprav zadání a výsledek se hned ukáže.</p>
      </section>
    );
  }

  const available = result.assets
    .filter((a): a is AvailableAssetResult => a.available)
    .sort((a, b) => b.finalValue - a.finalValue);
  const unavailable = result.assets.filter((a) => !a.available);
  const first = result.months[0];
  const last = result.months.at(-1)!;

  return (
    <section className="space-y-4" aria-label="Výsledky">
      <ModeToggle real={inputs.real} onChange={(real) => onChange({ real })} />

      <div className="px-1" aria-live="polite">
        <p className="text-sm text-muted">
          {formatMonth(first)} – {formatMonth(last)} · {result.months.length} vkladů
        </p>
        <p className="text-muted">
          {result.real ? "Vloženo v dnešních korunách" : "Vloženo celkem"}{" "}
          <span className="tabular text-2xl font-bold text-fg">{formatCzk(result.totalInvested)}</span>
        </p>
      </div>

      {lesson && (
        <p className="rounded-3xl bg-accent p-5 text-lg font-bold leading-snug text-balance text-on-accent">{lesson}</p>
      )}

      <ChartSection result={result} />

      <ShareBar result={result} inputs={inputs} query={query} />

      <ul className="grid gap-3 sm:grid-cols-2">
        {available.map((asset) => (
          <li key={asset.id}>
            <AssetCard asset={asset} result={result}>
              {asset.id === "savings" && savingsRate}
            </AssetCard>
          </li>
        ))}
        {unavailable.map((asset) => (
          <li key={asset.id}>
            <UnavailableCard asset={asset} onStart={(start) => onChange({ start })} />
          </li>
        ))}
      </ul>

      <p className="px-1 text-sm text-muted">
        Hodnoty k {formatMonthEnd(last)}.{" "}
        {result.real ? "Všechno přepočtené inflací na dnešní ceny." : "Nominálně, bez vlivu inflace."}
      </p>
    </section>
  );
}

function AssetName({ id }: { id: AssetResult["id"] }) {
  return (
    <h3 className="flex items-center gap-2 font-medium">
      <span className="size-3 rounded-full" style={{ background: brand.assetColors[id] }} aria-hidden />
      {ASSETS[id].label}
    </h3>
  );
}

function subtitle(asset: AvailableAssetResult, result: SimulationResult): string | null {
  if (asset.id === "cash") return "Pod polštářem";
  if (asset.id === "savings") {
    return result.savingsRateSource === "cnb" ? "Průměrné sazby spořáků podle ČNB" : "Stálá sazba, kterou nastavíš níž";
  }
  return null;
}

function AssetCard({
  asset,
  result,
  children,
}: {
  asset: AvailableAssetResult;
  result: SimulationResult;
  children?: React.ReactNode;
}) {
  const note = subtitle(asset, result);
  const { depth, peakIndex, troughIndex } = asset.maxDrawdown;
  const hasDrawdown = depth >= 0.0005;
  const gainClass = asset.profit >= 0.5 ? "text-gain" : asset.profit <= -0.5 ? "text-loss" : "text-muted";

  return (
    <article className="h-full space-y-3 rounded-3xl bg-surface p-5">
      <div>
        <AssetName id={asset.id} />
        {note && <p className="text-sm text-muted">{note}</p>}
      </div>
      <div>
        <p className="tabular text-3xl font-bold tracking-tight">{formatCzk(asset.finalValue)}</p>
        <p className={`tabular font-medium ${gainClass}`}>
          {formatCzkSigned(asset.profit)} · {formatPercentSigned(asset.profitPct)}
        </p>
      </div>
      <dl className="space-y-2 border-t border-line pt-3 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Ročně v průměru (XIRR)</dt>
          <dd className="tabular font-medium">{asset.xirr === null ? "–" : formatPercent(asset.xirr)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted">Největší propad</dt>
          <dd className="tabular text-right font-medium">{hasDrawdown ? formatPercentSigned(-depth) : "Žádný"}</dd>
        </div>
        {hasDrawdown && (
          <p className="text-right text-xs text-muted">
            {formatMonth(result.months[peakIndex])} → {formatMonth(result.months[troughIndex])}
          </p>
        )}
      </dl>
      {children}
    </article>
  );
}

function UnavailableCard({
  asset,
  onStart,
}: {
  asset: Extract<AssetResult, { available: false }>;
  onStart: (start: string) => void;
}) {
  return (
    <article className="h-full space-y-3 rounded-3xl border border-dashed border-line p-5">
      <AssetName id={asset.id} />
      {asset.availableFrom ? (
        <>
          <p className="text-sm text-muted">
            Data jsou až od {formatMonthGenitive(asset.availableFrom)}, takže pro tvůj start ho nepočítám.
          </p>
          <button
            type="button"
            onClick={() => onStart(asset.availableFrom!)}
            className="min-h-11 text-sm text-accent underline-offset-4 hover:underline"
          >
            Začít od {formatMonthGenitive(asset.availableFrom)}
          </button>
        </>
      ) : (
        <p className="text-sm text-muted">Pro tohle aktivum zatím nemám data.</p>
      )}
    </article>
  );
}
