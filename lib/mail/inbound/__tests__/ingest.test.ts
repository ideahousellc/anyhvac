import { describe, expect, it } from "vitest";

import { ingestInboundEmail } from "../ingest";
import {
  DuplicateMessageError,
  type InboundEmail,
  type InboundMailRepository,
  type Mailbox,
  type StoredMessage,
} from "../types";

function email(overrides: Partial<InboundEmail> = {}): InboundEmail {
  return {
    providerMessageId: "email-1",
    providerEventId: "event-1",
    mailbox: "mailtest@anyhvac.net",
    internetMessageId: "<message-1@example.com>",
    inReplyTo: null,
    referenceMessageIds: [],
    fromAddress: "customer@example.com",
    fromName: null,
    toAddresses: ["mailtest@anyhvac.net"],
    ccAddresses: [],
    replyToAddresses: [],
    subject: "Need service",
    textBody: null,
    htmlBody: null,
    receivedAt: "2026-09-23T12:00:00.000Z",
    attachments: [],
    ...overrides,
  };
}

class FakeRepository implements InboundMailRepository {
  duplicate: StoredMessage | null = null;
  internetThreads = new Map<string, string>();
  reverseThread: string | null = null;
  subjectThread: string | null = null;
  insertedAttachments: Array<InboundEmail["attachments"][number]> = [];
  createdThreads = 0;
  insertedMessages = 0;
  insertedThreadIds: string[] = [];
  deletedThreads: string[] = [];
  lookupMailboxes: Mailbox[] = [];
  internetLookupIds: string[][] = [];
  duplicateLookups: Array<{ providerMessageId: string; providerEventId: string }> = [];
  updatedThreads: Array<{ threadId: string; receivedAt: string }> = [];
  throwDuplicateOnInsert = false;
  throwDatabaseFailure = false;

  async findDuplicate(providerMessageId: string, providerEventId: string) {
    this.duplicateLookups.push({ providerMessageId, providerEventId });
    return this.duplicate;
  }
  async findThreadByInternetIds(mailbox: Mailbox, ids: string[]) {
    this.lookupMailboxes.push(mailbox);
    this.internetLookupIds.push(ids);
    for (const id of ids) if (this.internetThreads.has(id)) return this.internetThreads.get(id)!;
    return null;
  }
  async findThreadReferencingInternetId(mailbox: Mailbox) {
    this.lookupMailboxes.push(mailbox);
    return this.reverseThread;
  }
  async findThreadBySubjectAndParticipants(mailbox: Mailbox) {
    this.lookupMailboxes.push(mailbox);
    return this.subjectThread;
  }
  async createThread() {
    if (this.throwDatabaseFailure) throw new Error("database unavailable");
    this.createdThreads += 1;
    return `thread-${this.createdThreads}`;
  }
  async deleteThreadIfEmpty(id: string) { this.deletedThreads.push(id); }
  async insertMessage(_email: InboundEmail, threadId: string) {
    this.insertedMessages += 1;
    this.insertedThreadIds.push(threadId);
    if (this.throwDuplicateOnInsert) {
      this.duplicate = { id: "existing-message", threadId: "existing-thread" };
      throw new DuplicateMessageError();
    }
    return { id: "message-new", threadId };
  }
  async insertAttachment(_messageId: string, attachment: InboundEmail["attachments"][number]) {
    this.insertedAttachments.push(attachment);
  }
  async updateThreadLatestMessage(threadId: string, receivedAt: string) {
    this.updatedThreads.push({ threadId, receivedAt });
  }
}

