import type { MetadataRoute } from "next";
import { siteUrl } from "@/config/marca";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/proyecto", "/disenar/revision", "/disenar/solicitud", "/disenar/confirmacion"] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
