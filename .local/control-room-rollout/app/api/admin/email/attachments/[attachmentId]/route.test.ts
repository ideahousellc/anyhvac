import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));
const { findOwnedAttachment, retrieve } = vi.hoisted(() => ({ findOwnedAttachment: vi.fn(), retrieve: vi.fn() }));
vi.mock("@/lib/mail/attachments/repository", () => ({
  AttachmentRepositoryError: class AttachmentRepositoryError extends Error {},
  SupabaseAttachmentRepository: class { findOwnedAttachment = findOwnedAttachment; },
}));
vi.mock("@/lib/mail/attachments/resend", () => ({
  AttachmentProviderError: class AttachmentProviderError extends Error { constructor(public unavailable = false) { super("safe"); } },
  ResendAttachmentProvider: class { retrieve = retrieve; },
}));

import { GET, contentDisposition, safeAttachmentFilename } from "./route";
import { ADMIN_SESSION_COOKIE, createAdminSession } from "@/lib/admin/session";
import { AttachmentProviderError } from "@/lib/mail/attachments/resend";

const secret = "test-session-secret-with-at-least-32-bytes-long";
const attachmentId = "48d3b43d-0e2f-4ed8-bbfd-c8f47432ca62";
const messageId = "58d3b43d-0e2f-4ed8-bbfd-c8f47432ca62";
const threadId = "68d3b43d-0e2f-4ed8-bbfd-c8f47432ca62";

function request(authenticated = true, query = `thread=${threadId}&message=${messageId}&mailbox=support%40anyhvac.net`) {
  const headers = new Headers();
  if (authenticated) headers.set("cookie", `${ADMIN_SESSION_COOKIE}=${createAdminSession(secret)}`);
  return new NextRequest(`http://localhost/api/admin/email/attachments/${attachmentId}?${query}`, { headers });
}

function invoke(req = request(), id = attachmentId) {
  return GET(req, { params: Promise.resolve({ attachmentId: id }) });
}

beforeEach(() => {
  process.env.ADMIN_SESSION_SECRET = secret;
  findOwnedAttachment.mockReset().mockResolvedValue({
    attachmentId, messageId, threadId, mailbox: "support@anyhvac.net",
    providerMessageId: "provider-email", providerAttachmentId: "provider-attachment",
    filename: "manual.pdf", contentType: "application/pdf", contentDisposition: "attachment", sizeBytes: 3,
  });
  retrieve.mockReset().mockResolvedValue({
    body: new Blob(["pdf"]).stream(), filename: "manual.pdf", contentType: "application/pdf", contentLength: 3, disposition: "inline",
  });
});

describe("authenticated attachment route", () => {
  it("requires authentication before metadata or provider access", async () => {
    const response = await invoke(request(false));
    expect(response.status).toBe(401);
    expect(findOwnedAttachment).not.toHaveBeenCalled();
    expect(retrieve).not.toHaveBeenCalled();
  });

  it("validates thread, mailbox, message, and attachment identifiers", async () => {
    expect((await invoke(request(true, `thread=${threadId}&message=${messageId}&mailbox=attacker%40example.com`))).status).toBe(404);
    expect((await invoke(request(), "provider-attachment")).status).toBe(404);
    expect(findOwnedAttachment).not.toHaveBeenCalled();
  });

  it("returns a safe not-found response when ownership validation fails", async () => {
    findOwnedAttachment.mockResolvedValue(null);
    const response = await invoke();
    expect(response.status).toBe(404);
    expect(retrieve).not.toHaveBeenCalled();
    expect(await response.text()).not.toContain("provider");
  });

  it("streams an owned attachment with hardened browser headers", async () => {
    const response = await invoke();
    expect(response.status).toBe(200);
    expect(findOwnedAttachment).toHaveBeenCalledWith({ attachmentId, messageId, threadId, mailbox: "support@anyhvac.net" });
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toContain("inline");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("content-security-policy")).toContain("sandbox");
    expect(await response.text()).toBe("pdf");
  });

  it("returns a safe failure without exposing provider details or URLs", async () => {
    retrieve.mockRejectedValue(new AttachmentProviderError());
    const response = await invoke();
    expect(response.status).toBe(502);
    const body = await response.text();
    expect(body).not.toContain("provider-email");
    expect(body).not.toContain("provider-attachment");
    expect(body).not.toContain("download_url");
  });

  it("sanitizes path, control, quote, and non-ASCII filename content", () => {
    expect(safeAttachmentFilename("../folder\\evil\u0000.pdf")).toBe("evil.pdf");
    const value = contentDisposition("attachment", "résumé\".pdf");
    expect(value).not.toContain("\r");
    expect(value).not.toContain("\n");
    expect(value).toContain("filename*=UTF-8''");
  });
});
