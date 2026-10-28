import type { MetadataRoute } from "next";
import { siteUrl } from "@/config/marca";
import { CATEGORIES } from "@/lib/catalog";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return [
    { url: `${base}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/muebles`, changeFrequency: "monthly", priority: 0.9 },
    ...CATEGORIES.map((c) => ({ url: `${base}/muebles/${c.slug}`, changeFrequency: "monthly" as const, priority: 0.8 })),
    { url: `${base}/privacidad`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
