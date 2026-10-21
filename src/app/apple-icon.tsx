import { ImageResponse } from "next/og";
import { brand } from "@/brand.config";
import { ogFonts } from "@/lib/og-fonts";

// Home-screen icon for iOS (iOS rounds the corners itself, so the square stays square).

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
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
          color: brand.colors.accent,
          fontSize: 140,
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
