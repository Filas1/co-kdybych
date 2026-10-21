import { ImageResponse } from "next/og";
import { brand } from "@/brand.config";
import { ogFonts } from "@/lib/og-fonts";

// Favicon: the brand's lime question mark on the dark background.

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default async function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: brand.colors.bg,
          borderRadius: 14,
          color: brand.colors.accent,
          fontSize: 54,
          fontWeight: 700,
          fontFamily: "Space Grotesk",
        }}
      >
        ?
      </div>
    ),
    { ...size, fonts: ogFonts },
  );
}
