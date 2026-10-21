import type { MetadataRoute } from "next";
import { brand } from "@/brand.config";
import { market } from "@/lib/market";

export default function sitemap(): MetadataRoute.Sitemap {
  // The page changes when the data are refreshed.
  const lastModified = new Date(market.generatedAt);
  return [
    { url: brand.siteUrl, lastModified, changeFrequency: "monthly", priority: 1 },
    { url: `${brand.siteUrl}/o-projektu`, lastModified, changeFrequency: "yearly", priority: 0.3 },
  ];
}
