import type { CSSProperties } from "react";
import type { Metadata, Viewport } from "next";
import { brand } from "@/brand.config";
import { brandFont } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: brand.name,
  description: brand.tagline,
};

export const viewport: Viewport = {
  themeColor: brand.colors.bg,
  colorScheme: "dark",
};

// Brand colors as CSS variables (--brand-bg, --brand-accent, …), read by globals.css.
const brandVars = Object.fromEntries(
  Object.entries(brand.colors).map(([name, value]) => [`--brand-${name}`, value]),
) as CSSProperties;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="cs" className={`${brandFont.variable} h-full antialiased`} style={brandVars}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
