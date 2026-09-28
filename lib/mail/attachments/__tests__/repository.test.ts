import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import type { Database } from "@/types/supabase";
import { SupabaseAttachmentRepository } from "../repository";

function builder(data: object | null) {
  const value = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn().mockResolvedValue({ data, error: null }) };
  value.select.mockReturnValue(value);
  value.eq.mockReturnValue(value);
  return value;
}

describe("attachment ownership repository", () => {
  it("requires an exact mailbox/thread/message/attachment relationship", async () => {
    const thread = builder({ id: "thread" });
    const message = builder({ id: "message", provider: "resend", provider_message_id: "provider-email" });
    const attachment = builder({
      id: "attachment", message_id: "message", provider: "resend", provider_attachment_id: "provider-attachment",
      filename: "manual.pdf", content_type: "application/pdf", content_disposition: "attachment", size_bytes: 42,
    });
    const client = { from: vi.fn().mockReturnValueOnce(thread).mockReturnValueOnce(message).mockReturnValueOnce(attachment) } as unknown as SupabaseClient<Database>;

    const result = await new SupabaseAttachmentRepository(client).findOwnedAttachment({
      attachmentId: "attachment", messageId: "message", threadId: "thread", mailbox: "mailtest@anyhvac.net",
    });

    expect(result).toMatchObject({ providerMessageId: "provider-email", providerAttachmentId: "provider-attachment" });
    expect(thread.eq).toHaveBeenCalledWith("id", "thread");
    expect(thread.eq).toHaveBeenCalledWith("mailbox", "mailtest@anyhvac.net");
    expect(message.eq).toHaveBeenCalledWith("id", "message");
    expect(message.eq).toHaveBeenCalledWith("thread_id", "thread");
    expect(message.eq).toHaveBeenCalledWith("mailbox", "mailtest@anyhvac.net");
    expect(message.eq).toHaveBeenCalledWith("direction", "inbound");
    expect(attachment.eq).toHaveBeenCalledWith("id", "attachment");
    expect(attachment.eq).toHaveBeenCalledWith("message_id", "message");
  });

  it("does not query provider attachment metadata when the thread/mailbox pair is absent", async () => {
    const thread = builder(null);
    const client = { from: vi.fn().mockReturnValue(thread) } as unknown as SupabaseClient<Database>;
    const result = await new SupabaseAttachmentRepository(client).findOwnedAttachment({
      attachmentId: "attachment", messageId: "message", threadId: "thread", mailbox: "support@anyhvac.net",
    });
    expect(result).toBeNull();
    expect(client.from).toHaveBeenCalledTimes(1);
  });
});
