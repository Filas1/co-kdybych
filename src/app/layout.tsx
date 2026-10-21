import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

// Placeholder font until the brand font is chosen (step 4).
// "latin-ext" is required for Czech diacritics (ř, ě, ů, …); without it they fall back to a system font.
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  title: "Co kdybych?",
  description: "Kolik bys dnes měl, kdybys pravidelně investoval? Spočítej si to.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="cs" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
