import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import type { Database } from "@/types/supabase";

import { InboundMailFailure } from "../diagnostics";
import { SupabaseInboundMailRepository } from "../repository";

vi.mock("server-only", () => ({}));

function duplicateLookupClient(results: Array<Record<string, unknown>>) {
  const maybeSingle = vi.fn();
  for (const result of results) maybeSingle.mockResolvedValueOnce(result);

  const builder = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle,
  };
  builder.select.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);

  return {
    client: { from: vi.fn().mockReturnValue(builder) } as unknown as SupabaseClient<Database>,
    maybeSingle,
  };
}

function subjectLookupClient(fromAddress: string) {
  const threadBuilder = {
    select: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn().mockResolvedValue({ data: [{ id: "candidate-thread" }], error: null }),
  };
  threadBuilder.select.mockReturnValue(threadBuilder);
  threadBuilder.eq.mockReturnValue(threadBuilder);
  threadBuilder.order.mockReturnValue(threadBuilder);

  const messageBuilder = {
    select: vi.fn(),
    in: vi.fn(),
    eq: vi.fn().mockResolvedValue({
      data: [{
        thread_id: "candidate-thread",
        from_address: fromAddress,
        to_addresses: ["mailtest@anyhvac.net"],
        cc_addresses: [],
        reply_to_addresses: [],
      }],
      error: null,
    }),
  };
  messageBuilder.select.mockReturnValue(messageBuilder);
  messageBuilder.in.mockReturnValue(messageBuilder);

  const from = vi.fn()
    .mockReturnValueOnce(threadBuilder)
    .mockReturnValueOnce(messageBuilder);
  return {
    client: { from } as unknown as SupabaseClient<Database>,
    threadBuilder,
    messageBuilder,
  };
}

