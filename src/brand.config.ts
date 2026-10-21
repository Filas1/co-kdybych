// Single source of truth for the brand. The app layout turns `colors` into CSS variables, Tailwind
// maps them to utilities (bg-bg, text-accent, …), and the share image reads the same values.
// The brand is deliberately neutral: it is not tied to any personal social profile.

import type { AssetId } from "@/lib/assets";

export const brand = {
  name: "Co kdybych?",
  tagline: "Kolik by dnes měly tvoje peníze, kdyby každý měsíc pracovaly?",
  /**
   * Public URL, shown on the share image instead of a social handle. NEXT_PUBLIC_SITE_URL wins
   * (custom domain); otherwise Vercel's automatic production URL; localhost in development.
   */
  siteUrl:
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000"),

  /** Contact for the privacy notice (GDPR asks for a way to reach the operator). */
  contactEmail: "filasrt@gmail.com",
  /** Public source code, linked from the about page. */
  repoUrl: "https://github.com/Filas1/co-kdybych",

  /** Font family is loaded in src/app/fonts.ts (next/font needs a module-level call). */
  fontName: "Space Grotesk",

  /** Variant A "Noc": dark-only theme. */
  colors: {
    bg: "#0F0F14",
    surface: "#1A1A22",
    surfaceRaised: "#24242E",
    border: "#2E2E3A",
    fg: "#F5F5F0",
    muted: "#A09FAB",
    accent: "#C6F432",
    /** Text placed on top of the accent color. */
    onAccent: "#0F0F14",
    gain: "#C6F432",
    loss: "#FF7A7A",
    /** Recessive chart chrome: gridlines one step off the surface, the baseline a step further. */
    chartGrid: "#26262F",
    chartAxis: "#3A3A46",
  },

  /**
   * One color per asset, the same everywhere (cards, chart, share image). Checked with a
   * color-vision-deficiency validator against the dark background: the four hues stay apart
   * for all pairs; cash is neutral gray because in nominal mode it equals the "invested" line.
   */
  assetColors: {
    sp500: "#3987E5",
    gold: "#B98A10",
    btc: "#CC3F2A",
    savings: "#1AA676",
    cash: "#8F8E98",
  } satisfies Record<AssetId, string>,
  /** "Kolik jsem vložil" line in the chart (dashed, so it differs from cash). */
  investedColor: "#8F8E98",

  disclaimer:
    "Obsah je pouze informativní, nejde o finanční poradenství. Minulé výnosy nezaručují budoucí. Výpočet nezahrnuje poplatky ani daně.",
} as const;

export type BrandColor = keyof typeof brand.colors;
