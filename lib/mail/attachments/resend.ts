import "server-only";

import { Resend } from "resend";

import type { AttachmentDownload, AttachmentOwnership } from "./types";

const MAX_ATTACHMENT_BYTES = 40 * 1024 * 1024;
const INLINE_TYPES = new Set([
  "application/pdf",
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export class AttachmentProviderError extends Error {
  constructor(public readonly unavailable = false) {
    super("Attachment could not be retrieved.");
    this.name = "AttachmentProviderError";
  }
}

function safeContentType(value: string | null | undefined) {
  const normalized = value?.split(";", 1)[0]?.trim().toLowerCase();
  return normalized && /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/.test(normalized)
    ? normalized
    : "application/octet-stream";
}

export class ResendAttachmentProvider {
  private readonly resend: Resend;

  constructor(apiKey = process.env.RESEND_ADMIN_API_KEY?.trim()) {
    if (!apiKey) throw new AttachmentProviderError(true);
    this.resend = new Resend(apiKey);
  }

  async retrieve(ownership: AttachmentOwnership): Promise<AttachmentDownload> {
    if (ownership.sizeBytes !== null && ownership.sizeBytes > MAX_ATTACHMENT_BYTES) {
      throw new AttachmentProviderError();
    }
    let result;
    try {
      result = await this.resend.emails.receiving.attachments.get({
        emailId: ownership.providerMessageId,
        id: ownership.providerAttachmentId,
      });
    } catch {
      throw new AttachmentProviderError();
    }
    if (result.error || !result.data || result.data.id !== ownership.providerAttachmentId) {
      throw new AttachmentProviderError();
    }
    if (!Number.isFinite(result.data.size) || result.data.size < 0 || result.data.size > MAX_ATTACHMENT_BYTES) {
      throw new AttachmentProviderError();
    }
    let url: URL;
    try { url = new URL(result.data.download_url); } catch { throw new AttachmentProviderError(); }
    if (url.protocol !== "https:") throw new AttachmentProviderError();

    let upstream: Response;
    try {
      upstream = await fetch(url, {
        redirect: "error",
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new AttachmentProviderError();
    }
    const lengthHeader = upstream.headers.get("content-length");
    const contentLength = lengthHeader && /^\d+$/.test(lengthHeader) ? Number(lengthHeader) : null;
    if (!upstream.ok || !upstream.body || (contentLength !== null && contentLength > MAX_ATTACHMENT_BYTES)) {
      throw new AttachmentProviderError();
    }
    const contentType = safeContentType(result.data.content_type || ownership.contentType);
    return {
      body: upstream.body,
      filename: result.data.filename?.trim() || ownership.filename,
      contentType: INLINE_TYPES.has(contentType) ? contentType : "application/octet-stream",
      contentLength,
      disposition: INLINE_TYPES.has(contentType) ? "inline" : "attachment",
    };
  }
}
