import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo";

const PUBLIC_ROUTES = [
  "",
  "/tools",
  "/tools/duct-calculator",
  "/tools/air-distribution",
  "/tools/air-properties",
  "/tools/psychrometric-calculator",
  "/about",
  "/contact",
  "/engineering-disclaimer",
  "/terms",
  "/privacy",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_ROUTES.map((path) => ({
    url: `${SITE_URL}${path || "/"}`,
  }));
}
