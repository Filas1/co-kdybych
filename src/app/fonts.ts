import { Space_Grotesk } from "next/font/google";

// Variable font, self-hosted by Next.js at build time (no request to Google from the visitor).
// "latin-ext" covers Czech diacritics (ř, ě, ů, …).
export const brandFont = Space_Grotesk({
  variable: "--font-brand",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});
