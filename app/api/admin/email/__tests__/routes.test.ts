import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { PATCH as readState } from "@/app/api/admin/email/read-state/route";
import { POST as send } from "@/app/api/admin/email/send/route";
import { ADMIN_SESSION_COOKIE, createAdminSession } from "@/lib/admin/session";
import { sendOutboundMail } from "@/lib/mail/outbound/service";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/mail/outbound/service", async (original) => {
  const actual = await original<typeof import("@/lib/mail/outbound/service")>();
  return { ...actual, sendOutboundMail: vi.fn() };
});
vi.mock("@/lib/mail/outbound/repository", () => ({ SupabaseOutboundMailRepository: class {} }));
const { setThreadReadState } = vi.hoisted(() => ({ setThreadReadState: vi.fn() }));
vi.mock("@/lib/mail/actions/repository", () => ({
  MailActionError: class MailActionError extends Error {},
  SupabaseMailActionRepository: class { setThreadReadState = setThreadReadState; },
}));

const origin = "http://localhost";
const secret = "test-session-secret-with-at-least-32-bytes-long";
const id = "48d3b43d-0e2f-4ed8-bbfd-c8f47432ca62";

function request(path: string, method: "POST" | "PATCH", body: object, authenticated = true, requestOrigin = origin) {
  const headers = new Headers({ origin: requestOrigin, "content-type": "application/json" });
  if (authenticated) headers.set("cookie", `${ADMIN_SESSION_COOKIE}=${createAdminSession(secret)}`);
  return new NextRequest(`${origin}${path}`, { method, headers, body: JSON.stringify(body) });
}

beforeEach(() => {
  process.env.ADMIN_SESSION_SECRET = secret;
  vi.mocked(sendOutboundMail).mockReset().mockResolvedValue({ threadId: id, messageId: "message" });
  setThreadReadState.mockReset().mockResolvedValue(true);
});

describe("Control Room email action routes", () => {
  it("requires the existing signed admin session and same-origin protection", async () => {
    const body = { mode: "compose", requestId: id, mailbox: "contact@anyhvac.net", to: "customer@example.com", subject: "Hello", message: "Body" };
    expect((await send(request("/api/admin/email/send", "POST", body, false))).status).toBe(401);
    expect((await send(request("/api/admin/email/send", "POST", body, true, "https://attacker.example"))).status).toBe(403);
    expect(sendOutboundMail).not.toHaveBeenCalled();
  });

  it("accepts a valid compose without accepting an arbitrary From address", async () => {
    const response = await send(request("/api/admin/email/send", "POST", { mode: "compose", requestId: id, mailbox: "support@anyhvac.net", to: "customer@example.com", subject: "Hello", message: "Body" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ delivered: true, persisted: true, threadId: id });
    const rejected = await send(request("/api/admin/email/send", "POST", { mode: "compose", requestId: id, mailbox: "attacker@example.com", to: "customer@example.com", subject: "Hello", message: "Body" }));
    expect(rejected.status).toBe(400);
  });

  it("updates read state only for an authenticated exact mailbox thread", async () => {
    const response = await readState(request("/api/admin/email/read-state", "PATCH", { threadId: id, mailbox: "contact@anyhvac.net", isRead: false }));
    expect(response.status).toBe(200);
    expect(setThreadReadState).toHaveBeenCalledWith(id, "contact@anyhvac.net", false);
    expect((await readState(request("/api/admin/email/read-state", "PATCH", { threadId: id, mailbox: "contact@anyhvac.net", isRead: true }, false))).status).toBe(401);
  });
});
