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
vi.mock("next/cache", () => ({
  unstable_cache: (loader: (...args: unknown[]) => Promise<unknown>) => loader,
}));
vi.mock("next/navigation", () => ({
  redirect: mocks.redirect,
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}));

import AdminMailPage from "@/app/admin/mail/page";
import AdminPage from "@/app/admin/page";

const SECRET = "test-session-secret-with-at-least-32-bytes-long";

beforeEach(() => {
  process.env.ADMIN_SESSION_SECRET = SECRET;
  delete process.env.BEEHIIV_ADMIN_API_KEY;
  delete process.env.BEEHIIV_PUBLICATION_ID;
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

  it("keeps Beehiiv credentials and unexpected subscriber data out of authenticated markup", async () => {
    const publicationId = "pub_11111111-1111-1111-1111-111111111111";
    const apiKey = "beehiiv-route-test-private-key";
    process.env.BEEHIIV_ADMIN_API_KEY = apiKey;
    process.env.BEEHIIV_PUBLICATION_ID = publicationId;
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: {
        id: publicationId,
        stats: {
          active_subscriptions: 8,
          total_sent: 1,
          average_open_rate: 0.5,
          average_click_rate: 0.25,
        },
        subscribers: [{ email: "private-subscriber@example.com" }],
      },
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const token = createAdminSession(SECRET);
    mocks.cookies.mockResolvedValue({
      get: (name: string) => name === ADMIN_SESSION_COOKIE ? { value: token } : undefined,
    });

    const markup = renderToStaticMarkup(await AdminPage());
    expect(markup).toContain("<strong>8</strong> subscribers");
    expect(markup).not.toContain(apiKey);
    expect(markup).not.toContain(publicationId);
    expect(markup).not.toContain("private-subscriber@example.com");
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
          beehiiv: { state: "not-connected", data: null },
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
          beehiiv: { state: "not-connected", data: null },
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
        integrations={{
          beehiiv: { state: "not-connected", data: null },
          resend: { state: "unavailable", data: null },
        }}
      />,
    );
    expect(markup).toContain("Unavailable");
    expect(markup).toContain("Website Traffic");
    expect(markup).toContain("Google Search");
    expect(markup).toContain("Newsletter");
    expect(markup).toContain("Trend data not connected");
  });

  it("renders Beehiiv counts and rates with a Connected health state", () => {
    const markup = renderToStaticMarkup(
      <ControlRoomDashboard integrations={{
        beehiiv: {
          state: "connected",
          data: { activeSubscribers: 1234, averageOpenRate: 80, averageClickRate: 45 },
        },
        resend: { state: "not-connected", data: null },
      }} />,
    );
    expect(markup).toContain("<strong>1,234</strong> subscribers");
    expect(markup).toContain("80% avg. open");
    expect(markup).toContain("45% avg. click");
    expect(markup).toMatch(/Newsletter<\/strong><span>Beehiiv<\/span><\/div><span[^>]*>Connected/);
    expect(markup).toContain("Trend data not connected");
  });

  it("renders zero subscribers as Connected and missing engagement neutrally", () => {
    const markup = renderToStaticMarkup(
      <ControlRoomDashboard integrations={{
        beehiiv: {
          state: "connected",
          data: { activeSubscribers: 0, averageOpenRate: null, averageClickRate: null },
        },
        resend: { state: "not-connected", data: null },
      }} />,
    );
    expect(markup).toContain("<strong>0</strong> subscribers");
    expect(markup).toContain("— avg. open");
    expect(markup).toContain("— avg. click");
    expect(markup).not.toContain("0% avg.");
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
