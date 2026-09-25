import type { Mailbox } from "@/lib/mail/inbound/types";

export type MailboxFilter = "all" | "sent" | "contact" | "support" | "social" | "mailtest";

export type MailAttachmentSummary = {
  filename: string;
  contentType: string | null;
  sizeBytes: number | null;
};

export type MailThreadSummary = {
  id: string;
  mailbox: Mailbox;
  subject: string;
  latestMessageAt: string;
  senderAddress: string;
  senderName: string | null;
  preview: string;
  unread: boolean;
  hasAttachments: boolean;
  messageCount: number;
};

export type MailMessageDetail = {
  id: string;
  direction: "inbound" | "outbound";
  senderAddress: string;
  senderName: string | null;
  toAddresses: string[];
  ccAddresses: string[];
  subject: string;
  displayTextBody: string | null;
  quotedTextHidden: boolean;
  hasHiddenHtmlBody: boolean;
  timestamp: string;
  isRead: boolean;
  attachments: MailAttachmentSummary[];
};

export type MailThreadDetail = {
  id: string;
  mailbox: Mailbox;
  subject: string;
  messages: MailMessageDetail[];
};
