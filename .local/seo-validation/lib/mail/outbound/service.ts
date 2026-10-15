import "server-only";

import type { OutboundMailDelivery, OutboundMailRepository, OutboundMessage } from "./types";
import type { OutboundRequest } from "./validation";

export class ReplyThreadNotFoundError extends Error {
  constructor() { super("Reply thread was not found."); this.name = "ReplyThreadNotFoundError"; }
}

export class OutboundConsistencyError extends Error {
  constructor() { super("Email was delivered but could not be stored."); this.name = "OutboundConsistencyError"; }
}

export async function sendOutboundMail(
  request: OutboundRequest,
  delivery: OutboundMailDelivery,
  repository: OutboundMailRepository,
  now = () => new Date().toISOString(),
) {
  let message: OutboundMessage;
  let context = null;
  if (request.mode === "reply") {
    context = await repository.getReplyContext(request.threadId, request.mailbox);
    if (!context) throw new ReplyThreadNotFoundError();
    message = { mailbox: context.mailbox, to: context.recipient, subject: context.subject, message: request.message, inReplyTo: context.inReplyTo, references: context.references };
  } else {
    message = { mailbox: request.mailbox, to: request.to, subject: request.subject, message: request.message, inReplyTo: null, references: [] };
  }
  const accepted = await delivery.send(message, request.requestId);
  const existing = await repository.findByProviderMessageId(accepted.providerMessageId);
  if (existing) return existing;
  try {
    return context
      ? await repository.persistReply(context, request.message, accepted, now())
      : await repository.persistCompose(message, accepted, now());
  } catch {
    throw new OutboundConsistencyError();
  }
}
