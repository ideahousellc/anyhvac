import type { EmailReceivedEvent, WebhookEventPayload } from "resend";

export const SUPPORTED_MAILBOXES = [
  "contact@anyhvac.net",
  "support@anyhvac.net",
  "social@anyhvac.net",
  "mailtest@anyhvac.net",
] as const;

export type Mailbox = (typeof SUPPORTED_MAILBOXES)[number];

export interface InboundAttachment {
  providerAttachmentId: string;
  filename: string;
  contentType: string | null;
  contentDisposition: string | null;
  contentId: string | null;
  sizeBytes: number | null;
}

export interface InboundEmail {
  providerMessageId: string;
  providerEventId: string;
  mailbox: Mailbox;
  internetMessageId: string | null;
  inReplyTo: string | null;
  referenceMessageIds: string[];
  fromAddress: string;
  fromName: string | null;
  toAddresses: string[];
  ccAddresses: string[];
  replyToAddresses: string[];
  subject: string;
  textBody: string | null;
  htmlBody: string | null;
  receivedAt: string;
  attachments: InboundAttachment[];
}

export interface StoredMessage {
  id: string;
  threadId: string;
}

export interface InboundMailRepository {
  findDuplicate(providerMessageId: string, providerEventId: string): Promise<StoredMessage | null>;
  findThreadByInternetIds(mailbox: Mailbox, internetIds: string[]): Promise<string | null>;
  findThreadReferencingInternetId(mailbox: Mailbox, internetId: string): Promise<string | null>;
  findThreadBySubjectAndParticipants(
    mailbox: Mailbox,
    normalizedSubject: string,
    participants: string[],
  ): Promise<string | null>;
  createThread(email: InboundEmail, normalizedSubject: string | null): Promise<string>;
  deleteThreadIfEmpty(threadId: string): Promise<void>;
  insertMessage(email: InboundEmail, threadId: string): Promise<StoredMessage>;
  insertAttachment(messageId: string, attachment: InboundAttachment): Promise<void>;
  updateThreadLatestMessage(threadId: string, receivedAt: string): Promise<void>;
}

export interface WebhookVerifier {
  verify(rawBody: string, headers: WebhookSignatureHeaders, secret: string): WebhookEventPayload;
}

export interface ReceivingClient {
  retrieve(event: EmailReceivedEvent, providerEventId: string): Promise<InboundEmail | null>;
}

export interface WebhookSignatureHeaders {
  id: string;
  timestamp: string;
  signature: string;
}

export class DuplicateMessageError extends Error {
  constructor() {
    super("Inbound message already exists.");
    this.name = "DuplicateMessageError";
  }
}
