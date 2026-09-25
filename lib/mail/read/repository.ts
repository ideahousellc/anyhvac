import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { SUPPORTED_MAILBOXES, type Mailbox } from "@/lib/mail/inbound/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database, Tables } from "@/types/supabase";

import type {
  MailAttachmentSummary,
  MailboxFilter,
  MailMessageDetail,
  MailThreadDetail,
  MailThreadSummary,
} from "./types";
import { mailboxAddress } from "./config";

type Client = SupabaseClient<Database>;
type ThreadRow = Pick<Tables<"mail_threads">, "id" | "mailbox" | "subject" | "latest_message_at">;
type MessageRow = Pick<Tables<"mail_messages">,
  | "id" | "thread_id" | "mailbox" | "direction" | "from_address" | "from_name"
  | "to_addresses" | "cc_addresses" | "subject" | "text_body" | "html_body"
  | "is_read" | "received_at" | "sent_at" | "created_at"
>;
type AttachmentRow = Pick<Tables<"mail_attachments">,
  "message_id" | "filename" | "content_type" | "size_bytes"
>;

export class MailReadError extends Error {
  constructor() {
    super("Mail data could not be loaded.");
    this.name = "MailReadError";
  }
}

function mailboxScope(filter: MailboxFilter): Mailbox[] {
  const address = mailboxAddress(filter);
  return address ? [address] : [...SUPPORTED_MAILBOXES];
}

function timestamp(message: MessageRow) {
  return message.received_at ?? message.sent_at ?? message.created_at;
}

function preview(message: MessageRow) {
  const body = message.text_body?.replace(/\s+/g, " ").trim();
  if (body) return body.slice(0, 180);
  return message.html_body ? "HTML-only message" : "No message preview";
}

function attachmentsFor(messageId: string, rows: AttachmentRow[]): MailAttachmentSummary[] {
  return rows
    .filter((attachment) => attachment.message_id === messageId)
    .map((attachment) => ({
      filename: attachment.filename,
      contentType: attachment.content_type,
      sizeBytes: attachment.size_bytes,
    }));
}

