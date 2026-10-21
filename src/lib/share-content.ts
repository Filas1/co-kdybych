// Text for the Instagram story image: one big number, a short line about the scenario and a hook.
// Pure, so it is unit-tested; the visual layout lives in components/ShareCard.tsx.

import { ASSETS, type AssetId } from "./assets";
import { lessonSentence, type AvailableAssetResult, type SimulationResult } from "./calc";
import { formatCzk, formatMonthGenitive, formatPercentSigned } from "./format";
import type { CalculatorInputs } from "./inputs";

/** Instagram story size in px. */
export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;

export interface ShareContent {
  /** The asset the big number belongs to (the one that ended highest). */
  asset: AssetId;
  /** "2 000 Kč měsíčně do Bitcoinu od ledna 2015" */
  scenario: string;
  /** "11 625 694 Kč" */
  hero: string;
  /** "Vloženo 282 000 Kč · +4 022,6 %" */
  details: string;
  /** The same rule-based lesson sentence as on the page. */
  hook: string;
}

export function shareContent(result: SimulationResult, inputs: CalculatorInputs): ShareContent | null {
  const available = result.assets.filter((a): a is AvailableAssetResult => a.available);
  if (available.length === 0) return null;
  const winner = available.reduce((best, a) => (a.finalValue > best.finalValue ? a : best));
  const meta = ASSETS[winner.id];
  const from = `od ${formatMonthGenitive(result.months[0])}`;

  let scenario: string;
  if (inputs.monthly > 0 && inputs.initial > 0) {
    scenario = `${formatCzk(inputs.initial)} hned a ${formatCzk(inputs.monthly)} měsíčně ${meta.into} ${from}`;
  } else if (inputs.monthly > 0) {
    scenario = `${formatCzk(inputs.monthly)} měsíčně ${meta.into} ${from}`;
  } else {
    scenario = `${formatCzk(inputs.initial)} jednorázově ${meta.into} ${from}`;
  }

  return {
    asset: winner.id,
    scenario,
    hero: formatCzk(winner.finalValue),
    details: `${result.real ? "V dnešních korunách. " : ""}Vloženo ${formatCzk(winner.invested)} · ${formatPercentSigned(winner.profitPct)}`,
    hook: lessonSentence(result) ?? "",
  };
}

/**
 * First guess of the font size (px) that fits the hero number on one line of the given width.
 * Measured in Space Grotesk bold, "3 870 764 Kč" averages ~0.46 em per character (narrow spaces),
 * all-digit strings up to ~0.5 em, hence 0.52. ShareCard then measures the real width and corrects.
 */
export function heroFontSize(text: string, maxWidth: number, maxSize = 190): number {
  return Math.min(maxSize, Math.floor(maxWidth / (text.length * 0.52)));
}

/** Scales a font size so text measured at `measuredWidth` fits `maxWidth` (never grows past maxSize). */
export function fitFontSize(fontSize: number, measuredWidth: number, maxWidth: number, maxSize = 190): number {
  if (measuredWidth <= 0) return fontSize;
  return Math.min(maxSize, Math.floor((fontSize * maxWidth) / measuredWidth));
}
