import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { getAttachment } = vi.hoisted(() => ({ getAttachment: vi.fn() }));
vi.mock("resend", () => ({
  Resend: class {
    emails = { receiving: { attachments: { get: getAttachment } } };
  },
}));

import { AttachmentProviderError, ResendAttachmentProvider } from "../resend";
import type { AttachmentOwnership } from "../types";

const ownership: AttachmentOwnership = {
  attachmentId: "attachment-row",
  messageId: "message-row",
  threadId: "thread-row",
  mailbox: "support@anyhvac.net",
  providerMessageId: "provider-email",
  providerAttachmentId: "provider-attachment",
  filename: "manual.pdf",
  contentType: "application/pdf",
  contentDisposition: "attachment",
  sizeBytes: 1024,
};

describe("Resend received attachment retrieval", () => {
  beforeEach(() => {
    getAttachment.mockReset().mockResolvedValue({
      data: {
        id: "provider-attachment",
        filename: "manual.pdf",
        size: 1024,
        content_type: "application/pdf",
        content_disposition: "attachment",
        download_url: "https://provider.example/signed-secret",
        expires_at: "2026-09-28T12:05:00.000Z",
      },
      error: null,
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("pdf", {
      headers: { "content-length": "3", "content-type": "application/pdf" },
    })));
  });

  afterEach(() => vi.unstubAllGlobals());

  it("uses only stored provider identifiers and proxies a safe inline type", async () => {
    const result = await new ResendAttachmentProvider("server-secret").retrieve(ownership);
    expect(getAttachment).toHaveBeenCalledWith({ emailId: "provider-email", id: "provider-attachment" });
    expect(fetch).toHaveBeenCalledWith(new URL("https://provider.example/signed-secret"), expect.objectContaining({ redirect: "error" }));
    expect(result).toMatchObject({ filename: "manual.pdf", contentType: "application/pdf", disposition: "inline", contentLength: 3 });
    expect(JSON.stringify(result)).not.toContain("server-secret");
    expect(JSON.stringify(result)).not.toContain("signed-secret");
  });

  it("forces browser-executable content to download as opaque bytes", async () => {
    getAttachment.mockResolvedValue({ data: {
      id: "provider-attachment", filename: "page.html", size: 20,
      content_type: "text/html", content_disposition: "inline",
      download_url: "https://provider.example/file", expires_at: "later",
    }, error: null });
    const result = await new ResendAttachmentProvider("server-secret").retrieve({ ...ownership, filename: "page.html", contentType: "text/html" });
    expect(result).toMatchObject({ contentType: "application/octet-stream", disposition: "attachment" });
  });

  it("fails safely for provider errors, mismatched IDs, and unavailable credentials", async () => {
    getAttachment.mockResolvedValue({ data: null, error: { message: "sensitive provider failure" } });
    await expect(new ResendAttachmentProvider("server-secret").retrieve(ownership)).rejects.toBeInstanceOf(AttachmentProviderError);
    getAttachment.mockResolvedValue({ data: { id: "wrong" }, error: null });
    await expect(new ResendAttachmentProvider("server-secret").retrieve(ownership)).rejects.toBeInstanceOf(AttachmentProviderError);
    expect(() => new ResendAttachmentProvider("")).toThrow(AttachmentProviderError);
  });
});
