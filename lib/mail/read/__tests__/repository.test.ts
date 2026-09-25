import { readFile } from "node:fs/promises";
import path from "node:path";

import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import type { Database } from "@/types/supabase";

import {
  SupabaseMailReadRepository,
  buildThreadDetail,
  buildThreadSummaries,
} from "../repository";
import { parseMailboxFilter } from "../config";

vi.mock("server-only", () => ({}));

const threadA = { id: "thread-a", mailbox: "contact@anyhvac.net" as const, subject: "Older", latest_message_at: "2026-09-24T10:00:00.000Z" };
const threadB = { id: "thread-b", mailbox: "support@anyhvac.net" as const, subject: "Newest", latest_message_at: "2026-09-25T10:00:00.000Z" };
const baseMessage = {
  mailbox: "contact@anyhvac.net" as const,
  direction: "inbound" as const,
  from_address: "customer@example.com",
  from_name: "Customer",
  to_addresses: ["contact@anyhvac.net"],
  cc_addresses: [],
  subject: "Older",
  text_body: "First message",
  html_body: null,
  is_read: false,
  sent_at: null,
  created_at: "2026-09-24T09:00:00.000Z",
};

describe("mail read mapping", () => {
  it("normalizes mailbox filters and defaults unknown values to All Mail", () => {
    expect(parseMailboxFilter("support")).toBe("support");
    expect(parseMailboxFilter("sent")).toBe("sent");
    expect(parseMailboxFilter(["social", "contact"])).toBe("social");
    expect(parseMailboxFilter("unknown")).toBe("all");
  });

  it("aggregates mailboxes and sorts threads newest first", () => {
    const messages = [
      { ...baseMessage, id: "message-a", thread_id: "thread-a", received_at: "2026-09-24T09:00:00.000Z" },
      { ...baseMessage, id: "message-b", thread_id: "thread-b", mailbox: "support@anyhvac.net" as const, to_addresses: ["support@anyhvac.net"], subject: "Newest", received_at: "2026-09-25T10:00:00.000Z", is_read: true },
    ];
    const result = buildThreadSummaries([threadA, threadB], messages, []);
    expect(result.map((thread) => thread.id)).toEqual(["thread-b", "thread-a"]);
    expect(result.map((thread) => thread.mailbox)).toEqual(["support@anyhvac.net", "contact@anyhvac.net"]);
  });

  it("summarizes unread state, message counts, and attachment presence", () => {
    const messages = [
      { ...baseMessage, id: "message-1", thread_id: "thread-a", received_at: "2026-09-24T09:00:00.000Z" },
      { ...baseMessage, id: "message-2", thread_id: "thread-a", received_at: "2026-09-24T10:00:00.000Z", text_body: "Latest reply", is_read: true },
    ];
    const [result] = buildThreadSummaries([threadA], messages, [{ message_id: "message-1", filename: "quote.pdf", content_type: "application/pdf", size_bytes: 2048 }]);
    expect(result).toMatchObject({ preview: "Latest reply", unread: true, hasAttachments: true, messageCount: 2 });
  });

  it("orders a conversation newest-first and exposes metadata without HTML", () => {
    const messages = [
      { ...baseMessage, id: "message-2", thread_id: "thread-a", received_at: "2026-09-24T10:00:00.000Z", text_body: null, html_body: "<script>alert(1)</script>" },
      { ...baseMessage, id: "message-1", thread_id: "thread-a", received_at: "2026-09-24T09:00:00.000Z" },
    ];
    const result = buildThreadDetail(threadA, messages, [{ message_id: "message-2", filename: "photo.jpg", content_type: "image/jpeg", size_bytes: 1200 }]);
    expect(result.messages.map((message) => message.id)).toEqual(["message-2", "message-1"]);
    expect(result.messages[0]).toMatchObject({ displayTextBody: null, hasHiddenHtmlBody: true, attachments: [{ filename: "photo.jpg", contentType: "image/jpeg", sizeBytes: 1200 }] });
    expect(JSON.stringify(result)).not.toContain("<script>");
  });

  it("summarizes Sent by latest outbound activity while retaining the complete thread count", () => {
    const threadC = { id: "thread-c", mailbox: "mailtest@anyhvac.net" as const, subject: "Inbound only", latest_message_at: "2026-09-25T14:00:00.000Z" };
    const messages = [
      { ...baseMessage, id: "inbound", thread_id: "thread-a", received_at: "2026-09-25T12:00:00.000Z", text_body: "Newest inbound" },
      { ...baseMessage, id: "outbound", thread_id: "thread-a", direction: "outbound" as const, from_address: "contact@anyhvac.net", to_addresses: ["customer@example.com"], received_at: null, sent_at: "2026-09-25T11:00:00.000Z", text_body: "Latest sent reply" },
      { ...baseMessage, id: "support-sent", thread_id: "thread-b", mailbox: "support@anyhvac.net" as const, direction: "outbound" as const, from_address: "support@anyhvac.net", received_at: null, sent_at: "2026-09-25T13:00:00.000Z", text_body: "Support reply" },
      { ...baseMessage, id: "inbound-only", thread_id: "thread-c", mailbox: "mailtest@anyhvac.net" as const, received_at: "2026-09-25T14:00:00.000Z" },
    ];
    const result = buildThreadSummaries([threadA, threadB, threadC], messages, [], true);
    expect(result.map((thread) => thread.id)).toEqual(["thread-b", "thread-a"]);
    expect(result.map((thread) => thread.mailbox)).toEqual(["support@anyhvac.net", "contact@anyhvac.net"]);
    expect(result[1]).toMatchObject({ senderAddress: "contact@anyhvac.net", preview: "Latest sent reply", latestMessageAt: "2026-09-25T11:00:00.000Z", messageCount: 2 });
    const opened = buildThreadDetail(threadA, messages, []);
    expect(opened.messages.map((message) => message.id)).toEqual(["inbound", "outbound"]);
  });

  it("replaces Resend routing recipients with the friendly AnyHVAC mailbox", () => {
    const messages = [{
      ...baseMessage,
      id: "message-1",
      thread_id: "thread-a",
      received_at: "2026-09-24T09:00:00.000Z",
      to_addresses: [
        "anyhvac-contact@inbound.resend.app",
        "other-recipient@example.com",
        "contact@anyhvac.net",
      ],
    }];

    const result = buildThreadDetail(threadA, messages, []);

    expect(result.messages[0].toAddresses).toEqual([
      "contact@anyhvac.net",
      "other-recipient@example.com",
    ]);
    expect(JSON.stringify(result)).not.toContain("resend.app");
    expect(messages[0].to_addresses[0]).toBe("anyhvac-contact@inbound.resend.app");
  });

  it("derives a cleaned display body without changing the stored/raw body", () => {
    const raw = "Fresh reply\n\nOn Fri, Sep 25, 2026 at 10:30 AM AnyHVAC <contact@anyhvac.net> wrote:\n> Old content";
    const messages = [{ ...baseMessage, id: "message-1", thread_id: "thread-a", received_at: "2026-09-24T09:00:00.000Z", text_body: raw }];
    const result = buildThreadDetail(threadA, messages, []);
    expect(result.messages[0]).toMatchObject({ displayTextBody: "Fresh reply", quotedTextHidden: true });
    expect(messages[0].text_body).toBe(raw);
  });
});

