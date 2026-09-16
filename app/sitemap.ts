import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/seo";

const PUBLIC_ROUTES = [
  "",
  "/tools",
  "/tools/duct-calculator",
  "/tools/air-distribution",
  "/tools/air-properties",
  "/tools/psychrometric-calculator",
  "/tools/mixed-air-calculator",
  "/resources",
  "/resources/duct-design-quick-reference",
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
