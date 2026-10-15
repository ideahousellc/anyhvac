import { describe, expect, it } from "vitest";

import { metadata as adminMetadata } from "@/app/admin/layout";
import { metadata as publicMetadata } from "@/app/about/page";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import nextConfig from "@/next.config";

describe("admin SEO isolation", () => {
  it("marks every admin HTML route noindex and nofollow for general and Google crawlers", () => {
    expect(adminMetadata.robots).toMatchObject({
      index: false,
      follow: false,
      googleBot: { index: false, follow: false },
    });
  });

  it("does not accidentally noindex a public page", () => {
    expect(publicMetadata.robots).toBeUndefined();
  });

  it("discourages crawling of admin pages and admin APIs", () => {
    const config = robots();
    const rules = Array.isArray(config.rules) ? config.rules : [config.rules];
    const disallowed = rules.flatMap((rule) => {
      if (rule.userAgent !== "*") return [];
      return Array.isArray(rule.disallow) ? rule.disallow : rule.disallow ? [rule.disallow] : [];
    });
    const isDisallowed = (path: string) => disallowed.some((prefix) => path.startsWith(prefix));

    expect(isDisallowed("/admin/")).toBe(true);
    expect(isDisallowed("/admin/email")).toBe(true);
    expect(isDisallowed("/api/admin/email/send")).toBe(true);
    expect(isDisallowed("/tools/duct-calculator")).toBe(false);
  });

  it("keeps all private application routes out of the public sitemap", () => {
    const urls = sitemap().map((entry) => new URL(entry.url).pathname);
    expect(urls.some((path) => path === "/admin" || path.startsWith("/admin/"))).toBe(false);
    expect(urls.some((path) => path.startsWith("/api/admin/"))).toBe(false);
    expect(urls).toContain("/tools/duct-calculator");
    expect(urls).toContain("/resources");
  });

  it("adds noindex and nofollow response headers to admin pages and APIs", async () => {
    expect(nextConfig.headers).toBeTypeOf("function");
    const rules = await nextConfig.headers!();
    for (const source of ["/admin/:path*", "/api/admin/:path*"]) {
      const rule = rules.find((candidate) => candidate.source === source);
      expect(rule?.headers).toEqual(expect.arrayContaining([
        { key: "X-Robots-Tag", value: "noindex, nofollow" },
      ]));
    }
  });
});
