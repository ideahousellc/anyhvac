import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Mailbox } from "@/lib/mail/inbound/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

import type { AttachmentOwnership } from "./types";

export class AttachmentRepositoryError extends Error {
  constructor() { super("Attachment metadata could not be loaded."); this.name = "AttachmentRepositoryError"; }
}

export class SupabaseAttachmentRepository {
  constructor(private readonly client: SupabaseClient<Database> = createSupabaseServerClient()) {}

  async findOwnedAttachment(input: {
    attachmentId: string;
    messageId: string;
    threadId: string;
    mailbox: Mailbox;
  }): Promise<AttachmentOwnership | null> {
    const thread = await this.client.from("mail_threads")
      .select("id")
      .eq("id", input.threadId)
      .eq("mailbox", input.mailbox)
      .maybeSingle();
    if (thread.error) throw new AttachmentRepositoryError();
    if (!thread.data) return null;

    const message = await this.client.from("mail_messages")
      .select("id, provider, provider_message_id")
      .eq("id", input.messageId)
      .eq("thread_id", input.threadId)
      .eq("mailbox", input.mailbox)
      .eq("direction", "inbound")
      .maybeSingle();
    if (message.error) throw new AttachmentRepositoryError();
    if (!message.data || message.data.provider !== "resend" || !message.data.provider_message_id) return null;

    const attachment = await this.client.from("mail_attachments")
      .select("id, message_id, provider, provider_attachment_id, filename, content_type, content_disposition, size_bytes")
      .eq("id", input.attachmentId)
      .eq("message_id", input.messageId)
      .maybeSingle();
    if (attachment.error) throw new AttachmentRepositoryError();
    if (!attachment.data || attachment.data.provider !== "resend" || !attachment.data.provider_attachment_id) return null;

    return {
      attachmentId: attachment.data.id,
      messageId: attachment.data.message_id,
      threadId: input.threadId,
      mailbox: input.mailbox,
      providerMessageId: message.data.provider_message_id,
      providerAttachmentId: attachment.data.provider_attachment_id,
      filename: attachment.data.filename,
      contentType: attachment.data.content_type,
      contentDisposition: attachment.data.content_disposition,
      sizeBytes: attachment.data.size_bytes,
    };
  }
}
