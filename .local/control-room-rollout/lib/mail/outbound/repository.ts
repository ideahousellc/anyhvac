import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminEmailContent } from "@/lib/admin/mail";
import { normalizeSubject } from "@/lib/mail/inbound/parsing";
import { SUPPORTED_MAILBOXES, type Mailbox } from "@/lib/mail/inbound/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database, TablesInsert } from "@/types/supabase";

import type { OutboundDelivery, OutboundMailRepository, OutboundMessage, ReplyContext } from "./types";
import { replySubject } from "./validation";

type Client = SupabaseClient<Database>;
type DbError = { code?: string } | null;

export class OutboundPersistenceError extends Error {
  constructor(public readonly stage: string, public readonly code?: string) {
    super("Outbound email could not be stored.");
    this.name = "OutboundPersistenceError";
  }
}

function fail(stage: string, error: DbError): never {
  throw new OutboundPersistenceError(stage, error?.code);
}

async function query<T>(stage: string, operation: () => PromiseLike<T>): Promise<T> {
  try { return await operation(); } catch { throw new OutboundPersistenceError(stage); }
}

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

export class SupabaseOutboundMailRepository implements OutboundMailRepository {
  constructor(private readonly client: Client = createSupabaseServerClient()) {}

  async findByProviderMessageId(providerMessageId: string) {
    const result = await query("find_message", () => this.client.from("mail_messages")
      .select("id, thread_id").eq("provider", "resend").eq("provider_message_id", providerMessageId).maybeSingle());
    if (result.error) fail("find_message", result.error);
    return result.data ? { messageId: result.data.id, threadId: result.data.thread_id } : null;
  }

  async getReplyContext(threadId: string, mailbox: Mailbox): Promise<ReplyContext | null> {
    const thread = await query("reply_thread", () => this.client.from("mail_threads")
      .select("id, mailbox, subject").eq("id", threadId).eq("mailbox", mailbox).maybeSingle());
    if (thread.error) fail("reply_thread", thread.error);
    if (!thread.data) return null;
    const messages = await query("reply_messages", () => this.client.from("mail_messages")
      .select("direction, from_address, reply_to_addresses, internet_message_id, reference_message_ids, received_at, sent_at, created_at")
      .eq("thread_id", threadId).eq("mailbox", mailbox));
    if (messages.error) fail("reply_messages", messages.error);
    const inbound = messages.data.filter((message) => message.direction === "inbound")
      .sort((a, b) => (b.received_at ?? b.created_at).localeCompare(a.received_at ?? a.created_at));
    const target = inbound[0];
    if (!target) return null;
    const internal = new Set<string>(SUPPORTED_MAILBOXES);
    const recipient = [...target.reply_to_addresses, target.from_address]
      .map((address) => address.trim().toLowerCase()).find((address) => address && !internal.has(address));
    if (!recipient) return null;
    const anchor = target.internet_message_id;
    return {
      threadId,
      mailbox,
      recipient,
      subject: replySubject(thread.data.subject),
      inReplyTo: anchor,
      references: unique([...target.reference_message_ids, anchor]),
    };
  }

  private messageRow(threadId: string, message: OutboundMessage, delivery: OutboundDelivery, sentAt: string): TablesInsert<"mail_messages"> {
    const content = createAdminEmailContent(message.message, message.mailbox);
    return {
      thread_id: threadId, mailbox: message.mailbox, direction: "outbound", provider: "resend",
      provider_message_id: delivery.providerMessageId, provider_event_id: null,
      internet_message_id: delivery.internetMessageId, in_reply_to: message.inReplyTo,
      reference_message_ids: message.references, from_address: message.mailbox, from_name: "Cesar Pepper | AnyHVAC",
      to_addresses: [message.to], cc_addresses: [], bcc_addresses: [], reply_to_addresses: [message.mailbox],
      subject: message.subject, text_body: content.text, html_body: content.html,
      received_at: null, sent_at: sentAt, is_read: true, read_at: sentAt,
    };
  }

  async persistCompose(message: OutboundMessage, delivery: OutboundDelivery, sentAt: string) {
    const thread = await query("create_thread", () => this.client.from("mail_threads").insert({
      mailbox: message.mailbox, subject: message.subject, normalized_subject: normalizeSubject(message.subject), latest_message_at: sentAt,
    }).select("id").single());
    if (thread.error) fail("create_thread", thread.error);
    try {
      const stored = await query("insert_message", () => this.client.from("mail_messages")
        .insert(this.messageRow(thread.data.id, message, delivery, sentAt)).select("id, thread_id").single());
      if (stored.error) fail("insert_message", stored.error);
      return { messageId: stored.data.id, threadId: stored.data.thread_id };
    } catch (error) {
      const count = await query("cleanup_thread", () => this.client.from("mail_messages")
        .select("id", { count: "exact", head: true }).eq("thread_id", thread.data.id));
      if (!count.error && count.count === 0) await this.client.from("mail_threads").delete().eq("id", thread.data.id);
      throw error;
    }
  }

  async persistReply(context: ReplyContext, body: string, delivery: OutboundDelivery, sentAt: string) {
    const message: OutboundMessage = { mailbox: context.mailbox, to: context.recipient, subject: context.subject, message: body, inReplyTo: context.inReplyTo, references: context.references };
    const stored = await query("insert_reply", () => this.client.from("mail_messages")
      .insert(this.messageRow(context.threadId, message, delivery, sentAt)).select("id, thread_id").single());
    if (stored.error) fail("insert_reply", stored.error);
    const updated = await query("update_thread", () => this.client.from("mail_threads")
      .update({ latest_message_at: sentAt }).eq("id", context.threadId).eq("mailbox", context.mailbox).lt("latest_message_at", sentAt));
    if (updated.error) fail("update_thread", updated.error);
    return { messageId: stored.data.id, threadId: stored.data.thread_id };
  }
}
