import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";
import type { Database } from "@/types/supabase";
import { SupabaseOutboundMailRepository } from "../repository";

vi.mock("server-only", () => ({}));

describe("outbound reply context", () => {
  it("selects the newest inbound message independently of conversation display order", async () => {
    const thread = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn() };
    thread.select.mockReturnValue(thread); thread.eq.mockReturnValue(thread);
    thread.maybeSingle.mockResolvedValue({ data: { id: "thread", mailbox: "contact@anyhvac.net", subject: "Service" }, error: null });
    const messages = { select: vi.fn(), eq: vi.fn() };
    messages.select.mockReturnValue(messages);
    messages.eq.mockReturnValueOnce(messages).mockResolvedValueOnce({ data: [{
      direction: "inbound", from_address: "older@example.com", reply_to_addresses: [], internet_message_id: "<older@example.com>", reference_message_ids: [], received_at: "2026-09-24T10:00:00.000Z", sent_at: null, created_at: "2026-09-24T10:00:00.000Z",
    }, {
      direction: "outbound", from_address: "contact@anyhvac.net", reply_to_addresses: ["contact@anyhvac.net"], internet_message_id: "<sent@example.com>", reference_message_ids: [], received_at: null, sent_at: "2026-09-26T10:00:00.000Z", created_at: "2026-09-26T10:00:00.000Z",
    }, {
      direction: "inbound", from_address: "newest@example.com", reply_to_addresses: ["reply@example.com"], internet_message_id: "<newest@example.com>", reference_message_ids: ["<root@example.com>"], received_at: "2026-09-25T10:00:00.000Z", sent_at: null, created_at: "2026-09-25T10:00:00.000Z",
    }], error: null });
    const client = { from: vi.fn().mockReturnValueOnce(thread).mockReturnValueOnce(messages) } as unknown as SupabaseClient<Database>;

    const result = await new SupabaseOutboundMailRepository(client).getReplyContext("thread", "contact@anyhvac.net");

    expect(result).toMatchObject({
      recipient: "reply@example.com",
      inReplyTo: "<newest@example.com>",
      references: ["<root@example.com>", "<newest@example.com>"],
    });
  });
});
