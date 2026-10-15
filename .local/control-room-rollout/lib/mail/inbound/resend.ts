import "server-only";

import { Resend, type EmailReceivedEvent, type WebhookEventPayload } from "resend";

import {
  findSupportedMailbox,
  getHeader,
  normalizeAddresses,
  parseAddress,
  parseMessageIds,
} from "./parsing";
import {
  InboundMailFailure,
  inboundMailFailureFromUnknown,
  safeErrorCode,
} from "./diagnostics";
import type {
  InboundEmail,
  ReceivingClient,
  WebhookSignatureHeaders,
  WebhookVerifier,
} from "./types";

export class ResendWebhookVerifier implements WebhookVerifier {
  private readonly resend = new Resend("re_webhook_verification_only");

  verify(rawBody: string, headers: WebhookSignatureHeaders, secret: string): WebhookEventPayload {
    return this.resend.webhooks.verify({ payload: rawBody, headers, webhookSecret: secret });
  }
}

export class ResendReceivingClient implements ReceivingClient {
  private readonly resend: Resend;

  constructor(apiKey: string) {
    this.resend = new Resend(apiKey);
  }

  async retrieve(event: EmailReceivedEvent, providerEventId: string): Promise<InboundEmail | null> {
    let response;
    try {
      response = await this.resend.emails.receiving.get(event.data.email_id, { html_format: "cid" });
    } catch (error) {
      throw inboundMailFailureFromUnknown(
        "resend.retrieve",
        "Resend could not retrieve the received email.",
        error,
      );
    }
    if (response.error) {
      throw new InboundMailFailure(
        "resend.retrieve",
        "Resend could not retrieve the received email.",
        "ResendApiError",
        safeErrorCode(response.error.statusCode),
      );
    }
    if (!response.data) {
      throw new InboundMailFailure(
        "resend.validate",
        "Resend returned no received email.",
        "ResendResponseError",
      );
    }
    const email = response.data;
    if (email.id !== event.data.email_id) {
      throw new InboundMailFailure(
        "resend.validate",
        "Resend returned an unexpected received email.",
        "ResendResponseError",
      );
    }

    try {
      const mailbox = findSupportedMailbox(
        email.received_for,
        event.data.received_for,
        email.to,
        event.data.to,
      );
      if (!mailbox) return null;

      const sender = parseAddress(email.from);
      if (!sender) {
        throw new InboundMailFailure(
          "resend.validate",
          "Received email has no valid sender address.",
          "ResendResponseError",
        );
      }

      const inReplyToIds = parseMessageIds(getHeader(email.headers, "in-reply-to"));
      const referenceIds = parseMessageIds(getHeader(email.headers, "references"));
      const internetMessageId = parseMessageIds(email.message_id)[0] ?? null;

      return {
        providerMessageId: email.id,
        providerEventId,
        mailbox,
        internetMessageId,
        inReplyTo: inReplyToIds[0] ?? null,
        referenceMessageIds: referenceIds,
        fromAddress: sender.address,
        fromName: sender.name,
        toAddresses: normalizeAddresses(email.to),
        ccAddresses: normalizeAddresses(email.cc),
        replyToAddresses: normalizeAddresses(email.reply_to),
        subject: email.subject ?? "",
        textBody: email.text,
        htmlBody: email.html,
        receivedAt: email.created_at || event.created_at,
        attachments: email.attachments.flatMap((attachment) => {
          const filename = attachment.filename?.trim();
          if (!attachment.id || !filename) return [];
          return [{
            providerAttachmentId: attachment.id,
            filename,
            contentType: attachment.content_type || null,
            contentDisposition: attachment.content_disposition || null,
            contentId: attachment.content_id || null,
            sizeBytes: Number.isFinite(attachment.size) && attachment.size >= 0 ? attachment.size : null,
          }];
        }),
      };
    } catch (error) {
      throw inboundMailFailureFromUnknown(
        "resend.parse",
        "Received email parsing failed.",
        error,
      );
    }
  }
}