describe("Supabase inbound mail diagnostics", () => {
  it("returns a provider-message duplicate without querying the provider event", async () => {
    const { client, maybeSingle } = duplicateLookupClient([{
      data: { id: "stored-message", thread_id: "stored-thread" },
      error: null,
    }]);
    const repository = new SupabaseInboundMailRepository(client);

    await expect(repository.findDuplicate("message-id", "event-id")).resolves.toEqual({
      id: "stored-message",
      threadId: "stored-thread",
    });
    expect(maybeSingle).toHaveBeenCalledTimes(1);
  });

  it("returns a provider-event duplicate when the provider message is not found", async () => {
    const { client, maybeSingle } = duplicateLookupClient([
      { data: null, error: null },
      { data: { id: "stored-message", thread_id: "stored-thread" }, error: null },
    ]);
    const repository = new SupabaseInboundMailRepository(client);

    await expect(repository.findDuplicate("message-id", "event-id")).resolves.toEqual({
      id: "stored-message",
      threadId: "stored-thread",
    });
    expect(maybeSingle).toHaveBeenCalledTimes(2);
  });

  it("classifies the provider-message duplicate lookup and retains only its safe database code", async () => {
    const { client } = duplicateLookupClient([{
      data: null,
      error: {
        code: "42501",
        message: "sensitive database detail sender@example.com",
      },
    }]);
    const repository = new SupabaseInboundMailRepository(client);

    const error = await repository.findDuplicate("sensitive-message-id", "sensitive-event-id")
      .catch((failure: unknown) => failure);

    expect(error).toBeInstanceOf(InboundMailFailure);
    expect(error).toMatchObject({
      stage: "supabase.find_duplicate_message",
      errorName: "PostgrestError",
      errorCode: "42501",
      message: "Inbound mail database operation failed.",
    });
    expect(JSON.stringify(error)).not.toContain("sender@example.com");
  });

  it("distinguishes the provider-event duplicate lookup", async () => {
    const { client } = duplicateLookupClient([
      { data: null, error: null },
      { data: null, error: { code: "PGRST204", message: "sensitive schema detail" } },
    ]);
    const repository = new SupabaseInboundMailRepository(client);

    await expect(repository.findDuplicate("message-id", "event-id")).rejects.toMatchObject({
      stage: "supabase.find_duplicate_event",
      errorName: "PostgrestError",
      errorCode: "PGRST204",
    });
  });

  it("scopes internet Message-ID thread resolution to the requested mailbox", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const builder = {
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      limit: vi.fn(),
      maybeSingle,
    };
    builder.select.mockReturnValue(builder);
    builder.eq.mockReturnValue(builder);
    builder.order.mockReturnValue(builder);
    builder.limit.mockReturnValue(builder);
    const client = { from: vi.fn().mockReturnValue(builder) } as unknown as SupabaseClient<Database>;
    const repository = new SupabaseInboundMailRepository(client);

    await expect(repository.findThreadByInternetIds(
      "contact@anyhvac.net",
      ["<message@example.com>"],
    )).resolves.toBeNull();

    expect(builder.eq).toHaveBeenCalledWith("mailbox", "contact@anyhvac.net");
    expect(builder.eq).not.toHaveBeenCalledWith("mailbox", "mailtest@anyhvac.net");
  });

  it("requires participant overlap for normalized-subject fallback within the mailbox", async () => {
    const matching = subjectLookupClient("customer@example.com");
    const matchingRepository = new SupabaseInboundMailRepository(matching.client);
    await expect(matchingRepository.findThreadBySubjectAndParticipants(
      "contact@anyhvac.net",
      "need service",
      ["customer@example.com", "contact@anyhvac.net"],
    )).resolves.toBe("candidate-thread");
    expect(matching.threadBuilder.eq).toHaveBeenCalledWith("mailbox", "contact@anyhvac.net");
    expect(matching.messageBuilder.eq).toHaveBeenCalledWith("mailbox", "contact@anyhvac.net");

    const nonmatching = subjectLookupClient("unrelated@example.com");
    const nonmatchingRepository = new SupabaseInboundMailRepository(nonmatching.client);
    await expect(nonmatchingRepository.findThreadBySubjectAndParticipants(
      "contact@anyhvac.net",
      "need service",
      ["customer@example.com", "contact@anyhvac.net"],
    )).resolves.toBeNull();
  });

  it("treats an attachment unique conflict as an idempotent retry", async () => {
    const insert = vi.fn().mockResolvedValue({ data: null, error: { code: "23505" } });
    const client = { from: vi.fn().mockReturnValue({ insert }) } as unknown as SupabaseClient<Database>;
    const repository = new SupabaseInboundMailRepository(client);

    await expect(repository.insertAttachment("stored-message", {
      providerAttachmentId: "attachment-id",
      filename: "manual.pdf",
      contentType: "application/pdf",
      contentDisposition: "attachment",
      contentId: null,
      sizeBytes: 42,
    })).resolves.toBeUndefined();
    expect(insert).toHaveBeenCalledWith({
      message_id: "stored-message",
      provider: "resend",
      provider_attachment_id: "attachment-id",
      filename: "manual.pdf",
      content_type: "application/pdf",
      content_disposition: "attachment",
      content_id: null,
      size_bytes: 42,
    });
  });

  it("updates latest_message_at only when the incoming timestamp is newer", async () => {
    const builder = {
      update: vi.fn(),
      eq: vi.fn(),
      lt: vi.fn().mockResolvedValue({ data: null, error: null }),
    };
    builder.update.mockReturnValue(builder);
    builder.eq.mockReturnValue(builder);
    const client = { from: vi.fn().mockReturnValue(builder) } as unknown as SupabaseClient<Database>;
    const repository = new SupabaseInboundMailRepository(client);
    const receivedAt = "2026-09-24T12:00:00.000Z";

    await repository.updateThreadLatestMessage("stored-thread", receivedAt);

    expect(builder.update).toHaveBeenCalledWith({ latest_message_at: receivedAt });
    expect(builder.eq).toHaveBeenCalledWith("id", "stored-thread");
    expect(builder.lt).toHaveBeenCalledWith("latest_message_at", receivedAt);
  });
});
