import { ImageResponse } from "next/og";
import { brand } from "@/brand.config";
import { simulate, type AvailableAssetResult } from "@/lib/calc";
import { formatCzk, formatMonthGenitive } from "@/lib/format";
import { DEFAULT_INPUTS, clampStart } from "@/lib/inputs";
import { market } from "@/lib/market";
import { ogFonts } from "@/lib/og-fonts";

// Link preview (Messenger, WhatsApp, iMessage, X, …). Generated once at build time from the
// current data, so the example number is real and refreshes with every data update.

export const alt = "Co kdybych? Kalkulačka pravidelného investování";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const start = clampStart(DEFAULT_INPUTS.start, market);
  const example = simulate(market, {
    monthlyAmount: DEFAULT_INPUTS.monthly,
    initialDeposit: 0,
    startMonth: start,
    assets: ["sp500"],
    real: false,
  }).assets[0] as AvailableAssetResult;

  const { colors } = brand;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: colors.bg,
          color: colors.fg,
          fontFamily: "Space Grotesk",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 96, fontWeight: 700, letterSpacing: "-0.03em" }}>
            Co kdybych<span style={{ color: colors.accent }}>?</span>
          </div>
          <div style={{ display: "flex", marginTop: 8, fontSize: 40, color: colors.muted, maxWidth: 900 }}>
            {brand.tagline}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 32, color: colors.muted }}>
            {`${formatCzk(DEFAULT_INPUTS.monthly)} měsíčně do S&P 500 od ${formatMonthGenitive(start)}`}
          </div>
          <div style={{ display: "flex", fontSize: 120, fontWeight: 700, color: colors.accent, letterSpacing: "-0.03em" }}>
            {formatCzk(example.finalValue)}
          </div>
          <div style={{ display: "flex", fontSize: 30, color: colors.fg }}>Spočítej si to se svou částkou.</div>
        </div>
      </div>
    ),
    { ...size, fonts: ogFonts },
  );
}
