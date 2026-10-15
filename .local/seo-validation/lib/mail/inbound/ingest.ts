import {
  DuplicateMessageError,
  type InboundEmail,
  type InboundMailRepository,
} from "./types";
import { inboundMailFailureFromUnknown, type InboundMailStage } from "./diagnostics";
import { isSubjectFallbackAppropriate, normalizeSubject } from "./parsing";

export type IngestResult = { status: "created" | "duplicate"; messageId: string };

function participants(email: InboundEmail) {
  return [...new Set([email.fromAddress, ...email.toAddresses, ...email.ccAddresses, ...email.replyToAddresses])];
}

async function atStage<T>(stage: InboundMailStage, operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof DuplicateMessageError) throw error;
    throw inboundMailFailureFromUnknown(
      stage,
      "Inbound mail database operation failed.",
      error,
    );
  }
}

async function resolveThread(repository: InboundMailRepository, email: InboundEmail, normalized: string | null) {
  if (email.inReplyTo) {
    const inReplyTo = email.inReplyTo;
    const threadId = await atStage("supabase.resolve_thread", () =>
      repository.findThreadByInternetIds(email.mailbox, [inReplyTo]));
    if (threadId) return threadId;
  }

  if (email.referenceMessageIds.length) {
    const threadId = await atStage("supabase.resolve_thread", () =>
      repository.findThreadByInternetIds(
        email.mailbox,
        [...email.referenceMessageIds].reverse(),
      ));
    if (threadId) return threadId;
  }

  if (email.internetMessageId) {
    const internetMessageId = email.internetMessageId;
    const threadId = await atStage("supabase.resolve_thread", () =>
      repository.findThreadReferencingInternetId(email.mailbox, internetMessageId));
    if (threadId) return threadId;
  }

  if (normalized && isSubjectFallbackAppropriate(email.subject, email.inReplyTo, email.referenceMessageIds)) {
    return atStage("supabase.resolve_thread", () =>
      repository.findThreadBySubjectAndParticipants(email.mailbox, normalized, participants(email)));
  }

  return null;
}

async function finishIngestion(repository: InboundMailRepository, email: InboundEmail, message: { id: string; threadId: string }) {
  for (const attachment of email.attachments) {
    await atStage("supabase.insert_attachment", () =>
      repository.insertAttachment(message.id, attachment));
  }
  await atStage("supabase.update_thread", () =>
    repository.updateThreadLatestMessage(message.threadId, email.receivedAt));
}

export async function ingestInboundEmail(
  repository: InboundMailRepository,
  email: InboundEmail,
): Promise<IngestResult> {
  const existing = await atStage("supabase.find_duplicate_message", () =>
    repository.findDuplicate(email.providerMessageId, email.providerEventId));
  if (existing) {
    await finishIngestion(repository, email, existing);
    return { status: "duplicate", messageId: existing.id };
  }

  const normalized = normalizeSubject(email.subject);
  let threadId = await resolveThread(repository, email, normalized);
  let createdThreadId: string | null = null;
  if (!threadId) {
    threadId = await atStage("supabase.create_thread", () =>
      repository.createThread(email, normalized));
    createdThreadId = threadId;
  }

  try {
    const message = await atStage("supabase.insert_message", () =>
      repository.insertMessage(email, threadId));
    await finishIngestion(repository, email, message);
    return { status: "created", messageId: message.id };
  } catch (error) {
    if (error instanceof DuplicateMessageError) {
      if (createdThreadId) {
        await atStage("supabase.create_thread", () =>
          repository.deleteThreadIfEmpty(createdThreadId));
      }
      const duplicate = await atStage("supabase.find_duplicate_message", () =>
        repository.findDuplicate(email.providerMessageId, email.providerEventId));
      if (!duplicate) throw error;
      await finishIngestion(repository, email, duplicate);
      return { status: "duplicate", messageId: duplicate.id };
    }
    if (createdThreadId) {
      await atStage("supabase.create_thread", () =>
        repository.deleteThreadIfEmpty(createdThreadId));
    }
    throw error;
  }
}