describe("inbound email ingestion", () => {
  it("creates a new thread for an unrelated message with missing optional fields", async () => {
    const repository = new FakeRepository();
    const result = await ingestInboundEmail(repository, email());
    expect(result.status).toBe("created");
    expect(repository.createdThreads).toBe(1);
    expect(repository.insertedMessages).toBe(1);
  });

  it("joins a thread using In-Reply-To before References", async () => {
    const repository = new FakeRepository();
    repository.internetThreads.set("<parent@example.com>", "parent-thread");
    repository.internetThreads.set("<reference@example.com>", "reference-thread");
    const result = await ingestInboundEmail(repository, email({
      inReplyTo: "<parent@example.com>",
      referenceMessageIds: ["<reference@example.com>"],
    }));
    expect(result.status).toBe("created");
    expect(repository.createdThreads).toBe(0);
    expect(repository.internetLookupIds).toEqual([["<parent@example.com>"]]);
    expect(repository.insertedThreadIds).toEqual(["parent-thread"]);
  });

  it("uses References from newest to oldest", async () => {
    const repository = new FakeRepository();
    repository.internetThreads.set("<newer@example.com>", "reference-thread");
    await ingestInboundEmail(repository, email({ referenceMessageIds: ["<older@example.com>", "<newer@example.com>"] }));
    expect(repository.createdThreads).toBe(0);
    expect(repository.internetLookupIds).toEqual([["<newer@example.com>", "<older@example.com>"]]);
    expect(repository.insertedThreadIds).toEqual(["reference-thread"]);
  });

  it("joins a thread that already references the arriving Message-ID", async () => {
    const repository = new FakeRepository();
    repository.reverseThread = "reverse-thread";
    await ingestInboundEmail(repository, email({ internetMessageId: "<arriving@example.com>" }));
    expect(repository.createdThreads).toBe(0);
    expect(repository.insertedThreadIds).toEqual(["reverse-thread"]);
  });

  it("uses a participant-controlled normalized-subject fallback only for replies", async () => {
    const repository = new FakeRepository();
    repository.subjectThread = "subject-thread";
    await ingestInboundEmail(repository, email({ subject: "Re:  NEED   service" }));
    expect(repository.createdThreads).toBe(0);

    const unrelatedRepository = new FakeRepository();
    unrelatedRepository.subjectThread = "wrong-thread";
    await ingestInboundEmail(unrelatedRepository, email({ subject: "Need service" }));
    expect(unrelatedRepository.createdThreads).toBe(1);
  });

  it("keeps every threading lookup within the inbound mailbox", async () => {
    const repository = new FakeRepository();
    await ingestInboundEmail(repository, email({
      mailbox: "support@anyhvac.net",
      inReplyTo: "<unknown@example.com>",
      referenceMessageIds: ["<also-unknown@example.com>"],
      subject: "Re: Need service",
    }));
    expect(repository.lookupMailboxes).toEqual([
      "support@anyhvac.net",
      "support@anyhvac.net",
      "support@anyhvac.net",
      "support@anyhvac.net",
    ]);
  });

  it("replays an existing message without creating rows and resumes idempotent finishing work", async () => {
    const repository = new FakeRepository();
    repository.duplicate = { id: "existing-message", threadId: "existing-thread" };
    const result = await ingestInboundEmail(repository, email({ attachments: [{
      providerAttachmentId: "attachment-1",
      filename: "manual.pdf",
      contentType: "application/pdf",
      contentDisposition: "attachment",
      contentId: null,
      sizeBytes: 42,
    }] }));
    expect(result.status).toBe("duplicate");
    expect(repository.insertedAttachments).toEqual([{
      providerAttachmentId: "attachment-1",
      filename: "manual.pdf",
      contentType: "application/pdf",
      contentDisposition: "attachment",
      contentId: null,
      sizeBytes: 42,
    }]);
    expect(repository.insertedMessages).toBe(0);
    expect(repository.createdThreads).toBe(0);
    expect(repository.duplicateLookups).toEqual([{
      providerMessageId: "email-1",
      providerEventId: "event-1",
    }]);
    expect(repository.updatedThreads).toEqual([{
      threadId: "existing-thread",
      receivedAt: "2026-09-23T12:00:00.000Z",
    }]);
  });

  it("recovers from a concurrent unique-index conflict", async () => {
    const repository = new FakeRepository();
    repository.throwDuplicateOnInsert = true;
    const result = await ingestInboundEmail(repository, email());
    expect(result).toEqual({ status: "duplicate", messageId: "existing-message" });
    expect(repository.deletedThreads).toEqual(["thread-1"]);
  });

  it("classifies database failures without propagating their raw message", async () => {
    const repository = new FakeRepository();
    repository.throwDatabaseFailure = true;
    await expect(ingestInboundEmail(repository, email())).rejects.toMatchObject({
      stage: "supabase.create_thread",
      errorName: "Error",
      message: "Inbound mail database operation failed.",
    });
  });
});
