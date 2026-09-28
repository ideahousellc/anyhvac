import type { Mailbox } from "@/lib/mail/inbound/types";

export type AttachmentOwnership = {
  attachmentId: string;
  messageId: string;
  threadId: string;
  mailbox: Mailbox;
  providerMessageId: string;
  providerAttachmentId: string;
  filename: string;
  contentType: string | null;
  contentDisposition: string | null;
  sizeBytes: number | null;
};

export type AttachmentDownload = {
  body: ReadableStream<Uint8Array>;
  filename: string;
  contentType: string;
  contentLength: number | null;
  disposition: "inline" | "attachment";
};
