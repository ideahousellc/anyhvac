import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { Database } from "@/types/supabase";
import { SupabaseMailActionRepository } from "../repository";

vi.mock("server-only", () => ({}));

function client(threadExists = true) {
  const thread = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn() };
  thread.select.mockReturnValue(thread); thread.eq.mockReturnValue(thread);
  thread.maybeSingle.mockResolvedValue({ data: threadExists ? { id: "thread" } : null, error: null });
  const message = { update: vi.fn(), eq: vi.fn(), neq: vi.fn() };
  message.update.mockReturnValue(message); message.eq.mockReturnValue(message);
  message.neq.mockResolvedValue({ error: null });
  const supabase = { from: vi.fn((table: string) => table === "mail_threads" ? thread : message) } as unknown as SupabaseClient<Database>;
  return { supabase, thread, message };
}

describe("mail read-state repository", () => {
  it.each([true, false])("scopes an idempotent read-state update when isRead is %s", async (isRead) => {
    const fake = client();
    expect(await new SupabaseMailActionRepository(fake.supabase).setThreadReadState("thread", "contact@anyhvac.net", isRead)).toBe(true);
    expect(fake.thread.eq).toHaveBeenNthCalledWith(1, "id", "thread");
    expect(fake.thread.eq).toHaveBeenNthCalledWith(2, "mailbox", "contact@anyhvac.net");
    expect(fake.message.update).toHaveBeenCalledWith(expect.objectContaining({ is_read: isRead, read_at: isRead ? expect.any(String) : null }));
    expect(fake.message.eq).toHaveBeenCalledWith("thread_id", "thread");
    expect(fake.message.eq).toHaveBeenCalledWith("mailbox", "contact@anyhvac.net");
    expect(fake.message.eq).toHaveBeenCalledWith("direction", "inbound");
    expect(fake.message.neq).toHaveBeenCalledWith("is_read", isRead);
  });

  it("does not update messages when the exact thread/mailbox pair is absent", async () => {
    const fake = client(false);
    expect(await new SupabaseMailActionRepository(fake.supabase).setThreadReadState("thread", "support@anyhvac.net", true)).toBe(false);
    expect(fake.message.update).not.toHaveBeenCalled();
  });
});
