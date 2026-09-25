import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Mailbox } from "@/lib/mail/inbound/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

export class MailActionError extends Error {
  constructor() { super("Mail state could not be updated."); this.name = "MailActionError"; }
}

export class SupabaseMailActionRepository {
  constructor(private readonly client: SupabaseClient<Database> = createSupabaseServerClient()) {}

  async setThreadReadState(threadId: string, mailbox: Mailbox, isRead: boolean) {
    const thread = await this.client.from("mail_threads").select("id").eq("id", threadId).eq("mailbox", mailbox).maybeSingle();
    if (thread.error) throw new MailActionError();
    if (!thread.data) return false;
    const result = await this.client.from("mail_messages").update({
      is_read: isRead, read_at: isRead ? new Date().toISOString() : null,
    }).eq("thread_id", threadId).eq("mailbox", mailbox).eq("direction", "inbound").neq("is_read", isRead);
    if (result.error) throw new MailActionError();
    return true;
  }
}