describe("mail read query isolation", () => {
  function listClient() {
    const threadBuilder = { select: vi.fn(), eq: vi.fn(), in: vi.fn(), order: vi.fn().mockResolvedValue({ data: [], error: null }) };
    threadBuilder.select.mockReturnValue(threadBuilder); threadBuilder.eq.mockReturnValue(threadBuilder); threadBuilder.in.mockReturnValue(threadBuilder);
    return { client: { from: vi.fn().mockReturnValue(threadBuilder) } as unknown as SupabaseClient<Database>, threadBuilder };
  }

  it("filters a mailbox-specific list at the database boundary", async () => {
    const { client, threadBuilder } = listClient();
    await new SupabaseMailReadRepository(client).listThreads("contact");
    expect(threadBuilder.eq).toHaveBeenCalledWith("mailbox", "contact@anyhvac.net");
  });

  it("intentionally scopes All Mail to the four supported mailboxes", async () => {
    const { client, threadBuilder } = listClient();
    await new SupabaseMailReadRepository(client).listThreads("all");
    expect(threadBuilder.in).toHaveBeenCalledWith("mailbox", ["contact@anyhvac.net", "support@anyhvac.net", "social@anyhvac.net", "mailtest@anyhvac.net"]);
  });

  it("builds Sent from outbound direction across all supported mailboxes", async () => {
    const outbound = { select: vi.fn(), eq: vi.fn(), in: vi.fn() };
    outbound.select.mockReturnValue(outbound); outbound.eq.mockReturnValue(outbound);
    outbound.in.mockResolvedValue({ data: [{ thread_id: "thread-a" }], error: null });
    const threads = { select: vi.fn(), in: vi.fn(), order: vi.fn() };
    threads.select.mockReturnValue(threads); threads.in.mockReturnValue(threads);
    threads.order.mockResolvedValue({ data: [threadA], error: null });
    const sentMessage = { ...baseMessage, id: "sent", thread_id: "thread-a", direction: "outbound" as const, from_address: "contact@anyhvac.net", received_at: null, sent_at: "2026-09-25T10:00:00.000Z" };
    const messages = { select: vi.fn(), in: vi.fn() };
    messages.select.mockReturnValue(messages);
    messages.in.mockReturnValueOnce(messages).mockResolvedValueOnce({ data: [sentMessage], error: null });
    const attachments = { select: vi.fn(), in: vi.fn().mockResolvedValue({ data: [], error: null }) };
    attachments.select.mockReturnValue(attachments);
    const client = { from: vi.fn()
      .mockReturnValueOnce(outbound)
      .mockReturnValueOnce(threads)
      .mockReturnValueOnce(messages)
      .mockReturnValueOnce(attachments) } as unknown as SupabaseClient<Database>;

    const result = await new SupabaseMailReadRepository(client).listThreads("sent");

    expect(outbound.eq).toHaveBeenCalledWith("direction", "outbound");
    expect(outbound.in).toHaveBeenCalledWith("mailbox", ["contact@anyhvac.net", "support@anyhvac.net", "social@anyhvac.net", "mailtest@anyhvac.net"]);
    expect(threads.in).toHaveBeenCalledWith("mailbox", ["contact@anyhvac.net", "support@anyhvac.net", "social@anyhvac.net", "mailtest@anyhvac.net"]);
    expect(result[0]).toMatchObject({ id: "thread-a", mailbox: "contact@anyhvac.net", senderAddress: "contact@anyhvac.net" });
  });

  it("keeps a selected thread and its messages inside the requested mailbox", async () => {
    const threadBuilder = { select: vi.fn(), eq: vi.fn(), in: vi.fn(), maybeSingle: vi.fn().mockResolvedValue({ data: threadA, error: null }) };
    threadBuilder.select.mockReturnValue(threadBuilder); threadBuilder.eq.mockReturnValue(threadBuilder); threadBuilder.in.mockReturnValue(threadBuilder);
    const messageBuilder = { select: vi.fn(), eq: vi.fn() };
    messageBuilder.select.mockReturnValue(messageBuilder);
    messageBuilder.eq.mockReturnValueOnce(messageBuilder).mockResolvedValueOnce({ data: [], error: null });
    const client = { from: vi.fn().mockReturnValueOnce(threadBuilder).mockReturnValueOnce(messageBuilder) } as unknown as SupabaseClient<Database>;

    await new SupabaseMailReadRepository(client).getThread("thread-a", "contact");

    expect(threadBuilder.eq).toHaveBeenCalledWith("mailbox", "contact@anyhvac.net");
    expect(messageBuilder.eq).toHaveBeenCalledWith("mailbox", "contact@anyhvac.net");
  });

  it("is marked server-only and never references public credentials", async () => {
    const source = await readFile(path.resolve(process.cwd(), "lib/mail/read/repository.ts"), "utf8");
    expect(source).toMatch(/^import ["']server-only["'];/);
    expect(source).not.toContain("NEXT_PUBLIC_");
    expect(source).not.toMatch(/\.update\(|\.insert\(|\.delete\(/);
  });
});
