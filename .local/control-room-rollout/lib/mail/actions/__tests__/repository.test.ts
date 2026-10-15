import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { Database } from "@/types/supabase";
import { SupabaseMailActionRepository } from "../repository";

vi.mock("server-only", () => ({}));

function client(threadExists = true) {
  const thread = { select: vi.fn(), update: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(), error: null };
  thread.select.mockReturnValue(thread); thread.update.mockReturnValue(thread); thread.eq.mockReturnValue(thread);
  thread.maybeSingle.mockResolvedValue({ data: threadExists ? { id: "thread", trashed_at: null } : null, error: null });
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

  it("soft-deletes and restores only the exact thread/mailbox pair", async () => {
    const trashed = client();
    expect(await new SupabaseMailActionRepository(trashed.supabase).setThreadTrashState("thread", "social@anyhvac.net", true)).toBe(true);
    expect(trashed.thread.update).toHaveBeenCalledWith({ trashed_at: expect.any(String) });
    expect(trashed.thread.eq).toHaveBeenCalledWith("id", "thread");
    expect(trashed.thread.eq).toHaveBeenCalledWith("mailbox", "social@anyhvac.net");

    const restored = client();
    restored.thread.maybeSingle.mockResolvedValue({ data: { id: "thread", trashed_at: "2026-09-28T12:00:00.000Z" }, error: null });
    expect(await new SupabaseMailActionRepository(restored.supabase).setThreadTrashState("thread", "social@anyhvac.net", false)).toBe(true);
    expect(restored.thread.update).toHaveBeenCalledWith({ trashed_at: null });
  });

  it("makes repeated trash and restore operations harmless", async () => {
    const alreadyTrashed = client();
    alreadyTrashed.thread.maybeSingle.mockResolvedValue({ data: { id: "thread", trashed_at: "2026-09-28T12:00:00.000Z" }, error: null });
    expect(await new SupabaseMailActionRepository(alreadyTrashed.supabase).setThreadTrashState("thread", "contact@anyhvac.net", true)).toBe(true);
    expect(alreadyTrashed.thread.update).not.toHaveBeenCalled();

    const alreadyRestored = client();
    expect(await new SupabaseMailActionRepository(alreadyRestored.supabase).setThreadTrashState("thread", "contact@anyhvac.net", false)).toBe(true);
    expect(alreadyRestored.thread.update).not.toHaveBeenCalled();
  });
});
