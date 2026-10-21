import type { CSSProperties } from "react";
import type { Metadata, Viewport } from "next";
import { brand } from "@/brand.config";
import { brandFont } from "./fonts";
import "./globals.css";

const description = `${brand.tagline} Porovnej S&P 500, zlato, Bitcoin, spořák a hotovost na skutečných datech od roku 2000.`;

export const metadata: Metadata = {
  // Makes the Open Graph image and canonical URLs absolute (required by social networks).
  metadataBase: new URL(brand.siteUrl),
  title: brand.name,
  description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "cs_CZ",
    url: "/",
    siteName: brand.name,
    title: brand.name,
    description,
  },
  twitter: { card: "summary_large_image", title: brand.name, description },
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
