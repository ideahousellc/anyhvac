import { createAdminEmailContent } from "@/lib/admin/mail";

import type { OutboundMailDelivery, OutboundMessage } from "./types";

export class OutboundDeliveryError extends Error {
  constructor(public readonly status: number | null = null) {
    super("Email delivery failed.");
    this.name = "OutboundDeliveryError";
  }
}

export class ResendOutboundMailDelivery implements OutboundMailDelivery {
  constructor(private readonly retrieveInternetMessageId = true) {}

  async send(message: OutboundMessage, requestId: string, idempotencyPrefix = "control-room-email") {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) throw new OutboundDeliveryError(503);
    const content = createAdminEmailContent(message.message, message.mailbox);
    const headers: Record<string, string> = {};
    if (message.inReplyTo) headers["In-Reply-To"] = message.inReplyTo;
    if (message.references.length) headers.References = message.references.join(" ");
    try {
      const result = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "Idempotency-Key": `${idempotencyPrefix}/${requestId}` },
        body: JSON.stringify({
          from: `Cesar Pepper | AnyHVAC <${message.mailbox}>`,
          to: [message.to],
          subject: message.subject,
          html: content.html,
          text: content.text,
          reply_to: message.mailbox,
          ...(Object.keys(headers).length ? { headers } : {}),
        }),
        signal: AbortSignal.timeout(10_000),
      });
      const body: unknown = await result.json().catch(() => null);
      if (!result.ok || !body || typeof body !== "object" || !("id" in body) || typeof body.id !== "string" || !body.id) {
        throw new OutboundDeliveryError(result.status);
      }
      let internetMessageId: string | null = null;
      try {
        if (!this.retrieveInternetMessageId) return { providerMessageId: body.id, internetMessageId: null };
        const sent = await fetch(`https://api.resend.com/emails/${encodeURIComponent(body.id)}`, {
          headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(10_000),
        });
        const detail: unknown = await sent.json().catch(() => null);
        if (sent.ok && detail && typeof detail === "object" && "message_id" in detail && typeof detail.message_id === "string") {
          internetMessageId = detail.message_id;
        }
      } catch { /* Provider acceptance remains authoritative. */ }
      return { providerMessageId: body.id, internetMessageId };
    } catch (error) {
      if (error instanceof OutboundDeliveryError) throw error;
      throw new OutboundDeliveryError();
    }
  }
}
