import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminLayout, { metadata } from "@/app/admin/layout";
import sitemap from "@/app/sitemap";
import { AdminBrand } from "@/components/admin/AdminBrand";
import { ADMIN_SESSION_COOKIE, createAdminSession } from "@/lib/admin/session";

const mocks = vi.hoisted(() => ({
  cookies: vi.fn(),
  redirect: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: mocks.cookies }));
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}));

import AdminMailPage from "@/app/admin/mail/page";

const SECRET = "test-session-secret-with-at-least-32-bytes-long";

beforeEach(() => {
  process.env.ADMIN_SESSION_SECRET = SECRET;
  mocks.cookies.mockReset();
  mocks.redirect.mockReset();
  mocks.redirect.mockImplementation(() => {
    throw new Error("NEXT_REDIRECT");
  });
});

describe("admin route integration", () => {
  it("redirects the protected mail page without a session", async () => {
    mocks.cookies.mockResolvedValue({ get: () => undefined });
    await expect(AdminMailPage()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.redirect).toHaveBeenCalledWith("/admin");
  });

  it("renders the protected mail page with a valid session", async () => {
    const token = createAdminSession(SECRET);
    mocks.cookies.mockResolvedValue({
      get: (name: string) =>
        name === ADMIN_SESSION_COOKIE ? { value: token } : undefined,
    });
    const page = await AdminMailPage();
    const markup = renderToStaticMarkup(page);
    expect(markup).toContain("AnyHVAC Admin");
    expect(markup).toContain("Send Email");
  });

  it("sets noindex and nofollow metadata for all admin pages", () => {
    expect(metadata.robots).toMatchObject({ index: false, follow: false });
    const markup = renderToStaticMarkup(
      <AdminLayout><AdminBrand /></AdminLayout>,
    );
    expect(markup).toContain("admin-shell");
  });

  it("does not include admin routes in the sitemap", () => {
    const includesAdmin = sitemap()
      .map((entry) => entry.url)
      .some((url) => url.includes("/admin"));
    expect(includesAdmin).toBe(false);
  });
});
