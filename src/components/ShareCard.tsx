"use client";

import { forwardRef, useLayoutEffect, useRef } from "react";
import { brand } from "@/brand.config";
import type { SimulationResult } from "@/lib/calc";
import { chartRows, chartSeries } from "@/lib/chart-data";
import { fitFontSize, heroFontSize, type ShareContent } from "@/lib/share-content";
import { SeriesSwatch, ValueChart } from "./ValueChart";

export const STORY_WIDTH = 1080;
export const STORY_HEIGHT = 1920;
const PAD_X = 96;
const CONTENT_WIDTH = STORY_WIDTH - 2 * PAD_X;

interface Props {
  result: SimulationResult;
  content: ShareContent;
}

/**
 * The 1080×1920 Instagram story, rendered off-screen and turned into a PNG by html-to-image.
 * Instagram covers roughly the top and bottom 200 px with its own UI, so the important parts sit
 * inside that safe area. Only the winning asset and the "invested" line are drawn: a story is
 * seen for a few seconds, five lines would not be readable.
 */
export const ShareCard = forwardRef<HTMLDivElement, Props>(function ShareCard({ result, content }, ref) {
  const heroRef = useRef<HTMLSpanElement>(null);

  // The font-size guess is approximate; measure the real width and scale the number to fill the
  // line exactly. Runs before the image is captured (layout effects run before the parent's effects).
  useLayoutEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    for (let i = 0; i < 2; i++) {
      const size = parseFloat(el.style.fontSize);
      el.style.fontSize = `${fitFontSize(size, el.offsetWidth, CONTENT_WIDTH)}px`;
    }
  }, [content.hero]);

  const series = chartSeries(result).filter((s) => s.key === content.asset || s.key === "invested");
  const rows = chartRows(result, series);
  const site = brand.siteUrl.replace(/^https?:\/\//, "");

  return (
    <div
      ref={ref}
      className="flex flex-col font-sans"
      style={{
        width: STORY_WIDTH,
        height: STORY_HEIGHT,
        padding: `200px ${PAD_X}px 150px`,
        background: brand.colors.bg,
        color: brand.colors.fg,
      }}
    >
      <p style={{ fontSize: 52, fontWeight: 700, letterSpacing: "-0.02em" }}>
        Co kdybych<span style={{ color: brand.colors.accent }}>?</span>
      </p>

      <p style={{ marginTop: 56, fontSize: 44, lineHeight: 1.25, color: brand.colors.muted }}>{content.scenario}</p>
      <p style={{ marginTop: 12, lineHeight: 1.05, height: 200, display: "flex", alignItems: "center" }}>
        <span
          ref={heroRef}
          className="tabular"
          style={{
            display: "inline-block",
            fontSize: heroFontSize(content.hero, CONTENT_WIDTH),
            fontWeight: 700,
            letterSpacing: "-0.03em",
            color: brand.colors.accent,
            whiteSpace: "nowrap",
          }}
        >
          {content.hero}
        </span>
      </p>
      <p className="tabular" style={{ marginTop: 12, fontSize: 36, color: brand.colors.muted }}>
        {content.details}
      </p>

      <div style={{ marginTop: 48, display: "flex", gap: 40, fontSize: 30, color: brand.colors.muted }}>
        {series.map((s) => (
          <span key={s.key} style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ display: "inline-flex", transform: "scale(2)", transformOrigin: "left center", width: 32 }}>
              <SeriesSwatch color={s.color} dashed={s.dashed} />
            </span>
            {s.label}
          </span>
        ))}
      </div>
      <div style={{ marginTop: 16 }}>
        <ValueChart
          rows={rows}
          series={series}
          width={CONTENT_WIDTH}
          height={480}
          interactive={false}
          fontSize={26}
          strokeWidth={6}
        />
      </div>

      <p
        style={{
          marginTop: 48,
          padding: "40px 44px",
          borderRadius: 40,
          background: brand.colors.accent,
          color: brand.colors.onAccent,
          fontSize: 46,
          lineHeight: 1.25,
          fontWeight: 700,
        }}
      >
        {content.hook}
      </p>

      <div style={{ marginTop: "auto" }}>
        <p style={{ fontSize: 40, fontWeight: 700, color: brand.colors.accent }}>{site}</p>
        <p style={{ marginTop: 12, fontSize: 24, lineHeight: 1.4, color: brand.colors.muted }}>{brand.disclaimer}</p>
      </div>
    </div>
  );
});
