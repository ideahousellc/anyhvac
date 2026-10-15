import type { Mailbox } from "@/lib/mail/inbound/types";

export type OutboundDelivery = {
  providerMessageId: string;
  internetMessageId: string | null;
};

export type OutboundMessage = {
  mailbox: Mailbox;
  to: string;
  subject: string;
  message: string;
  inReplyTo: string | null;
  references: string[];
};

export type ReplyContext = {
  threadId: string;
  mailbox: Mailbox;
  recipient: string;
  subject: string;
  inReplyTo: string | null;
  references: string[];
};

export type StoredOutbound = { threadId: string; messageId: string };

export interface OutboundMailRepository {
  findByProviderMessageId(providerMessageId: string): Promise<StoredOutbound | null>;
  getReplyContext(threadId: string, mailbox: Mailbox): Promise<ReplyContext | null>;
  persistCompose(message: OutboundMessage, delivery: OutboundDelivery, sentAt: string): Promise<StoredOutbound>;
  persistReply(context: ReplyContext, message: string, delivery: OutboundDelivery, sentAt: string): Promise<StoredOutbound>;
}

export interface OutboundMailDelivery {
  send(message: OutboundMessage, requestId: string, idempotencyPrefix?: string): Promise<OutboundDelivery>;
}
