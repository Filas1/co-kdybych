import type { MetadataRoute } from "next";
import { brand } from "@/brand.config";
import { market } from "@/lib/market";

export default function sitemap(): MetadataRoute.Sitemap {
  // The page changes when the data are refreshed.
  return [{ url: brand.siteUrl, lastModified: new Date(market.generatedAt), changeFrequency: "monthly", priority: 1 }];
}
