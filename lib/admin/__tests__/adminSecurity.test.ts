import bcrypt from "bcryptjs";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { POST as login } from "@/app/api/admin/login/route";
import { POST as logout } from "@/app/api/admin/logout/route";
import { POST as send } from "@/app/api/admin/send/route";
import {
  ADMIN_FROM,
  ADMIN_LOGO_URL,
  ADMIN_REPLY_TO,
  createAdminEmailContent,
} from "@/lib/admin/mail";
import { resetLoginLimitsForTests } from "@/lib/admin/rate-limit";
import {
  ADMIN_SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  adminSessionCookieOptions,
  createAdminSession,
  getAdminSessionExpiration,
  verifyAdminSession,
} from "@/lib/admin/session";

const SECRET = "test-session-secret-with-at-least-32-bytes-long";
const ORIGIN = "http://localhost";
const REQUEST_ID = "48d3b43d-0e2f-4ed8-bbfd-c8f47432ca62";
let pinHash = "";

function request(
  path: string,
  body?: unknown,
  options: { cookie?: string; ip?: string; origin?: string } = {},
) {
  const headers = new Headers({
    origin: options.origin ?? ORIGIN,
    "x-real-ip": options.ip ?? "203.0.113.10",
  });
  if (body !== undefined) headers.set("content-type", "application/json");
  if (options.cookie) headers.set("cookie", options.cookie);
  return new NextRequest(`${ORIGIN}${path}`, {
    method: "POST",
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function authenticatedCookie(now = Date.now()) {
  return `${ADMIN_SESSION_COOKIE}=${createAdminSession(SECRET, now)}`;
}

beforeAll(async () => {
  pinHash = await bcrypt.hash("123456", 4);
});

beforeEach(() => {
  process.env.ADMIN_USERNAME = "cesar";
  process.env.ADMIN_PIN_HASH = pinHash;
  process.env.ADMIN_SESSION_SECRET = SECRET;
  process.env.RESEND_API_KEY = "test-resend-key";
  resetLoginLimitsForTests();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("admin login", () => {
  it("creates a secure signed session for valid credentials", async () => {
    const result = await login(request("/api/admin/login", { username: "cesar", pin: "123456" }));
    const body = await result.json();

    expect(result.status).toBe(200);
    expect(body.authenticated).toBe(true);
    const setCookie = result.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain(`${ADMIN_SESSION_COOKIE}=`);
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=strict");
    expect(setCookie).toContain("Path=/");
    expect(setCookie).toContain(`Max-Age=${SESSION_TTL_SECONDS}`);
  });

  it.each([
    ["invalid username", { username: "somebody", pin: "123456" }],
    ["invalid PIN", { username: "cesar", pin: "654321" }],
    ["malformed PIN", { username: "cesar", pin: "12ab" }],
  ])("returns the same generic response for %s", async (_name, credentials) => {
    const result = await login(request("/api/admin/login", credentials));
    expect(result.status).toBe(401);
    expect(await result.json()).toMatchObject({
      authenticated: false,
      error: "Invalid username or PIN.",
    });
  });

  it("returns 429 after repeated failures", async () => {
    const statuses: number[] = [];
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const result = await login(
        request("/api/admin/login", { username: "cesar", pin: "000000" }, { ip: "198.51.100.8" }),
      );
      statuses.push(result.status);
    }
    expect(statuses).toEqual([401, 401, 401, 401, 429]);

    const blocked = await login(
      request("/api/admin/login", { username: "cesar", pin: "123456" }, { ip: "198.51.100.8" }),
    );
    expect(blocked.status).toBe(429);
  });
});

describe("signed admin sessions", () => {
  it("accepts a valid session", () => {
    const now = Date.now();
    const token = createAdminSession(SECRET, now);
    expect(verifyAdminSession(token, SECRET, now)).toBe(true);
    expect(getAdminSessionExpiration(token, SECRET, now)).toBe(
      Math.floor(now / 1000) * 1000 + SESSION_TTL_SECONDS * 1000,
    );
  });

  it("rejects missing, expired, invalid, and tampered sessions", () => {
    const oldNow = Date.now() - (SESSION_TTL_SECONDS + 1) * 1000;
    const token = createAdminSession(SECRET);
    expect(verifyAdminSession(undefined, SECRET)).toBe(false);
    expect(verifyAdminSession(createAdminSession(SECRET, oldNow), SECRET)).toBe(false);
    expect(verifyAdminSession("invalid", SECRET)).toBe(false);
    expect(verifyAdminSession(`${token.slice(0, -1)}x`, SECRET)).toBe(false);
  });

  it("logout deletes the session cookie", async () => {
    const result = await logout(request("/api/admin/logout"));
    expect(result.status).toBe(200);
    expect(result.headers.get("set-cookie")).toContain(`${ADMIN_SESSION_COOKIE}=;`);
    expect(result.headers.get("set-cookie")).toContain("Max-Age=0");
  });

  it("keeps the original HttpOnly, strict, root-path, 30-minute cookie policy", () => {
    expect(adminSessionCookieOptions).toMatchObject({
      httpOnly: true,
      sameSite: "strict",
      path: "/",
      maxAge: 30 * 60,
      priority: "high",
    });
  });
});

describe("admin mail API", () => {
  const validMail = {
    to: "recipient@example.com",
    subject: "Service follow-up",
    message: "Hello,\nThank you.",
    requestId: REQUEST_ID,
  };

  it("rejects an unauthenticated send", async () => {
    const result = await send(request("/api/admin/send", validMail));
    expect(result.status).toBe(401);
  });

  it("rejects a send when the signed session has expired", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const expiredAt = Date.now() - (SESSION_TTL_SECONDS + 1) * 1000;
    const result = await send(
      request("/api/admin/send", validMail, {
        cookie: authenticatedCookie(expiredAt),
      }),
    );
    expect(result.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid recipient", async () => {
    const result = await send(
      request("/api/admin/send", { ...validMail, to: "first@example.com,second@example.com" }, {
        cookie: authenticatedCookie(),
      }),
    );
    expect(result.status).toBe(400);
    expect(await result.json()).toMatchObject({ fields: { to: expect.any(String) } });
  });

  it.each([
    ["subject", { subject: "" }],
    ["message", { message: "" }],
  ])("rejects an empty %s", async (field, override) => {
    const result = await send(
      request("/api/admin/send", { ...validMail, ...override }, { cookie: authenticatedCookie() }),
    );
    expect(result.status).toBe(400);
    expect(await result.json()).toMatchObject({ fields: { [field]: expect.any(String) } });
  });

  it("does not allow the request to override From", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const result = await send(
      request(
        "/api/admin/send",
        { ...validMail, from: "Attacker <attacker@example.com>" },
        { cookie: authenticatedCookie() },
      ),
    );
    expect(result.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("escapes message HTML and preserves line breaks", () => {
    const content = createAdminEmailContent('<script>alert("x")</script>\nNext line');
    expect(content.html).not.toContain("<script>");
    expect(content.html).toContain("&lt;script&gt;");
    expect(content.html).toContain("&quot;x&quot;");
    expect(content.html).toContain("<br>Next line");
    expect(content.html).toContain(ADMIN_LOGO_URL);
  });

  it("sends fixed sender, reply-to, HTML and plain text through Resend", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "email_123" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await send(
      request("/api/admin/send", validMail, { cookie: authenticatedCookie() }),
    );
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({ delivered: true });
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const payload = JSON.parse(String(options.body));
    expect(payload).toMatchObject({
      from: ADMIN_FROM,
      reply_to: ADMIN_REPLY_TO,
      to: ["recipient@example.com"],
      subject: "Service follow-up",
    });
    expect(payload.html).toContain("Hello,<br>Thank you.");
    expect(payload.text).toContain("Hello,\nThank you.");
    expect(new Headers(options.headers).get("Idempotency-Key")).toBe(
      `admin-mail/${REQUEST_ID}`,
    );
  });

  it("uses a stable Resend idempotency key to prevent duplicate acceptance", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "email_123" }), { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await send(request("/api/admin/send", validMail, { cookie: authenticatedCookie() }));
    await send(request("/api/admin/send", validMail, { cookie: authenticatedCookie() }));
    const keys = fetchMock.mock.calls.map((call) =>
      new Headers((call[1] as RequestInit).headers).get("Idempotency-Key"),
    );
    expect(keys).toEqual([`admin-mail/${REQUEST_ID}`, `admin-mail/${REQUEST_ID}`]);
  });

  it("returns a safe error when Resend fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "private provider detail" }), { status: 422 })),
    );
    const result = await send(
      request("/api/admin/send", validMail, { cookie: authenticatedCookie() }),
    );
    expect(result.status).toBe(502);
    expect(JSON.stringify(await result.json())).not.toContain("private provider detail");
  });
});