function displayRecipients(addresses: string[], mailbox: Mailbox) {
  const seen = new Set<string>();
  return addresses
    .map((address) => {
      const domain = address.trim().toLowerCase().split("@").at(-1);
      return domain === "resend.app" || domain?.endsWith(".resend.app")
        ? mailbox
        : address;
    })
    .filter((address) => {
      const key = address.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

export function buildThreadSummaries(
  threads: ThreadRow[],
  messages: MessageRow[],
  attachments: AttachmentRow[],
): MailThreadSummary[] {
  return threads.map((thread) => {
    const threadMessages = messages
      .filter((message) => message.thread_id === thread.id && message.mailbox === thread.mailbox)
      .sort((left, right) => timestamp(right).localeCompare(timestamp(left)));
    const latest = threadMessages[0];
    return {
      id: thread.id,
      mailbox: thread.mailbox,
      subject: thread.subject || "(No subject)",
      latestMessageAt: thread.latest_message_at,
      senderAddress: latest?.from_address ?? thread.mailbox,
      senderName: latest?.from_name ?? null,
      preview: latest ? preview(latest) : "No message preview",
      unread: threadMessages.some((message) =>
        message.direction === "inbound" && !message.is_read),
      hasAttachments: threadMessages.some((message) =>
        attachments.some((attachment) => attachment.message_id === message.id)),
      messageCount: threadMessages.length,
    };
  }).sort((left, right) => right.latestMessageAt.localeCompare(left.latestMessageAt));
}

export function buildThreadDetail(
  thread: ThreadRow,
  messages: MessageRow[],
  attachments: AttachmentRow[],
): MailThreadDetail {
  const detailMessages: MailMessageDetail[] = messages
    .filter((message) => message.thread_id === thread.id && message.mailbox === thread.mailbox)
    .sort((left, right) => timestamp(left).localeCompare(timestamp(right)))
    .map((message) => ({
      id: message.id,
      direction: message.direction,
      senderAddress: message.from_address,
      senderName: message.from_name,
      toAddresses: displayRecipients(message.to_addresses, thread.mailbox),
      ccAddresses: message.cc_addresses,
      subject: message.subject,
      textBody: message.text_body?.trim() || null,
      hasHiddenHtmlBody: !message.text_body?.trim() && Boolean(message.html_body),
      timestamp: timestamp(message),
      isRead: message.is_read,
      attachments: attachmentsFor(message.id, attachments),
    }));
  return {
    id: thread.id,
    mailbox: thread.mailbox,
    subject: thread.subject || "(No subject)",
    messages: detailMessages,
  };
}

async function safeQuery<T>(operation: () => PromiseLike<T>): Promise<T> {
  try {
    return await operation();
  } catch {
    throw new MailReadError();
  }
}

export class SupabaseMailReadRepository {
  constructor(private readonly client: Client = createSupabaseServerClient()) {}

  async listThreads(filter: MailboxFilter): Promise<MailThreadSummary[]> {
    const scope = mailboxScope(filter);
    let threadQuery = this.client
      .from("mail_threads")
      .select("id, mailbox, subject, latest_message_at");
    threadQuery = scope.length === 1
      ? threadQuery.eq("mailbox", scope[0])
      : threadQuery.in("mailbox", scope);
    const threadResult = await safeQuery(() =>
      threadQuery.order("latest_message_at", { ascending: false }));
    if (threadResult.error) throw new MailReadError();
    if (!threadResult.data.length) return [];

    const threadIds = threadResult.data.map((thread) => thread.id);
    const messageResult = await safeQuery(() => this.client
      .from("mail_messages")
      .select("id, thread_id, mailbox, direction, from_address, from_name, to_addresses, cc_addresses, subject, text_body, html_body, is_read, received_at, sent_at, created_at")
      .in("thread_id", threadIds)
      .in("mailbox", scope));
    if (messageResult.error) throw new MailReadError();

    const messageIds = messageResult.data.map((message) => message.id);
    let attachmentRows: AttachmentRow[] = [];
    if (messageIds.length) {
      const attachmentResult = await safeQuery(() => this.client
        .from("mail_attachments")
        .select("message_id, filename, content_type, size_bytes")
        .in("message_id", messageIds));
      if (attachmentResult.error) throw new MailReadError();
      attachmentRows = attachmentResult.data;
    }

    return buildThreadSummaries(threadResult.data, messageResult.data, attachmentRows);
  }

  async getThread(threadId: string, filter: MailboxFilter): Promise<MailThreadDetail | null> {
    const scope = mailboxScope(filter);
    let threadQuery = this.client
      .from("mail_threads")
      .select("id, mailbox, subject, latest_message_at")
      .eq("id", threadId);
    threadQuery = scope.length === 1
      ? threadQuery.eq("mailbox", scope[0])
      : threadQuery.in("mailbox", scope);
    const threadResult = await safeQuery(() => threadQuery.maybeSingle());
    if (threadResult.error) throw new MailReadError();
    if (!threadResult.data) return null;
    const thread = threadResult.data;

    const messageResult = await safeQuery(() => this.client
      .from("mail_messages")
      .select("id, thread_id, mailbox, direction, from_address, from_name, to_addresses, cc_addresses, subject, text_body, html_body, is_read, received_at, sent_at, created_at")
      .eq("thread_id", thread.id)
      .eq("mailbox", thread.mailbox));
    if (messageResult.error) throw new MailReadError();

    const messageIds = messageResult.data.map((message) => message.id);
    let attachmentRows: AttachmentRow[] = [];
    if (messageIds.length) {
      const attachmentResult = await safeQuery(() => this.client
        .from("mail_attachments")
        .select("message_id, filename, content_type, size_bytes")
        .in("message_id", messageIds));
      if (attachmentResult.error) throw new MailReadError();
      attachmentRows = attachmentResult.data;
    }

    return buildThreadDetail(thread, messageResult.data, attachmentRows);
  }
}
