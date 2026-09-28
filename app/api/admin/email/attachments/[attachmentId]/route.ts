import { type NextRequest, NextResponse } from "next/server";

import { NO_STORE_HEADERS } from "@/lib/admin/request-security";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "@/lib/admin/session";
import { AttachmentProviderError, ResendAttachmentProvider } from "@/lib/mail/attachments/resend";
import { AttachmentRepositoryError, SupabaseAttachmentRepository } from "@/lib/mail/attachments/repository";
import { SUPPORTED_MAILBOXES, type Mailbox } from "@/lib/mail/inbound/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function failure(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: NO_STORE_HEADERS });
}

export function safeAttachmentFilename(value: string) {
  const leaf = value.replaceAll("\\", "/").split("/").at(-1) ?? "";
  const cleaned = leaf.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 180);
  return cleaned && cleaned !== "." && cleaned !== ".." ? cleaned : "attachment.bin";
}

export function contentDisposition(kind: "inline" | "attachment", filename: string) {
  const safe = safeAttachmentFilename(filename);
  const ascii = safe.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  const encoded = encodeURIComponent(safe).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
  return `${kind}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

export async function GET(request: NextRequest, context: { params: Promise<{ attachmentId: string }> }) {
  if (!verifyAdminSession(request.cookies.get(ADMIN_SESSION_COOKIE)?.value)) {
    return failure("Authentication required.", 401);
  }
  const { attachmentId } = await context.params;
  const threadId = request.nextUrl.searchParams.get("thread") ?? "";
  const messageId = request.nextUrl.searchParams.get("message") ?? "";
  const mailbox = request.nextUrl.searchParams.get("mailbox") ?? "";
  if (
    !UUID.test(attachmentId) || !UUID.test(threadId) || !UUID.test(messageId) ||
    !SUPPORTED_MAILBOXES.includes(mailbox as Mailbox)
  ) {
    return failure("Attachment not found.", 404);
  }

  try {
    const ownership = await new SupabaseAttachmentRepository().findOwnedAttachment({
      attachmentId,
      messageId,
      threadId,
      mailbox: mailbox as Mailbox,
    });
    if (!ownership) return failure("Attachment not found.", 404);
    const attachment = await new ResendAttachmentProvider().retrieve(ownership);
    const headers = new Headers({
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Disposition": contentDisposition(attachment.disposition, attachment.filename),
      "Content-Security-Policy": "sandbox; default-src 'none'",
      "Content-Type": attachment.contentType,
      "X-Content-Type-Options": "nosniff",
    });
    if (attachment.contentLength !== null) headers.set("Content-Length", String(attachment.contentLength));
    return new Response(attachment.body, { status: 200, headers });
  } catch (error) {
    if (error instanceof AttachmentProviderError) {
      console.error("Control Room attachment retrieval failed", error.name);
      return failure(error.unavailable ? "Attachment service unavailable." : "Attachment could not be retrieved.", error.unavailable ? 503 : 502);
    }
    console.error("Control Room attachment lookup failed", error instanceof AttachmentRepositoryError ? error.name : "UnknownError");
    return failure("Attachment could not be retrieved.", 500);
  }
}
