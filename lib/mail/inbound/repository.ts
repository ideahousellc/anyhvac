import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database, TablesInsert } from "@/types/supabase";

import {
  InboundMailFailure,
  inboundMailFailureFromUnknown,
  type InboundMailStage,
} from "./diagnostics";
import {
  DuplicateMessageError,
  type InboundAttachment,
  type InboundEmail,
  type InboundMailRepository,
  type Mailbox,
  type StoredMessage,
} from "./types";

type Client = SupabaseClient<Database>;

function fail(stage: InboundMailStage, error: { code?: string }): never {
  throw new InboundMailFailure(
    stage,
    "Inbound mail database operation failed.",
    "PostgrestError",
    error.code,
  );
}

async function query<T>(stage: InboundMailStage, operation: () => PromiseLike<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw inboundMailFailureFromUnknown(
      stage,
      "Inbound mail database request failed.",
      error,
    );
  }
}

function stored(row: { id: string; thread_id: string }): StoredMessage {
  return { id: row.id, threadId: row.thread_id };
}

export class SupabaseInboundMailRepository implements InboundMailRepository {
  constructor(private readonly client: Client = createSupabaseServerClient()) {}

  async findDuplicate(providerMessageId: string, providerEventId: string) {
    const byMessage = await query("supabase.find_duplicate_message", () => this.client
      .from("mail_messages")
      .select("id, thread_id")
      .eq("provider", "resend")
      .eq("provider_message_id", providerMessageId)
      .maybeSingle());
    if (byMessage.error) fail("supabase.find_duplicate_message", byMessage.error);
    if (byMessage.data) return stored(byMessage.data);

    const byEvent = await query("supabase.find_duplicate_event", () => this.client
      .from("mail_messages")
      .select("id, thread_id")
      .eq("provider", "resend")
      .eq("provider_event_id", providerEventId)
      .maybeSingle());
    if (byEvent.error) fail("supabase.find_duplicate_event", byEvent.error);
    return byEvent.data ? stored(byEvent.data) : null;
  }

  async findThreadByInternetIds(mailbox: Mailbox, internetIds: string[]) {
    for (const internetId of internetIds) {
      const result = await query("supabase.resolve_thread", () => this.client
        .from("mail_messages")
        .select("thread_id")
        .eq("mailbox", mailbox)
        .eq("internet_message_id", internetId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle());
      if (result.error) fail("supabase.resolve_thread", result.error);
      if (result.data) return result.data.thread_id;
    }
    return null;
  }

  async findThreadReferencingInternetId(mailbox: Mailbox, internetId: string) {
    const reply = await query("supabase.resolve_thread", () => this.client
      .from("mail_messages")
      .select("thread_id")
      .eq("mailbox", mailbox)
      .eq("in_reply_to", internetId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle());
    if (reply.error) fail("supabase.resolve_thread", reply.error);
    if (reply.data) return reply.data.thread_id;

    const reference = await query("supabase.resolve_thread", () => this.client
      .from("mail_messages")
      .select("thread_id")
      .eq("mailbox", mailbox)
      .contains("reference_message_ids", [internetId])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle());
    if (reference.error) fail("supabase.resolve_thread", reference.error);
    return reference.data?.thread_id ?? null;
  }

  async findThreadBySubjectAndParticipants(
    mailbox: Mailbox,
    normalizedSubject: string,
    participants: string[],
  ) {
    const threads = await query("supabase.resolve_thread", () => this.client
      .from("mail_threads")
      .select("id")
      .eq("mailbox", mailbox)
      .eq("normalized_subject", normalizedSubject)
      .order("latest_message_at", { ascending: false })
      .limit(10));
    if (threads.error) fail("supabase.resolve_thread", threads.error);
    if (!threads.data.length) return null;

    const threadIds = threads.data.map((thread) => thread.id);
    const messages = await query("supabase.resolve_thread", () => this.client
      .from("mail_messages")
      .select("thread_id, from_address, to_addresses, cc_addresses, reply_to_addresses")
      .in("thread_id", threadIds)
      .eq("mailbox", mailbox));
    if (messages.error) fail("supabase.resolve_thread", messages.error);

    const participantSet = new Set(participants);
    const matchingIds = new Set(
      messages.data
        .filter((message) =>
          [message.from_address, ...message.to_addresses, ...message.cc_addresses, ...message.reply_to_addresses]
            .some((address) => participantSet.has(address.toLowerCase())),
        )
        .map((message) => message.thread_id),
    );
    return threadIds.find((id) => matchingIds.has(id)) ?? null;
  }

  async createThread(email: InboundEmail, normalizedSubject: string | null) {
    const result = await query("supabase.create_thread", () => this.client
      .from("mail_threads")
      .insert({
        mailbox: email.mailbox,
        subject: email.subject,
        normalized_subject: normalizedSubject,
        latest_message_at: email.receivedAt,
      })
      .select("id")
      .single());
    if (result.error) fail("supabase.create_thread", result.error);
    return result.data.id;
  }

  async deleteThreadIfEmpty(threadId: string) {
    const messages = await query("supabase.create_thread", () => this.client
      .from("mail_messages")
      .select("id", { count: "exact", head: true })
      .eq("thread_id", threadId));
    if (messages.error) fail("supabase.create_thread", messages.error);
    if (messages.count === 0) {
      const deleted = await query("supabase.create_thread", () => this.client
        .from("mail_threads")
        .delete()
        .eq("id", threadId));
      if (deleted.error) fail("supabase.create_thread", deleted.error);
    }
  }

  async insertMessage(email: InboundEmail, threadId: string) {
    const message: TablesInsert<"mail_messages"> = {
      thread_id: threadId,
      mailbox: email.mailbox,
      direction: "inbound",
      provider: "resend",
      provider_message_id: email.providerMessageId,
      provider_event_id: email.providerEventId,
      internet_message_id: email.internetMessageId,
      in_reply_to: email.inReplyTo,
      reference_message_ids: email.referenceMessageIds,
      from_address: email.fromAddress,
      from_name: email.fromName,
      to_addresses: email.toAddresses,
      cc_addresses: email.ccAddresses,
      bcc_addresses: [],
      reply_to_addresses: email.replyToAddresses,
      subject: email.subject,
      text_body: email.textBody,
      html_body: email.htmlBody,
      received_at: email.receivedAt,
      sent_at: null,
      is_read: false,
      read_at: null,
    };
    const result = await query("supabase.insert_message", () => this.client
      .from("mail_messages")
      .insert(message)
      .select("id, thread_id")
      .single());
    if (result.error?.code === "23505") throw new DuplicateMessageError();
    if (result.error) fail("supabase.insert_message", result.error);
    return stored(result.data);
  }

  async insertAttachment(messageId: string, attachment: InboundAttachment) {
    const result = await query("supabase.insert_attachment", () => this.client.from("mail_attachments").insert({
      message_id: messageId,
      provider: "resend",
      provider_attachment_id: attachment.providerAttachmentId,
      filename: attachment.filename,
      content_type: attachment.contentType,
      content_disposition: attachment.contentDisposition,
      content_id: attachment.contentId,
      size_bytes: attachment.sizeBytes,
    }));
    if (result.error?.code === "23505") return;
    if (result.error) fail("supabase.insert_attachment", result.error);
  }

  async updateThreadLatestMessage(threadId: string, receivedAt: string) {
    const result = await query("supabase.update_thread", () => this.client
      .from("mail_threads")
      .update({ latest_message_at: receivedAt })
      .eq("id", threadId)
      .lt("latest_message_at", receivedAt));
    if (result.error) fail("supabase.update_thread", result.error);
  }
}
