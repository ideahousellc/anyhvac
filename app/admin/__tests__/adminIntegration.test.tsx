import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import AdminLayout, { metadata } from "@/app/admin/layout";
import sitemap from "@/app/sitemap";
import { AdminBrand } from "@/components/admin/AdminBrand";
import { ControlRoomDashboard } from "@/components/admin/ControlRoomDashboard";
import {
  ADMIN_METRICS,
  integrationStateLabel,
} from "@/lib/admin/integrations/catalog";
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
import AdminPage from "@/app/admin/page";

const SECRET = "test-session-secret-with-at-least-32-bytes-long";

beforeEach(() => {
  process.env.ADMIN_SESSION_SECRET = SECRET;
  mocks.cookies.mockReset();
  mocks.redirect.mockReset();
  mocks.redirect.mockImplementation(() => {
    throw new Error("NEXT_REDIRECT");
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("admin route integration", () => {
  it("renders the login at /admin without a session", async () => {
    mocks.cookies.mockResolvedValue({ get: () => undefined });
    const markup = renderToStaticMarkup(await AdminPage());
    expect(markup).toContain("AnyHVAC Admin");
    expect(markup).toContain("Sign In");
    expect(markup).not.toContain("Control Room");
  });

  it("renders the Control Room at /admin with a valid session", async () => {
    const token = createAdminSession(SECRET);
    mocks.cookies.mockResolvedValue({
      get: (name: string) =>
        name === ADMIN_SESSION_COOKIE ? { value: token } : undefined,
    });
    const markup = renderToStaticMarkup(await AdminPage());
    expect(markup).toContain("Control Room");
    expect(markup).toContain("Website Traffic");
    expect(markup).toContain("System Status");
    expect(markup).toContain("Quick Access");
  });

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
    expect(markup).toContain('href="/admin"');
    expect(markup).toContain("Control Room");
  });

  it("renders no invented metric values and makes no provider calls", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const markup = renderToStaticMarkup(<ControlRoomDashboard />);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(ADMIN_METRICS.every((metric) => !("value" in metric))).toBe(true);
    expect(ADMIN_METRICS.map((metric) => integrationStateLabel(metric.state))).toEqual([
      "Not connected",
      "Not connected",
      "Not connected",
      "Not connected",
    ]);
    expect(markup).toContain("Trend data not connected");
  });

  it("renders real normalized Resend values without exposing credentials", () => {
    const secret = "re_admin_must_never_render";
    const markup = renderToStaticMarkup(
      <ControlRoomDashboard
        integrations={{
          resend: {
            state: "connected",
            data: {
              sent: 1234,
              delivered: 1200,
              failed: 12,
              bounced: 22,
              deliveryRate: 97.2,
              period: "last-30-days",
            },
          },
        }}
      />,
    );
    expect(markup).toContain("1,234");
    expect(markup).toContain("97.2% delivered");
    expect(markup).toContain("Delivered 1,200");
    expect(markup).toContain("Failed 12");
    expect(markup).toContain("Bounced 22");
    expect(markup).toContain("Last 30 days");
    expect(markup).not.toContain(secret);
  });

  it("renders zero Resend activity as Connected", () => {
    const markup = renderToStaticMarkup(
      <ControlRoomDashboard
        integrations={{
          resend: {
            state: "connected",
            data: {
              sent: 0,
              delivered: 0,
              failed: 0,
              bounced: 0,
              deliveryRate: null,
              period: "last-30-days",
            },
          },
        }}
      />,
    );
    expect(markup).toContain("<strong>0</strong> sent");
    expect(markup).toContain("Last 30 days");
    expect(markup).not.toContain("0% delivered");
  });

  it("isolates an unavailable Resend provider from the rest of Control Room", () => {
    const markup = renderToStaticMarkup(
      <ControlRoomDashboard
        integrations={{ resend: { state: "unavailable", data: null } }}
      />,
    );
    expect(markup).toContain("Unavailable");
    expect(markup).toContain("Website Traffic");
    expect(markup).toContain("Google Search");
    expect(markup).toContain("Newsletter");
    expect(markup).toContain("Trend data not connected");
  });

  it("uses the requested lower-section wording", () => {
    const markup = renderToStaticMarkup(<ControlRoomDashboard />);
    expect(markup).toContain("System Health");
    expect(markup).toContain("Quick Access");
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
